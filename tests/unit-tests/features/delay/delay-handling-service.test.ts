import { DelayHandlingService } from "../../../../src/features/delay/delay-handling-service";
import { OddsFeedEventName } from "odds-feed-client";

describe("DelayHandlingService", () => {
    let service: DelayHandlingService & any;
    let oddsFeedEventSource: any;

    beforeEach(() => {
        oddsFeedEventSource = {
            eventOn: jest.fn(),
            eventOff: jest.fn(),
        };
        service = new DelayHandlingService({ oddsFeedEventSource }) as any;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("initEvent/dispose", () => {
        it("should subscribe and unsubscribe to EventUpcoming", () => {
            service.initEvent();
            expect(oddsFeedEventSource.eventOn).toHaveBeenCalledWith(OddsFeedEventName.EventUpcoming, expect.any(Function));
            service.dispose();
            expect(oddsFeedEventSource.eventOff).toHaveBeenCalledWith(OddsFeedEventName.EventUpcoming, expect.any(Function));
        });
    });

    describe("handleEventUpcoming", () => {
        it("should store delay config when present", () => {
            const event = { eventID: 1, config: { delay: { globalDelayInMillisecond: 1000 } } } as any;
            service.handleEventUpcoming({ event } as any);
            expect(service.getDelayConfig(1)).toEqual({ globalDelayInMillisecond: 1000 });
        });

        it("should ignore when config missing", () => {
            const event = { eventID: 2 } as any;
            service.handleEventUpcoming({ event } as any);
            expect(service.getDelayConfig(2)).toBeUndefined();
        });
    });

    describe("getDelayedTime", () => {
        it("should return original time when no config", () => {
            const now = new Date();
            const res = service.getDelayedTime({ eventId: 3, time: now });
            expect(res.getTime()).toBe(now.getTime());
        });

        it("should add global delay and event-type delay", () => {
            (service as any)._delayConfigByEventId[4] = {
                globalDelayInMillisecond: 500,
                eventScheduleStartDelayInMillisecond: 100,
            };
            const base = new Date();
            const res = service.getDelayedTime({ eventId: 4, time: base }, { oddFeedEventType: OddsFeedEventName.EventStart });
            expect(res.getTime()).toBe(base.getTime() + 500 + 100);
        });

        it("should ignore event-type delay when type not provided", () => {
            (service as any)._delayConfigByEventId[5] = {
                globalDelayInMillisecond: 700,
                eventDetailScheduleStartDelayInMillisecond: 200,
            };
            const base = new Date();
            const res = service.getDelayedTime({ eventId: 5, time: base });
            expect(res.getTime()).toBe(base.getTime() + 700);
        });

        it("should add only event-type delay when global missing", () => {
            (service as any)._delayConfigByEventId[8] = {
                eventDetailScheduleStartDelayInMillisecond: 350,
            };
            const base = new Date();
            const res = service.getDelayedTime({ eventId: 8, time: base }, { oddFeedEventType: OddsFeedEventName.EventDetailStart });
            expect(res.getTime()).toBe(base.getTime() + 350);
        });

        it("should use default branch (unknown type) and add only global delay", () => {
            (service as any)._delayConfigByEventId[9] = {
                globalDelayInMillisecond: 150,
            };
            const base = new Date();
            const res = service.getDelayedTime({ eventId: 9, time: base }, { oddFeedEventType: OddsFeedEventName.EventDetailOddsAvailable });
            expect(res.getTime()).toBe(base.getTime() + 150);
        });

        it("should coalesce missing EventStart delay to 0 (only global applied)", () => {
            (service as any)._delayConfigByEventId[11] = {
                globalDelayInMillisecond: 250,
                // eventScheduleStartDelayInMillisecond missing
            };
            const base = new Date();
            const res = service.getDelayedTime({ eventId: 11, time: base }, { oddFeedEventType: OddsFeedEventName.EventStart });
            expect(res.getTime()).toBe(base.getTime() + 250);
        });

        it("should coalesce missing EventDetailStart delay to 0 (only global applied)", () => {
            (service as any)._delayConfigByEventId[12] = {
                globalDelayInMillisecond: 300,
                // eventDetailScheduleStartDelayInMillisecond missing
            };
            const base = new Date();
            const res = service.getDelayedTime({ eventId: 12, time: base }, { oddFeedEventType: OddsFeedEventName.EventDetailStart });
            expect(res.getTime()).toBe(base.getTime() + 300);
        });

        it("should coalesce missing EventDetailResultsAvailable delay to 0 (only global applied)", () => {
            (service as any)._delayConfigByEventId[13] = {
                globalDelayInMillisecond: 400,
                // eventDetailResultAvailableDelayInMillisecond missing
            };
            const base = new Date();
            const res = service.getDelayedTime({ eventId: 13, time: base }, { oddFeedEventType: OddsFeedEventName.EventDetailResultsAvailable });
            expect(res.getTime()).toBe(base.getTime() + 400);
        });
    });

    describe("getDelayedTimeWithVideoDelay", () => {
        it("should add video delay in addition to computed delay", () => {
            (service as any)._delayConfigByEventId[6] = {
                globalDelayInMillisecond: 300,
                videoDelayInMillisecond: 400,
                eventDetailResultAvailableDelayInMillisecond: 250,
            };
            const base = new Date();
            const res = service.getDelayedTimeWithVideoDelay(
                { eventId: 6, time: base },
                { oddFeedEventType: OddsFeedEventName.EventDetailResultsAvailable }
            );
            expect(res.getTime()).toBe(base.getTime() + 300 + 250 + 400);
        });

        it("should return original time when no config", () => {
            const base = new Date();
            const res = service.getDelayedTimeWithVideoDelay({ eventId: 7, time: base });
            expect(res.getTime()).toBe(base.getTime());
        });

        it("should coalesce missing video delay to 0", () => {
            (service as any)._delayConfigByEventId[10] = {
                globalDelayInMillisecond: 100,
                eventScheduleStartDelayInMillisecond: 50,
            };
            const base = new Date();
            const res = service.getDelayedTimeWithVideoDelay({ eventId: 10, time: base }, { oddFeedEventType: OddsFeedEventName.EventStart });
            expect(res.getTime()).toBe(base.getTime() + 100 + 50);
        });
    });
});


