import { ServerTimeDiffService } from "../../../../src/features/server-time-diff/server-time-diff-service";
import { EventNotification } from "odds-feed-client";

describe("ServerTimeDiffService", () => {
    let service: any;
    let oddsFeedEventSource: any;
    let originalDateNow: typeof Date.now;

    beforeEach(() => {
        oddsFeedEventSource = {
            on: jest.fn(),
            off: jest.fn(),
        };
        service = new ServerTimeDiffService({ oddsFeedEventSource }) as any;
        originalDateNow = Date.now;
    });

    afterEach(() => {
        Date.now = originalDateNow;
        jest.clearAllMocks();
    });

    describe("init", () => {
        it("should register handleAllEvent listener", () => {
            service.init();
            expect(oddsFeedEventSource.on).toHaveBeenCalledWith(service.handleAllEvent);
        });
    });

    describe("dispose", () => {
        it("should unregister handleAllEvent listener", () => {
            service.dispose();
            expect(oddsFeedEventSource.off).toHaveBeenCalledWith(service.handleAllEvent);
        });
    });

    describe("handleAllEvent", () => {
        it("do nothing on no event", () => {
            const notification = {} as EventNotification;
            const initialDelay = service.delay;

            service.handleAllEvent(null, notification);

            expect(service.delay).toBe(initialDelay);
        });

        it("on no event now, just use service now", () => {
            const mockServiceNow = 1000000;
            Date.now = jest.fn(() => mockServiceNow);
            
            const notification = {
                event: {}
            } as EventNotification;

            service.handleAllEvent(null, notification);

            expect(service.delay).toBe(0);
        });

        it("on event now, calculate delay", () => {
            const mockServiceNow = 1000000;
            const mockServerNow = 1000500; // 500ms ahead
            Date.now = jest.fn(() => mockServiceNow);
            
            const notification = {
                event: {
                    now: new Date(mockServerNow).toISOString()
                }
            } as EventNotification;

            service.handleAllEvent(null, notification);

            expect(service.delay).toBe(500);
        });
    });

    describe("now", () => {
        it("return service now + delay", () => {
            const mockServiceNow = 1000000;
            const delay = 500;
            service.delay = delay;
            Date.now = jest.fn(() => mockServiceNow);

            const result = service.now;

            expect(result).toBe(mockServiceNow + delay);
        });
    });
})