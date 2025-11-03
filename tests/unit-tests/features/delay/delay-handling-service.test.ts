import { DelayHandlingService } from "../../../../src/features/delay/delay-handling-service";
import { Event, OddsFeedEventName } from "odds-feed-client";

describe("DelayHandlingService", () => {
    let service: DelayHandlingService;
    const BASE_TIME_ISO = "2025-01-01T00:00:00Z";
    const createBaseTime = () => new Date(BASE_TIME_ISO);

    beforeEach(() => {
        service = new DelayHandlingService();
    });

    describe("getDelayedTime", () => {
        it("should return original time when event has no delay config", () => {
            const time = createBaseTime();
            const event = { eventID: 1 } as Partial<Event> as Event;

            const result = service.getDelayedTime({ event, time });

            expect(result.getTime()).toBe(time.getTime());
        });

        it("should add global and event start delays when provided", () => {
            const time = createBaseTime();
            const event = {
                eventID: 1,
                config: {
                    delay: {
                        globalDelayInMillisecond: 500,
                        eventScheduleStartDelayInMillisecond: 150,
                    },
                },
            } as Partial<Event> as Event;

            const result = service.getDelayedTime({ event, time }, { oddFeedEventType: OddsFeedEventName.EventStart });

            expect(result.getTime()).toBe(time.getTime() + 650);
        });

        it("should add only global delay when event type is not provided", () => {
            const time = createBaseTime();
            const event = {
                eventID: 2,
                config: {
                    delay: {
                        globalDelayInMillisecond: 700,
                        eventDetailScheduleStartDelayInMillisecond: 200,
                    },
                },
            } as Partial<Event> as Event;

            const result = service.getDelayedTime({ event, time });

            expect(result.getTime()).toBe(time.getTime() + 700);
        });

        it("should add event detail start delay when global delay missing", () => {
            const time = createBaseTime();
            const event = {
                eventID: 3,
                config: {
                    delay: {
                        eventDetailScheduleStartDelayInMillisecond: 350,
                    },
                },
            } as Partial<Event> as Event;

            const result = service.getDelayedTime({ event, time }, { oddFeedEventType: OddsFeedEventName.EventDetailStart });

            expect(result.getTime()).toBe(time.getTime() + 350);
        });

        it("should add event detail results available delay", () => {
            const time = createBaseTime();
            const event = {
                eventID: 4,
                config: {
                    delay: {
                        globalDelayInMillisecond: 100,
                        eventDetailResultAvailableDelayInMillisecond: 400,
                    },
                },
            } as Partial<Event> as Event;

            const result = service.getDelayedTime({ event, time }, { oddFeedEventType: OddsFeedEventName.EventDetailResultsAvailable });

            expect(result.getTime()).toBe(time.getTime() + 500);
        });
    });

    describe("getDelayedTimeWithVideoDelay", () => {
        it("should add video delay in addition to calculated delay", () => {
            const time = createBaseTime();
            const event = {
                eventID: 5,
                config: {
                    delay: {
                        globalDelayInMillisecond: 300,
                        videoDelayInMillisecond: 200,
                        eventDetailResultAvailableDelayInMillisecond: 250,
                    },
                },
            } as Partial<Event> as Event;

            const result = service.getDelayedTimeWithVideoDelay({ event, time }, { oddFeedEventType: OddsFeedEventName.EventDetailResultsAvailable });

            expect(result.getTime()).toBe(time.getTime() + 750);
        });

        it("should return original time when video delay and config missing", () => {
            const time = createBaseTime();
            const event = { eventID: 6 } as Partial<Event> as Event;

            const result = service.getDelayedTimeWithVideoDelay({ event, time });

            expect(result.getTime()).toBe(time.getTime());
        });

        it("should treat missing video delay as zero", () => {
            const time = createBaseTime();
            const event = {
                eventID: 7,
                config: {
                    delay: {
                        globalDelayInMillisecond: 150,
                        eventScheduleStartDelayInMillisecond: 50,
                    },
                },
            } as Partial<Event> as Event;

            const result = service.getDelayedTimeWithVideoDelay({ event, time }, { oddFeedEventType: OddsFeedEventName.EventStart });

            expect(result.getTime()).toBe(time.getTime() + 200);
        });
    });
});


