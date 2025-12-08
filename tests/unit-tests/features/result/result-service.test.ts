import { ResultService } from "../../../../src/features/result/result-service";
import { OddsFeedEventName } from "odds-feed-client";

describe("ResultService", () => {
    let service: ResultService & any;
    let oddsFeedEventSource: any;
    let scheduler: any;
    let delayHandlingService: any;
    let settleGameRoundConsumer: any;

    beforeEach(() => {
        oddsFeedEventSource = {
            eventOn: jest.fn(),
            eventOff: jest.fn(),
            eventDetailOn: jest.fn(),
            eventDetailOff: jest.fn(),
        };
        scheduler = { schedule: jest.fn() };
        delayHandlingService = { getDelayedTime: jest.fn((_t: any) => new Date()) };
        settleGameRoundConsumer = { settleSpecificRound: jest.fn() };

        service = new ResultService({
            oddsFeedEventSource,
            settleGameRoundConsumer,
            scheduler,
            delayHandlingService,
        }) as any;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("initEvent/dispose", () => {
        it("should subscribe and unsubscribe to EventStart and EventDetailResultsAvailable", () => {
            oddsFeedEventSource.eventOn = jest.fn();
            oddsFeedEventSource.eventOff = jest.fn();
            service.initEvent();
            expect(oddsFeedEventSource.eventOn).toHaveBeenCalledWith(
                OddsFeedEventName.EventStart,
                expect.any(Function)
            );
            expect(oddsFeedEventSource.eventDetailOn).toHaveBeenCalledWith(
                OddsFeedEventName.EventDetailResultsAvailable,
                expect.any(Function)
            );
            service.dispose();
            expect(oddsFeedEventSource.eventOff).toHaveBeenCalledWith(
                OddsFeedEventName.EventStart,
                expect.any(Function)
            );
            expect(oddsFeedEventSource.eventDetailOff).toHaveBeenCalledWith(
                OddsFeedEventName.EventDetailResultsAvailable,
                expect.any(Function)
            );
        });
    });

    describe("handleEventStart", () => {
        it("should schedule resetLiveScore with delayed time", () => {
            const event = {
                eventID: 10,
                scheduleStartTs: new Date("2023-01-01T10:00:00Z").getTime(),
                now: new Date("2023-01-01T09:00:00Z").getTime(),
            } as any;
            const delayedTime = new Date("2023-01-01T10:05:00Z");
            delayHandlingService.getDelayedTime.mockReturnValue(delayedTime);

            service.handleEventStart({ event });

            expect(delayHandlingService.getDelayedTime).toHaveBeenCalledWith(
                { event, time: new Date(event.scheduleStartTs) },
                { oddFeedEventType: OddsFeedEventName.EventStart }
            );
            expect(scheduler.schedule).toHaveBeenCalledWith(
                delayedTime,
                expect.any(Function),
                { overrideNow: event.now }
            );
        });
    });

    describe("handleEventDetailResultsAvailable", () => {
        it("should schedule updateLiveScore for any index", () => {
            const event = {
                eventID: 10,
                now: new Date("2023-01-01T10:00:00Z").getTime(),
                eventDetails: [
                    { result: "1:0", resultsAvailableTs: new Date("2023-01-01T10:00:00Z").getTime() },
                ],
            } as any;
            const delayedTime = new Date("2023-01-01T10:05:00Z");
            delayHandlingService.getDelayedTime.mockReturnValue(delayedTime);

            service.handleEventDetailResultsAvailable({ event, index: 0 });

            expect(delayHandlingService.getDelayedTime).toHaveBeenCalledWith(
                { event, time: new Date(event.eventDetails[0].resultsAvailableTs) },
                { oddFeedEventType: OddsFeedEventName.EventDetailResultsAvailable }
            );
            expect(scheduler.schedule).toHaveBeenCalledWith(
                delayedTime,
                expect.any(Function),
                { overrideNow: event.now }
            );
        });

        it("should schedule settlement only for last event detail index", () => {
            const event = {
                eventID: 10,
                now: new Date("2023-01-01T10:00:00Z").getTime(),
                eventDetails: [
                    { result: "1:0", resultsAvailableTs: new Date("2023-01-01T10:00:00Z").getTime() },
                    { result: "2:1", resultsAvailableTs: new Date("2023-01-01T10:05:00Z").getTime() },
                ],
            } as any;
            const delayedTime = new Date("2023-01-01T10:10:00Z");
            delayHandlingService.getDelayedTime.mockReturnValue(delayedTime);

            service.handleEventDetailResultsAvailable({ event, index: 0 });
            expect(scheduler.schedule).toHaveBeenCalledTimes(1); // Only updateLiveScore

            service.handleEventDetailResultsAvailable({ event, index: 1 });
            expect(scheduler.schedule).toHaveBeenCalledTimes(3); // updateLiveScore + getResultAndSettle
        });

        it("should not schedule settlement when index is not the last", () => {
            const event = {
                eventID: 10,
                now: new Date("2023-01-01T10:00:00Z").getTime(),
                eventDetails: [
                    { result: "1:0", resultsAvailableTs: new Date("2023-01-01T10:00:00Z").getTime() },
                    { result: "2:1", resultsAvailableTs: new Date("2023-01-01T10:05:00Z").getTime() },
                    { result: "0:1", resultsAvailableTs: new Date("2023-01-01T10:10:00Z").getTime() },
                ],
            } as any;
            const delayedTime = new Date("2023-01-01T10:15:00Z");
            delayHandlingService.getDelayedTime.mockReturnValue(delayedTime);

            service.handleEventDetailResultsAvailable({ event, index: 1 });
            expect(scheduler.schedule).toHaveBeenCalledTimes(1); // Only updateLiveScore, no settlement
        });
    });

    describe("resetLiveScore", () => {
        it("should reset live score to 0:0", () => {
            service.currentLiveScore = { home: 5, away: 3 };
            service.resetLiveScore();
            expect(service.currentLiveScore).toEqual({ home: 0, away: 0 });
        });
    });

    describe("updateLiveScore", () => {
        it("should update live score by adding result to current score", () => {
            service.currentLiveScore = { home: 1, away: 0 };
            const event = {
                eventID: 10,
                eventDetails: [{ result: "2:1" }],
            } as any;

            service.updateLiveScore({ event, index: 0 });

            expect(service.currentLiveScore).toEqual({ home: 3, away: 1 });
        });

        it("should accumulate scores correctly across multiple updates", () => {
            service.currentLiveScore = { home: 0, away: 0 };
            const event = {
                eventID: 10,
                eventDetails: [
                    { result: "1:0" },
                    { result: "2:1" },
                    { result: "0:1" },
                ],
            } as any;

            service.updateLiveScore({ event, index: 0 });
            expect(service.currentLiveScore).toEqual({ home: 1, away: 0 });

            service.updateLiveScore({ event, index: 1 });
            expect(service.currentLiveScore).toEqual({ home: 3, away: 1 });

            service.updateLiveScore({ event, index: 2 });
            expect(service.currentLiveScore).toEqual({ home: 3, away: 2 });
        });

        it("should handle score starting from non-zero values", () => {
            service.currentLiveScore = { home: 2, away: 1 };
            const event = {
                eventID: 10,
                eventDetails: [{ result: "1:2" }],
            } as any;

            service.updateLiveScore({ event, index: 0 });

            expect(service.currentLiveScore).toEqual({ home: 3, away: 3 });
        });
    });

    describe("getResultAndSettle", () => {
        it("should build minimal result and settlementResult snapshots and call settleSpecificRound", () => {
            const event = {
                eventID: 99,
                eventNameAKey: "Team Alpha",
                eventNameBKey: "Team Beta",
                eventDetails: [
                    {
                        phase: 1,
                        result: "1-0",
                        markets: [
                            {
                                selections: [
                                    { betChoice: "home", settlementStatus: "W" },
                                    { betChoice: "draw", settlementStatus: "L" },
                                ],
                            },
                        ],
                    },
                    {
                        phase: 2,
                        result: "2-1",
                        markets: [
                            {
                                selections: [{ betChoice: "away", settlementStatus: "L" }],
                            },
                        ],
                    },
                ],
            } as any;

            service.getResultAndSettle({ event, index: 1 } as any);

            expect(service.resultByEventId[99]).toBeDefined();
            expect(service.resultByEventId[99].result).toEqual({
                0: { phase: 1, result: "1-0" },
                1: { phase: 2, result: "2-1" },
            });
            expect(service.resultByEventId[99].settlementResult).toEqual({
                0: { home: true, draw: false },
                1: { away: false },
            });

            expect(settleGameRoundConsumer.settleSpecificRound).toHaveBeenCalledWith({
                roundId: 99,
                result: service.resultByEventId[99].result,
                settlementResult: service.resultByEventId[99].settlementResult,
                match: { home: "Team Alpha", away: "Team Beta" },
            });
        });
    });
});
