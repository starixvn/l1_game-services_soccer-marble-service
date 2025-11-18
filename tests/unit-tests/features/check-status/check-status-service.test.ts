import { CheckStatusService } from "../../../../src/features/check-status/check-status-service";
import { OddsFeedEventName } from "odds-feed-client";

describe("CheckStatusService", () => {
    let service: any;
    let oddsFeedEventSource: any;
    let gameCron: any;

    beforeEach(() => {
        oddsFeedEventSource = {
            eventOn: jest.fn(),
            eventOff: jest.fn(),
        };
        gameCron = { checkGameStatus: jest.fn() };
        service = new CheckStatusService({ oddsFeedEventSource, gameCron }) as any;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("initEvent/dispose", () => {
        it("should register and unregister event start listener", () => {
            service.initEvent();
            expect(oddsFeedEventSource.eventOn).toHaveBeenCalledWith(OddsFeedEventName.EventStart, expect.any(Function));
            service.dispose();
            expect(oddsFeedEventSource.eventOff).toHaveBeenCalledWith(OddsFeedEventName.EventStart, expect.any(Function));
        });
    });

    describe("handleEventStart", () => {
        it("should call checkStatus on gameCron", () => {
            service.checkStatus = jest.fn();
            service.handleEventStart();
            expect(service.checkStatus).toHaveBeenCalled();
        });
    });

    describe("checkStatus", () => {
        it("should delegate to gameCron.checkGameStatus", () => {
            service["checkStatus"]();
            expect(gameCron.checkGameStatus).toHaveBeenCalled();
        });
    });
});


