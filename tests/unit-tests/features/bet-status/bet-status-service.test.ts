import { BetStatusService } from "../../../../src/features/bet-status/bet-status-service";

jest.mock("../../../../src/helpers/eventid", () => ({
    extractGameId: jest.fn(() => 7),
}));

describe("BetStatusService", () => {
    let service: BetStatusService & any;
    let oddsFeedEventSource: any;
    let gameStatusPublisher: any;
    let delayHandlingService: any;
    let scheduler: any;
    let hedgeBetService: any;
    let gameData: any;

    beforeEach(() => {
        oddsFeedEventSource = {
            eventOn: jest.fn(),
            eventOff: jest.fn(),
            eventDetailOn: jest.fn(),
            eventDetailOff: jest.fn(),
            cleanupOn: jest.fn(),
            cleanupOff: jest.fn(),
        };
        gameStatusPublisher = {
            publishStartPlacingBetStatus: jest.fn(),
            publishEndPlacingBetStatus: jest.fn(),
            publishOdds: jest.fn(),
            publishBetChoicePoints: jest.fn(),
            publishCurrentIndex: jest.fn(),
        };
        delayHandlingService = {
            getDelayedTime: jest.fn((_t: any) => new Date()),
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
        }) as any;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("initEvent/dispose", () => {
        it("should register and unregister all listeners", () => {
            service.initEvent();
            expect(oddsFeedEventSource.eventOn).toHaveBeenCalled();
            expect(oddsFeedEventSource.eventDetailOn).toHaveBeenCalled();
            expect(oddsFeedEventSource.cleanupOn).toHaveBeenCalled();

            service.dispose();
            expect(oddsFeedEventSource.eventOff).toHaveBeenCalled();
            expect(oddsFeedEventSource.eventDetailOff).toHaveBeenCalled();
            expect(oddsFeedEventSource.cleanupOff).toHaveBeenCalled();
        });
    });

    describe("handleEventStart", () => {
        it("should set state and schedule initial place bet", () => {
            const event = { eventID: 999, scheduleStartTs: new Date() } as any;
            service.handleEventStart({ event });
            expect(service.betStatusByGameId["7"]).toBe(false);
            expect(service.currentRoundId).toBe(999);
            expect(scheduler.schedule).toHaveBeenCalled();
        });
    });

    describe("handleEventDetailOddAvailable", () => {
        it("should not schedule when index is 0", () => {
            const event = { eventID: 1, eventDetails: [] } as any;
            service.handleEventDetailOddAvailable({ event, index: 0 });
            expect(scheduler.schedule).not.toHaveBeenCalled();
        });

        it("should schedule when index > 0", () => {
            const event = { eventID: 1, eventDetails: [{}, { oddsAvailableTs: new Date() }, { oddsAvailableTs: new Date() }] } as any;
            service.handleEventDetailOddAvailable({ event, index: 2 });
            expect(scheduler.schedule).toHaveBeenCalled();
        });
    });

    describe("handleEventUpcoming / handleCleanupEventUpcoming", () => {
        it("should store bet config from event and delete on cleanup", () => {
            const event = { eventID: 42, config: { bet: { delayPlaceBetByOddsAvailableByMilliseconds: 500, lockBetTimeBeforeScheduleStartByMilliseconds: 2000 } } } as any;
            service.handleEventUpcoming({ event });
            // @ts-ignore access private map for test
            expect((service as any).betConfigByEventId[42]).toEqual({
                delayPlaceBetByOddsAvailableByMilliseconds: 500,
                lockBetTimeBeforeScheduleStartByMilliseconds: 2000,
            });

            service.handleCleanupEventUpcoming({ eventID: 42 } as any);
            // @ts-ignore
            expect((service as any).betConfigByEventId[42]).toBeUndefined();
        });

        it("should allow missing config without throwing", () => {
            const event = { eventID: 43 } as any;
            expect(() => service.handleEventUpcoming({ event })).not.toThrow();
            // @ts-ignore
            expect((service as any).betConfigByEventId[43]).toEqual({
                delayPlaceBetByOddsAvailableByMilliseconds: undefined,
                lockBetTimeBeforeScheduleStartByMilliseconds: undefined,
            });
        });
    });

    describe("odd/point/group extraction edge cases", () => {
        it("getOddFromEventDetail should return {} when eventDetail missing", () => {
            const odds = (service as any).getOddFromEventDetail({ event: { eventDetails: [] }, index: 1 });
            expect(odds).toEqual({});
        });

        it("getOddFromEventDetail should default price to 0", () => {
            const event = { eventDetails: [ { markets: [ { selections: [ { betChoice: "home" } ] } ] } ] } as any;
            const odds = (service as any).getOddFromEventDetail({ event, index: 0 });
            expect(odds).toEqual({ home: 0 });
        });

        it("getPointFromEventDetail should return {} when eventDetail missing", () => {
            const points = (service as any).getPointFromEventDetail({ event: { eventDetails: [] }, index: 5 });
            expect(points).toEqual({});
        });

        it("getPointFromEventDetail should default point to 0", () => {
            const event = { eventDetails: [ { markets: [ { selections: [ { betChoice: "away" } ] } ] } ] } as any;
            const points = (service as any).getPointFromEventDetail({ event, index: 0 });
            expect(points).toEqual({ away: 0 });
        });

        it("getHedgeBetGroups should return [] when eventDetail missing", () => {
            const groups = (service as any).getHedgeBetGroups({ event: { eventDetails: [] }, index: 0 });
            expect(groups).toEqual([]);
        });
    });
    describe("handleEventDetailUpcoming", () => {
        it("should schedule lock bet with ignorePast option when index > 0", () => {
            const event = { eventID: 2, eventDetails: [{}, { scheduleStartTs: new Date() }] } as any;
            service.handleEventDetailUpcoming({ event, index: 1 });
            expect(scheduler.schedule).toHaveBeenCalled();
            const args = (scheduler.schedule as jest.Mock).mock.calls.pop();
            expect(args[2]).toEqual({ ignorePast: true });
        });
    });

    describe("publishBetChoiceLocked", () => {
        it("should update status and publish end placing bet", () => {
            service.betStatusByGameId["7"] = true;
            service.publishBetChoiceLocked({ event: { eventID: 7 }, index: 1 });
            expect(service.betStatusByGameId["7"]).toBe(false);
            expect(gameStatusPublisher.publishEndPlacingBetStatus).toHaveBeenCalled();
        });
    });

    describe("handleBetChoiceReady", () => {
        it("should populate odds, points, groups and publish", () => {
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
            } as any;

            service.handleBetChoiceReady({ event, index: 1 });

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
        it("should return points, odds, and currentIndex by current game id", () => {
            service.dynamicOddsByGameId["7"] = { home: 2 };
            service.betChoicePointsByGameId["7"] = { home: 1 } as any;
            service.currentOddIndexByGameId["7"] = 3 as any;
            gameData.roundId = 12345;

            const status = service.getBetStatus();
            expect(status).toEqual({ points: { home: 1 }, odds: { home: 2 }, currentIndex: 3 });
        });
    });
});


