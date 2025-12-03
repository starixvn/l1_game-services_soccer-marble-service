import { BetStatusService, MarbleEventWithBetConfig } from "../../../../src/features/bet-status/bet-status-service";
import { EventDetailNotification, EventNotification, OddsFeedEventName } from "odds-feed-client";
import { MarbleEvent } from "../../../../src/features/shared-types";

jest.mock("../../../../src/helpers/eventid", () => ({
    extractGameId: jest.fn(() => 7),
}));

describe("BetStatusService", () => {
    let service: any;
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
        publishToAllUsers: jest.Mock;
    };
    let delayHandlingService: { getDelayedTime: jest.Mock };
    let scheduler: { schedule: jest.Mock };
    let hedgeBetService: { resetHedgeBetRestriction: jest.Mock; updateHedgeBetGroups: jest.Mock };
    let gameData: { roundId: number; playerBetCount: Record<string, unknown>; gameConfigs: { margin?: Array<{ max: number; margin: number }> } };

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
            publishToAllUsers: jest.fn(),
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
        gameData = { 
            roundId: 12345, 
            playerBetCount: {},
            gameConfigs: {
                margin: []
            }
        };

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

            expect(service.allowBets).toBe(false);
            expect(scheduler.schedule).toHaveBeenCalledWith(expected, expect.any(Function), expect.objectContaining({
                overrideNow: now,
                ignorePast: true,
            }));
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

            expect(scheduler.schedule).toHaveBeenCalledWith(expected, expect.any(Function), expect.objectContaining({
                overrideNow: now,
                ignorePast: true,
            }));
        });
    });

    describe("odd/point/group extraction edge cases", () => {
        it("should return empty odds when event detail missing", () => {
            const event = { eventDetails: [] } as unknown as MarbleEvent;
            service.handleBetChoiceReady({ event, index: 1 } as EventDetailNotification<MarbleEvent>);

            expect(service.odds).toEqual({});
        });

        it("should return margin-processed odds when price missing (zero odds)", () => {
            const event = { eventDetails: [{ markets: [{ selections: [{ betChoice: "home" }] }] }] } as unknown as MarbleEvent;
            service.handleBetChoiceReady({ event, index: 0 } as EventDetailNotification<MarbleEvent>);

            // With zero odds, margin processing should still return 0
            expect(service.odds).toEqual({ home: 0 });
        });

        it("should return empty points when event detail missing", () => {
            const event = { eventDetails: [] } as unknown as MarbleEvent;
            service.handleBetChoiceReady({ event, index: 2 } as EventDetailNotification<MarbleEvent>);

            expect(service.points).toEqual({});
        });

        it("should default points to zero when value missing", () => {
            const event = { eventDetails: [{ markets: [{ selections: [{ betChoice: "away" }] }] }] } as unknown as MarbleEvent;
            service.handleBetChoiceReady({ event, index: 0 } as EventDetailNotification<MarbleEvent>);

            expect(service.points).toEqual({ away: 0 });
        });

        it("should return empty hedge bet groups when event detail missing", () => {
            const event = { eventDetails: [] } as unknown as MarbleEvent;
            service.handleBetChoiceReady({ event, index: 0 } as EventDetailNotification<MarbleEvent>);

            expect(hedgeBetService.updateHedgeBetGroups).toHaveBeenCalledWith([]);
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
            const [time, handler, options] = (scheduler.schedule).mock.calls[0];
            expect(time.getTime()).toBe(lockTime - 1000 + 25);
            expect(typeof handler).toBe("function");
            expect(options).toEqual({ overrideNow: now });
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
            // First set bet status to true by handling bet choice ready
            const event = {
                eventID: 7,
                eventDetails: [{
                    markets: [{ selections: [{ betChoice: "home", price: 2, point: 1 }] }],
                }],
            } as unknown as MarbleEvent;
            service.handleBetChoiceReady({ event, index: 0 } as EventDetailNotification<MarbleEvent>);
            expect(service.allowBets).toBe(true);

            // Now test publishBetChoiceLocked
            const publishBetChoiceLocked = (service).publishBetChoiceLocked.bind(service);
            publishBetChoiceLocked();

            expect(service.allowBets).toBe(false);
            expect(gameStatusPublisher.publishEndPlacingBetStatus).toHaveBeenCalled();
        });
    });

    describe("handleBetChoiceReady", () => {
        it("should populate betting data and publish margin-processed odds to clients", () => {
            // Set up margin config: for odds <= 5, use 0.05 margin base
            gameData.gameConfigs.margin = [{ max: 5, margin: 0.05 }];
            
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

            expect(service.allowBets).toBe(true);
            expect(service.currentIndex).toBe(1);
            expect(service.points).toEqual({ home: 1, away: 2 });
            expect(hedgeBetService.resetHedgeBetRestriction).toHaveBeenCalled();
            expect(hedgeBetService.updateHedgeBetGroups).toHaveBeenCalled();
            expect(gameStatusPublisher.publishStartPlacingBetStatus).toHaveBeenCalled();
            
            // Verify that published odds are margin-processed (not raw odds)
            // Raw odds: home: 2, away: 3
            // With margin processing, odds should be lower than raw odds
            const publishedCall = gameStatusPublisher.publishToAllUsers.mock.calls[0][0];
            expect(publishedCall.points).toEqual({ home: 1, away: 2 });
            expect(publishedCall.index).toBe(1);
            
            // Odds should be margin-processed (less than raw odds)
            expect(publishedCall.odds.home).toBeLessThan(2);
            expect(publishedCall.odds.away).toBeLessThan(3);
            expect(publishedCall.odds.home).toBeGreaterThan(0);
            expect(publishedCall.odds.away).toBeGreaterThan(0);
            
            // Service.odds getter should return the same margin-processed odds
            expect(service.odds).toEqual(publishedCall.odds);
        });
    });

    describe("derived getters", () => {
        beforeEach(() => {
            gameData.gameConfigs.margin = [{ max: 10, margin: 0.03 }];
            const event = {
                eventID: 7,
                eventDetails: [{
                    markets: [{ selections: [{ betChoice: "home", price: 2, point: 1 }] }],
                }],
            } as unknown as MarbleEvent;
            service.handleBetChoiceReady({ event, index: 0 } as EventDetailNotification<MarbleEvent>);
        });

        it("should expose margin-processed odds for current round", () => {
            // Odds should be margin-processed (less than raw price of 2)
            expect(service.odds.home).toBeLessThan(2);
            expect(service.odds.home).toBeGreaterThan(0);
        });

        it("should expose points for current round", () => {
            expect(service.points).toEqual({ home: 1 });
        });

        it("should expose current index for current round", () => {
            expect(service.currentIndex).toBe(0);
        });

        it("should report allowBets only when odds available", () => {
            expect(service.allowBets).toBe(true);
            
            // Test with empty event details to get empty odds
            const emptyEvent = {
                eventID: 7,
                eventDetails: [],
            } as unknown as MarbleEvent;
            service.handleBetChoiceReady({ event: emptyEvent, index: 0 } as EventDetailNotification<MarbleEvent>);
            expect(service.allowBets).toBe(false);
        });
    });

    describe("margin processing", () => {
        it("should apply margin to odds before publishing to clients", () => {
            // Set up margin config with different thresholds
            gameData.gameConfigs.margin = [
                { max: 2, margin: 0.05 },   // For odds <= 2, use 5% margin
                { max: 5, margin: 0.03 },  // For odds <= 5, use 3% margin
            ];

            const event = {
                eventID: 7,
                eventDetails: [{
                    markets: [
                        { selections: [{ betChoice: "low", price: 1.5 }] },   // Should use 5% margin
                        { selections: [{ betChoice: "medium", price: 3 }] },  // Should use 3% margin
                        { selections: [{ betChoice: "high", price: 10 }] },   // Should use default margin (2%)
                    ],
                }],
            } as unknown as MarbleEvent;

            service.handleBetChoiceReady({ event, index: 0 } as EventDetailNotification<MarbleEvent>);

            // Verify published odds are margin-processed (lower than raw odds)
            const publishedOdds = gameStatusPublisher.publishToAllUsers.mock.calls[0][0].odds;
            expect(publishedOdds.low).toBeLessThan(1.5);
            expect(publishedOdds.medium).toBeLessThan(3);
            expect(publishedOdds.high).toBeLessThan(10);
            
            // All should be positive
            expect(publishedOdds.low).toBeGreaterThan(0);
            expect(publishedOdds.medium).toBeGreaterThan(0);
            expect(publishedOdds.high).toBeGreaterThan(0);

            // Service.odds should match published odds
            expect(service.odds).toEqual(publishedOdds);
        });

        it("should use default margin when margin config is empty", () => {
            gameData.gameConfigs.margin = [];

            const event = {
                eventID: 7,
                eventDetails: [{
                    markets: [
                        { selections: [{ betChoice: "home", price: 2 }] },
                    ],
                }],
            } as unknown as MarbleEvent;

            service.handleBetChoiceReady({ event, index: 0 } as EventDetailNotification<MarbleEvent>);

            // Should still apply margin (default 2%)
            const publishedOdds = gameStatusPublisher.publishToAllUsers.mock.calls[0][0].odds;
            expect(publishedOdds.home).toBeLessThan(2);
            expect(publishedOdds.home).toBeGreaterThan(0);
        });

        it("should use default margin when margin config is undefined", () => {
            gameData.gameConfigs.margin = undefined;

            const event = {
                eventID: 7,
                eventDetails: [{
                    markets: [
                        { selections: [{ betChoice: "home", price: 2 }] },
                    ],
                }],
            } as unknown as MarbleEvent;

            service.handleBetChoiceReady({ event, index: 0 } as EventDetailNotification<MarbleEvent>);

            // Should still apply margin (default 2%)
            const publishedOdds = gameStatusPublisher.publishToAllUsers.mock.calls[0][0].odds;
            expect(publishedOdds.home).toBeLessThan(2);
            expect(publishedOdds.home).toBeGreaterThan(0);
        });
    });
});


