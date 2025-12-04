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
        it("should subscribe and unsubscribe to EventDetailResultsAvailable", () => {
            service.initEvent();
            expect(oddsFeedEventSource.eventDetailOn).toHaveBeenCalledWith(
                OddsFeedEventName.EventDetailResultsAvailable,
                expect.any(Function)
            );
            service.dispose();
            expect(oddsFeedEventSource.eventDetailOff).toHaveBeenCalledWith(
                OddsFeedEventName.EventDetailResultsAvailable,
                expect.any(Function)
            );
        });
    });

    describe("handleEventDetailResultsAvailable", () => {
        it("should initialize live score to 0-0 when index is 0", () => {
            const event = { eventID: 10, eventDetails: [{}] } as any;
            service.handleEventDetailResultsAvailable({ event, index: 0 });
            expect(service.currentLiveScore[0]).toEqual({ home: 0, away: 0 });
            expect(scheduler.schedule).not.toHaveBeenCalled();
        });

        it("should calculate cumulative live score for index > 0", () => {
            const event = {
                eventID: 10,
                eventDetails: [
                    { result: "1:0" },
                    { result: "2:1" },
                    { result: "0:1" },
                    { resultsAvailableTs: new Date() },
                ],
            } as any;

            // Index 1: sum of index 0 = 1:0
            service.handleEventDetailResultsAvailable({ event, index: 1 });
            expect(service.currentLiveScore[1]).toEqual({ home: 1, away: 0 });

            // Index 2: sum of index 0 and 1 = (1+2):(0+1) = 3:1
            service.handleEventDetailResultsAvailable({ event, index: 2 });
            expect(service.currentLiveScore[2]).toEqual({ home: 3, away: 1 });

            // Index 3: sum of index 0, 1, and 2 = (1+2+0):(0+1+1) = 3:2
            service.handleEventDetailResultsAvailable({ event, index: 3 });
            expect(service.currentLiveScore[3]).toEqual({ home: 3, away: 2 });
        });

        it("should schedule settlement only for last event detail index", () => {
            const event = {
                eventID: 10,
                eventDetails: [
                    { result: "1:0" },
                    { result: "2:1", resultsAvailableTs: new Date() },
                ],
            } as any;
            service.handleEventDetailResultsAvailable({ event, index: 0 });
            expect(scheduler.schedule).not.toHaveBeenCalled();

            service.handleEventDetailResultsAvailable({ event, index: 1 });
            expect(service.currentLiveScore[1]).toEqual({ home: 1, away: 0 });
            expect(delayHandlingService.getDelayedTime).toHaveBeenCalled();
            expect(scheduler.schedule).toHaveBeenCalled();
        });

        it("should not schedule settlement when index is not the last", () => {
            const event = {
                eventID: 10,
                eventDetails: [
                    { result: "1:0" },
                    { result: "2:1" },
                    { resultsAvailableTs: new Date() },
                ],
            } as any;

            service.handleEventDetailResultsAvailable({ event, index: 1 });
            expect(scheduler.schedule).not.toHaveBeenCalled();
            expect(service.currentLiveScore[1]).toEqual({ home: 1, away: 0 });
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
