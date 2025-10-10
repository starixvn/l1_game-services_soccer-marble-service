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
            expect(oddsFeedEventSource.eventDetailOn).toHaveBeenCalledWith(OddsFeedEventName.EventDetailResultsAvailable, expect.any(Function));
            service.dispose();
            expect(oddsFeedEventSource.eventDetailOff).toHaveBeenCalledWith(OddsFeedEventName.EventDetailResultsAvailable, expect.any(Function));
        });
    });

    describe("handleEventDetailResultsAvailable", () => {
        it("should schedule settlement only for last event detail index", () => {
            const event = { eventID: 10, eventDetails: [{}, { resultsAvailableTs: new Date() }] } as any;
            service.handleEventDetailResultsAvailable({ event, index: 0 });
            expect(scheduler.schedule).not.toHaveBeenCalled();

            service.handleEventDetailResultsAvailable({ event, index: 1 });
            expect(delayHandlingService.getDelayedTime).toHaveBeenCalled();
            expect(scheduler.schedule).toHaveBeenCalled();
        });
    });

    describe("getResultAndSettle", () => {
        it("should build result and settlementResult and call settleSpecificRound", () => {
            const event = {
                eventID: 99,
                eventDetails: [
                    {
                        result: { finalScore: "1-0", goalSequence: [1], },
                        playlist: "p1",
                        phase: "first",
                        markets: [ { selections: [ { betChoice: "home", settlementStatus: "W" } ] } ],
                    },
                    {
                        result: { finalScore: "2-1", goalSequence: [2,1], },
                        playlist: "p2",
                        phase: "second",
                        markets: [ { selections: [ { betChoice: "away", settlementStatus: "L" } ] } ],
                    },
                ],
            } as any;

            service.getResultAndSettle({ event, index: 1 } as any);

            expect(service.resultByEventId[99]).toBeDefined();
            expect(service.resultByEventId[99].result).toEqual({
                0: { finalScore: "1-0", goalSequence: [1], playlist: "p1", phase: "first" },
                1: { finalScore: "2-1", goalSequence: [2,1], playlist: "p2", phase: "second" },
            });
            expect(service.resultByEventId[99].settlementResult).toEqual({
                0: { home: true },
                1: { away: false },
            });

            expect(settleGameRoundConsumer.settleSpecificRound).toHaveBeenCalledWith({
                roundId: 99,
                result: service.resultByEventId[99].result,
                settlementResult: service.resultByEventId[99].settlementResult,
            });
        });
    });
});


