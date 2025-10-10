import { CurrentEventService } from "../../../../src/features/current-event/current-event-service";

jest.mock("../../../../src/helpers/eventid", () => ({
    extractGameId: jest.fn(() => 7),
}));

describe("CurrentEventService", () => {
    let service: CurrentEventService & any;
    let oddsFeedEventSource: any;
    let delayHandlingService: any;
    let scheduler: any;
    let gameData: any;
    let gameStatusPublisher: any;

    beforeEach(() => {
        oddsFeedEventSource = {
            eventOn: jest.fn(),
            eventOff: jest.fn(),
            eventDetailOn: jest.fn(),
            eventDetailOff: jest.fn(),
            cleanupOn: jest.fn(),
            cleanupOff: jest.fn(),
        };
        delayHandlingService = {
            getDelayedTime: jest.fn((_t: any) => new Date()),
        };
        scheduler = { schedule: jest.fn() };
        gameData = { roundId: undefined };
        gameStatusPublisher = { publishMatch: jest.fn() };

        service = new CurrentEventService({
            oddsFeedEventSource,
            delayHandlingService,
            scheduler,
            gameData,
            gameStatusPublisher,
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
        it("should schedule and on callback reset current event and publish match", () => {
            const event = { eventID: 123, scheduleStartTs: new Date(), eventDetails: [{}] } as any;
            service.handleEventStart({ event });
            expect(scheduler.schedule).toHaveBeenCalled();

            // simulate scheduled callback (handleEventIndexReset)
            const [when, cb] = (scheduler.schedule as jest.Mock).mock.calls[0];
            expect(when instanceof Date).toBe(true);
            (cb as Function)();

            expect(service._currentEventDetailIndexByGameId["7"]).toBe(0);
            expect(service.eventByEventId[123]).toBe(event);
            expect(service._currentEventByGameId["7"]).toBe(123);
            expect(gameData.roundId).toBe(123);
            expect(gameStatusPublisher.publishMatch).toHaveBeenCalledWith(event);
        });
    });

    describe("handleEventDetailOddAvailable", () => {
        it("should not schedule when index is 0", () => {
            const event = { eventID: 1, eventDetails: [] } as any;
            service.handleEventDetailOddAvailable({ event, index: 0 });
            expect(scheduler.schedule).not.toHaveBeenCalled();
        });

        it("should schedule index change when index > 0 and update on callback", () => {
            const event = { eventID: 1, eventDetails: [{}, { oddsAvailableTs: new Date() }] } as any;
            service.handleEventDetailOddAvailable({ event, index: 1 });
            expect(scheduler.schedule).toHaveBeenCalled();

            const [, cb] = (scheduler.schedule as jest.Mock).mock.calls.pop();
            (cb as Function)();
            expect(service._currentEventDetailIndexByGameId["7"]).toBe(1);
        });
    });

    describe("cleanup", () => {
        it("should delete event by id", () => {
            service.eventByEventId[5] = { id: 5 } as any;
            service.cleanup({ eventID: 5 } as any);
            expect(service.eventByEventId[5]).toBeUndefined();
        });
    });

    describe("getters", () => {
        it("should return current event id, detail index and phase", () => {
            service._currentEventByGameId["7"] = 99;
            service._currentEventDetailIndexByGameId["7"] = 2;
            service.eventByEventId[99] = { eventDetails: [{}, { phase: "p1" }, { phase: "p2" }] } as any;

            expect(service.getCurrentEventByGameId("7")).toBe(99);
            expect(service.getCurrentEventDetailIndexByGameId("7")).toBe(2);
            expect(service.getCurrentPhaseByGameId("7")).toBe("p2");

            const current = service.getCurrentByGameId("7");
            expect(current).toEqual({ event: 99, eventDetailIndex: 2, phase: "p2" });
        });

        it("eventName should be currentEvent", () => {
            expect(service.eventName).toBe("currentEvent");
        });

        it("getCurrentEvent should return current event for current game id", () => {
            // extractGameId mocked to 7; set roundId arbitrary
            service.gameData.roundId = 123456;
            service._currentEventByGameId["7"] = 55;
            const event = { eventID: 55, eventDetails: [] } as any;
            service.eventByEventId[55] = event;

            const res = service.getCurrentEvent();
            expect(res).toBe(event);
        });

        it("getCurrentEvent should return undefined when not mapped", () => {
            service.gameData.roundId = 999999;
            // No _currentEventByGameId mapping for "7" or no eventByEventId entry
            delete service._currentEventByGameId["7"];
            const res = service.getCurrentEvent();
            expect(res).toBeUndefined();
        });
    });
});


