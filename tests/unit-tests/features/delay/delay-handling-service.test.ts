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
                        globalDelayMs: 500,
                        eventScheduleStartDelayMs: 150,
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
                        globalDelayMs: 700,
                        eventDetailScheduleStartDelayMs: 200,
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
                        eventDetailScheduleStartDelayMs: 350,
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
                        globalDelayMs: 100,
                        eventDetailResultAvailableMs: 400,
                    },
                },
            } as Partial<Event> as Event;

            const result = service.getDelayedTime({ event, time }, { oddFeedEventType: OddsFeedEventName.EventDetailResultsAvailable });

            expect(result.getTime()).toBe(time.getTime() + 500);
        });
    });
});


