import { BetStatusService, MarbleEventWithBetConfig } from "../../../../src/features/bet-status/bet-status-service";
import { EventDetailNotification, EventNotification, OddsFeedEventName } from "odds-feed-client";
import { MarbleEvent } from "../../../../src/features/shared-types";

jest.mock("../../../../src/helpers/eventid", () => ({
    extractGameId: jest.fn(() => 7),
}));

describe("BetStatusService", () => {
    let service: BetStatusService & any;
    let oddsFeedEventSource: {
        eventOn: jest.Mock;
        eventOff: jest.Mock;
        eventDetailOn: jest.Mock;
        eventDetailOff: jest.Mock;
    };
    let gameStatusPublisher: {
        publishStartPlacingBetStatus: jest.Mock;
        publishEndPlacingBetStatus: jest.Mock;
        publishOdds: jest.Mock;
        publishBetChoicePoints: jest.Mock;
        publishCurrentIndex: jest.Mock;
    };
    let delayHandlingService: { getDelayedTime: jest.Mock };
    let scheduler: { schedule: jest.Mock };
    let hedgeBetService: { resetHedgeBetRestriction: jest.Mock; updateHedgeBetGroups: jest.Mock };
    let gameData: { roundId: number; playerBetCount: Record<string, unknown> };

    beforeEach(() => {
        oddsFeedEventSource = {
            eventOn: jest.fn(),
            eventOff: jest.fn(),
            eventDetailOn: jest.fn(),
            eventDetailOff: jest.fn(),
        };
        gameStatusPublisher = {
            publishStartPlacingBetStatus: jest.fn(),
            publishEndPlacingBetStatus: jest.fn(),
            publishOdds: jest.fn(),
            publishBetChoicePoints: jest.fn(),
            publishCurrentIndex: jest.fn(),
        };
        delayHandlingService = {
            getDelayedTime: jest.fn(({ time }: { time: Date }) => time),
        };
        scheduler = {
            schedule: jest.fn(),
        };
        hedgeBetService = {
            resetHedgeBetRestriction: jest.fn(),
            updateHedgeBetGroups: jest.fn(),
        };
        gameData = { roundId: 12345, playerBetCount: {} };

        service = new BetStatusService({
            oddsFeedEventSource,
            gameStatusPublisher,
            delayHandlingService,
            scheduler,
            hedgeBetService,
            gameData,
        } as any) as any;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("initEvent/dispose", () => {
        it("should register and unregister all listeners", () => {
            service.initEvent();

            expect(oddsFeedEventSource.eventOn).toHaveBeenCalledWith(OddsFeedEventName.EventStart, expect.any(Function));
            expect(oddsFeedEventSource.eventDetailOn).toHaveBeenCalledWith(OddsFeedEventName.EventDetailOddsAvailable, expect.any(Function));
            expect(oddsFeedEventSource.eventDetailOn).toHaveBeenCalledWith(OddsFeedEventName.EventDetailUpComing, expect.any(Function));

            service.dispose();

            expect(oddsFeedEventSource.eventOff).toHaveBeenCalledWith(OddsFeedEventName.EventStart, expect.any(Function));
            expect(oddsFeedEventSource.eventDetailOff).toHaveBeenCalledWith(OddsFeedEventName.EventDetailOddsAvailable, expect.any(Function));
            expect(oddsFeedEventSource.eventDetailOff).toHaveBeenCalledWith(OddsFeedEventName.EventDetailUpComing, expect.any(Function));
        });
    });

    describe("handleEventStart", () => {
        it("should set state and schedule initial place bet", () => {
            const scheduleStart = Date.parse("2025-01-01T00:00:00Z");
            const now = new Date(scheduleStart);
            const event = {
                eventID: 999,
                scheduleStartTs: scheduleStart,
                eventDetails: [{ oddsAvailableTs: scheduleStart }],
                config: {
                    bet: {
                        delayPlaceBetMs: 500,
                    },
                },
                now,
            } as unknown as MarbleEventWithBetConfig;
            const expected = new Date(scheduleStart + 500 + 100);
            delayHandlingService.getDelayedTime.mockImplementation(({ time }: { time: Date }) => new Date(time.getTime() + 100));

            service.handleEventStart({ event } as EventNotification<MarbleEvent>);

            expect(service.betStatusByGameId["7"]).toBe(false);
            expect(service.currentRoundId).toBe(999);
            expect(scheduler.schedule).toHaveBeenCalledWith(expected, expect.any(Function), {
                overrideNow: now,
                ignorePast: true,
            });
        });
    });

    describe("handleEventDetailOddAvailable", () => {
        it("should not schedule when index is 0", () => {
            const event = { eventID: 1, eventDetails: [] } as unknown as MarbleEvent;

            service.handleEventDetailOddAvailable({ event, index: 0 } as EventDetailNotification<MarbleEvent>);

            expect(scheduler.schedule).not.toHaveBeenCalled();
        });

        it("should schedule when index > 0", () => {
            const base = Date.parse("2025-01-01T00:05:00Z");
            const now = new Date(base);
            const event = {
                eventID: 1,
                eventDetails: [{}, { oddsAvailableTs: base + 2000 }, { oddsAvailableTs: base + 4000 }],
                config: {
                    bet: {
                        delayPlaceBetMs: 250,
                    },
                },
                now,
            } as unknown as MarbleEventWithBetConfig;
            const expected = new Date(base + 4000 + 250 + 50);
            delayHandlingService.getDelayedTime.mockImplementation(({ time }: { time: Date }) => new Date(time.getTime() + 50));

            service.handleEventDetailOddAvailable({ event, index: 2 } as EventDetailNotification<MarbleEvent>);

            expect(scheduler.schedule).toHaveBeenCalledWith(expected, expect.any(Function), {
                overrideNow: now,
                ignorePast: true,
            });
        });
    });

    describe("odd/point/group extraction edge cases", () => {
        it("should return empty odds when event detail missing", () => {
            const odds = (service as any).getOddFromEventDetail({ event: { eventDetails: [] }, index: 1 });

            expect(odds).toEqual({});
        });

        it("should default odds to zero when price missing", () => {
            const event = { eventDetails: [{ markets: [{ selections: [{ betChoice: "home" }] }] }] } as unknown as MarbleEvent;
            const odds = (service as any).getOddFromEventDetail({ event, index: 0 });

            expect(odds).toEqual({ home: 0 });
        });

        it("should return empty points when event detail missing", () => {
            const points = (service as any).getPointFromEventDetail({ event: { eventDetails: [] }, index: 2 });

            expect(points).toEqual({});
        });

        it("should default points to zero when value missing", () => {
            const event = { eventDetails: [{ markets: [{ selections: [{ betChoice: "away" }] }] }] } as unknown as MarbleEvent;
            const points = (service as any).getPointFromEventDetail({ event, index: 0 });

            expect(points).toEqual({ away: 0 });
        });

        it("should return empty hedge bet groups when event detail missing", () => {
            const groups = (service as any).getHedgeBetGroups({ event: { eventDetails: [] }, index: 0 });

            expect(groups).toEqual([]);
        });
    });

    describe("handleEventDetailUpcoming", () => {
        it("should schedule lock bet with ignorePast option when index > 0", () => {
            const lockTime = Date.parse("2025-01-01T00:10:00Z");
            const now = new Date(lockTime);
            const event = {
                eventID: 2,
                eventDetails: [{}, { scheduleStartTs: lockTime }],
                config: {
                    bet: {
                        soonLockBetMs: 1000,
                    },
                },
                now,
            } as unknown as MarbleEventWithBetConfig;
            delayHandlingService.getDelayedTime.mockImplementation(({ time }: { time: Date }) => new Date(time.getTime() + 25));

            service.handleEventDetailUpcoming({ event, index: 1 } as EventDetailNotification<MarbleEvent>);

            expect(scheduler.schedule).toHaveBeenCalled();
            const [time, handler, options] = (scheduler.schedule as jest.Mock).mock.calls[0];
            expect(time.getTime()).toBe(lockTime - 1000 + 25);
            expect(typeof handler).toBe("function");
            expect(options).toEqual({ ignorePast: true, overrideNow: now });
        });
    });

    describe("getTimeToPlaceBet", () => {
        it("should compute place bet time using delay handling service for event start", () => {
            const base = Date.parse("2025-01-01T00:00:00Z");
            const event = {
                eventID: 7,
                scheduleStartTs: base,
                eventDetails: [{ oddsAvailableTs: base }],
                config: {
                    bet: {
                        delayPlaceBetMs: 500,
                    },
                },
            } as unknown as MarbleEventWithBetConfig;
            delayHandlingService.getDelayedTime.mockImplementation(({ time }: { time: Date }) => new Date(time.getTime() + 123));

            const result = service.getTimeToPlaceBet({ event, index: 0 } as EventDetailNotification<MarbleEvent>);

            expect(delayHandlingService.getDelayedTime).toHaveBeenCalledWith({ event, time: new Date(base + 500) }, { oddFeedEventType: OddsFeedEventName.EventStart });
            expect(result.getTime()).toBe(base + 500 + 123);
        });

        it("should compute place bet time using detail odds available timestamp", () => {
            const base = Date.parse("2025-01-01T00:05:00Z");
            const event = {
                eventID: 7,
                scheduleStartTs: base,
                eventDetails: [{ oddsAvailableTs: base }, { oddsAvailableTs: base + 3000 }],
                config: {
                    bet: {
                        delayPlaceBetMs: 0,
                    },
                },
            } as unknown as MarbleEventWithBetConfig;
            delayHandlingService.getDelayedTime.mockImplementation(({ time }: { time: Date }) => new Date(time.getTime() + 50));

            const result = service.getTimeToPlaceBet({ event, index: 1 } as EventDetailNotification<MarbleEvent>);

            expect(delayHandlingService.getDelayedTime).toHaveBeenCalledWith({ event, time: new Date(base + 3000) }, { oddFeedEventType: OddsFeedEventName.EventDetailOddsAvailable });
            expect(result.getTime()).toBe(base + 3000 + 50);
        });
    });

    describe("getTimeToLockBet", () => {
        it("should compute lock bet time using delay handling service", () => {
            const lockBase = Date.parse("2025-01-01T00:15:00Z");
            const event = {
                eventID: 7,
                eventDetails: [{ scheduleStartTs: lockBase }],
                config: {
                    bet: {
                        soonLockBetMs: 2000,
                    },
                },
            } as unknown as MarbleEventWithBetConfig;
            delayHandlingService.getDelayedTime.mockImplementation(({ time }: { time: Date }) => new Date(time.getTime() + 75));

            const result = service.getTimeToLockBet({ event, index: 0 } as EventDetailNotification<MarbleEvent>);

            expect(delayHandlingService.getDelayedTime).toHaveBeenCalledWith({ event, time: new Date(lockBase - 2000) }, { oddFeedEventType: OddsFeedEventName.EventDetailStart });
            expect(result.getTime()).toBe(lockBase - 2000 + 75);
        });
    });

    describe("publishBetChoiceLocked", () => {
        it("should update status and publish end placing bet", () => {
            service.betStatusByGameId["7"] = true;

            service.publishBetChoiceLocked({ event: { eventID: 7 } as MarbleEvent, index: 1 } as unknown as EventDetailNotification<MarbleEvent>);

            expect(service.betStatusByGameId["7"]).toBe(false);
            expect(gameStatusPublisher.publishEndPlacingBetStatus).toHaveBeenCalled();
        });
    });

    describe("handleBetChoiceReady", () => {
        it("should populate betting data and publish updates", () => {
            const event = {
                eventID: 7,
                eventDetails: [
                    {},
                    {
                        markets: [
                            { selections: [{ betChoice: "home", price: 2, point: 1 }], hedgeBetExclusion: [] },
                            { selections: [{ betChoice: "away", price: 3, point: 2 }] },
                        ],
                    },
                ],
            } as unknown as MarbleEvent;

            service.handleBetChoiceReady({ event, index: 1 } as unknown as EventDetailNotification<MarbleEvent>);

            expect(service.betEventDetailIndexByGameId["7"]).toBe(1);
            expect(service.betStatusByGameId["7"]).toBe(true);
            expect(service.currentOddIndexByGameId["7"]).toBe(1);
            expect(service.dynamicOddsByGameId["7"]).toEqual({ home: 2, away: 3 });
            expect(service.betChoicePointsByGameId["7"]).toEqual({ home: 1, away: 2 });
            expect(hedgeBetService.resetHedgeBetRestriction).toHaveBeenCalledWith("7");
            expect(hedgeBetService.updateHedgeBetGroups).toHaveBeenCalled();
            expect(gameStatusPublisher.publishStartPlacingBetStatus).toHaveBeenCalled();
            expect(gameStatusPublisher.publishOdds).toHaveBeenCalledWith({ home: 2, away: 3 });
            expect(gameStatusPublisher.publishBetChoicePoints).toHaveBeenCalledWith({ home: 1, away: 2 });
            expect(gameStatusPublisher.publishCurrentIndex).toHaveBeenCalledWith(1);
        });
    });

    describe("getBetStatus", () => {
        it("should return betting status for current game", () => {
            service.dynamicOddsByGameId["7"] = { home: 2 };
            service.betChoicePointsByGameId["7"] = { home: 1 };
            service.currentOddIndexByGameId["7"] = 3;
            gameData.roundId = 12345;

            const status = service.getBetStatus();

            expect(status).toEqual({ points: { home: 1 }, odds: { home: 2 }, currentIndex: 3 });
        });
    });
});


