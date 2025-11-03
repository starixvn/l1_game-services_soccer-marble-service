import { GameFlow, GameFlowService } from "../../../../src/features/game-flow/game-flow-service";
import { OddsFeedEventName, EventNotification, EventDetailNotification, Event, EventDetail, OddsFeedEventSource, Scheduler } from "odds-feed-client";
import { DelayHandlingService } from "../../../../src/features/delay/delay-handling-service";
import GameStatusPublisher from "../../../../src/publishers/game-status-publisher";
import { BetStatusService } from "../../../../src/features/bet-status/bet-status-service";
import { MarbleEvent } from "../../../../src/features/shared-types";

jest.mock("../../../../src/helpers/eventid", () => ({
    extractGameId: jest.fn(() => 42),
}));

describe("GameFlowService", () => {
    const BASE_SCHEDULE_TS = "2025-01-01T00:00:00Z";
    const FIRST_RESULTS_TS = "2025-01-01T00:01:00Z";
    const SECOND_RESULTS_TS = "2025-01-01T00:02:00Z";

    let service: GameFlowService;
    let oddsFeedEventSource: {
        eventOn: jest.Mock;
        eventOff: jest.Mock;
        eventDetailOn: jest.Mock;
        eventDetailOff: jest.Mock;
    };
    let scheduler: { schedule: jest.Mock };
    let delayHandlingService: { getDelayedTime: jest.Mock };
    let gameStatusPublisher: jest.Mocked<GameStatusPublisher>;
    let betStatusService: BetStatusService;

    beforeEach(() => {
        oddsFeedEventSource = {
            eventOn: jest.fn(),
            eventOff: jest.fn(),
            eventDetailOn: jest.fn(),
            eventDetailOff: jest.fn(),
        };
        scheduler = { schedule: jest.fn() };
        delayHandlingService = {
            getDelayedTime: jest.fn(({ time }: { time: Date }) => new Date(time.getTime() + 500)),
        };
        gameStatusPublisher = {
            publishToAllUsers: jest.fn(),
        } as unknown as jest.Mocked<GameStatusPublisher>;
        betStatusService = {} as BetStatusService;

        service = new GameFlowService({
            oddsFeedEventSource: oddsFeedEventSource as unknown as OddsFeedEventSource<MarbleEvent>,
            scheduler: scheduler as unknown as Scheduler,
            delayHandlingService: delayHandlingService as unknown as DelayHandlingService,
            gameStatusPublisher: gameStatusPublisher as unknown as GameStatusPublisher,
            betStatusService,
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    const createEventDetail = (overrides: Partial<EventDetail> = {}): EventDetail => ({
        eventID: 100,
        oddsAvailableTs: FIRST_RESULTS_TS,
        scheduleStartTs: FIRST_RESULTS_TS,
        hasResults: false,
        markets: [],
        resultsAvailableTs: FIRST_RESULTS_TS,
        ...overrides,
    } as unknown as EventDetail);

    const createEvent = (overrides: Partial<Event> & { eventDetails?: EventDetail[] } = {}): Event => {
        const eventDetails: EventDetail[] = overrides.eventDetails ?? [
            createEventDetail(),
        ];

        return {
            eventID: 100,
            scheduleStartTs: BASE_SCHEDULE_TS,
            eventDetails,
            ...overrides,
        } as unknown as Event;
    };

    describe("init/dispose", () => {
        it("should register and unregister event listeners", () => {
            // Arrange

            // Act
            service.init();
            service.dispose();

            // Assert
            expect(oddsFeedEventSource.eventOn).toHaveBeenCalledWith(OddsFeedEventName.EventStart, expect.any(Function));
            expect(oddsFeedEventSource.eventDetailOn).toHaveBeenCalledWith(OddsFeedEventName.EventDetailResultsAvailable, expect.any(Function));
            expect(oddsFeedEventSource.eventOff).toHaveBeenCalledWith(OddsFeedEventName.EventStart, expect.any(Function));
            expect(oddsFeedEventSource.eventDetailOff).toHaveBeenCalledWith(OddsFeedEventName.EventDetailResultsAvailable, expect.any(Function));
        });
    });

    describe("handleEventStart", () => {
        it("should schedule start game using delayed time", () => {
            // Arrange
            const event = createEvent();
            const notification = { event } as unknown as EventNotification;

            // Act
            service.handleEventStart(notification);

            // Assert
            expect(delayHandlingService.getDelayedTime).toHaveBeenCalledWith(
                { event, time: new Date(event.scheduleStartTs) },
                { oddFeedEventType: OddsFeedEventName.EventStart },
            );
            expect(scheduler.schedule).toHaveBeenCalledTimes(1);
            const [time, callback] = scheduler.schedule.mock.calls[0];
            expect(time.getTime()).toBe(new Date(event.scheduleStartTs).getTime() + 500);
            expect(typeof callback).toBe("function");
        });
    });

    describe("handleEventDetailResultAvailable", () => {
        it("should not schedule when index is not the last detail", () => {
            // Arrange
            const event = createEvent({
                eventDetails: [
                    createEventDetail({ resultsAvailableTs: FIRST_RESULTS_TS }),
                    createEventDetail({ resultsAvailableTs: SECOND_RESULTS_TS }),
                ],
            });
            const notification = { event, index: 0 } as unknown as EventDetailNotification;

            // Act
            service.handleEventDetailResultAvailable(notification);

            // Assert
            expect(delayHandlingService.getDelayedTime).not.toHaveBeenCalled();
            expect(scheduler.schedule).not.toHaveBeenCalled();
        });

        it("should schedule result handling for the last detail", () => {
            // Arrange
            const event = createEvent({
                eventDetails: [
                    createEventDetail({ resultsAvailableTs: FIRST_RESULTS_TS }),
                ],
            });
            const notification = { event, index: 0 } as unknown as EventDetailNotification;

            // Act
            service.handleEventDetailResultAvailable(notification);

            // Assert
            expect(delayHandlingService.getDelayedTime).toHaveBeenCalledWith(
                { event, time: new Date(event.eventDetails[0].resultsAvailableTs) },
                { oddFeedEventType: OddsFeedEventName.EventDetailResultsAvailable },
            );
            expect(scheduler.schedule).toHaveBeenCalledTimes(1);
            const [time, callback] = scheduler.schedule.mock.calls[0];
            expect(time.getTime()).toBe(new Date(event.eventDetails[0].resultsAvailableTs).getTime() + 500);
            (callback as () => void)();
            expect(gameStatusPublisher.publishToAllUsers).toHaveBeenCalledWith({ gameFlow: GameFlow.Result });
        });
    });

    describe("game flow transitions", () => {
        it("should switch to start flow and expose current game flow", () => {
            // Arrange
            const event = createEvent();
            const notification = { event } as unknown as EventNotification;

            // Act
            service.handleStartGame(notification);
            const current = service.getCurrentGameFlow("42");

            // Assert
            expect(gameStatusPublisher.publishToAllUsers).toHaveBeenCalledWith({ gameFlow: GameFlow.Start });
            expect(current).toEqual({ gameFlow: GameFlow.Start });
        });

        it("should switch to result flow", () => {
            // Arrange
            const event = createEvent();
            const notification = { event, index: 0 } as unknown as EventDetailNotification;

            // Act
            service.handleResult(notification);

            // Assert
            expect(gameStatusPublisher.publishToAllUsers).toHaveBeenCalledWith({ gameFlow: GameFlow.Result });
        });
    });
});

