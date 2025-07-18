import { EventProcessConsumer } from "../../../src/consumers/event-process-consumer";
import { SchedulerConsumer } from "../../../src/consumers/scheduler-consumer";
import { OddFeedConsumer, ScheduleResponseItem, EventResponse } from "../../../src/consumers/odd-feed-consumer";
import GameData from "../../../src/game-data";
import * as eventIdHelper from "../../../src/helpers/eventid";

jest.mock("../../../src/helpers/eventid");
const mockedEventIdHelper = eventIdHelper as jest.Mocked<typeof eventIdHelper>;

describe("EventProcessConsumer", () => {
    let eventProcessConsumer: EventProcessConsumer;
    let mockGameData: jest.Mocked<GameData>;
    let mockSchedulerConsumer: jest.Mocked<SchedulerConsumer>;
    let mockOddFeedConsumer: jest.Mocked<OddFeedConsumer>;
    let mockGameStatusPublisher: any;
    let mockContainer: any;

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockGameData = {
            oddFeedGames: {},
        } as any;

        mockSchedulerConsumer = {
            getSchedule: jest.fn(),
            schedule: jest.fn(),
        } as any;

        mockOddFeedConsumer = {
            getSchedule: jest.fn(),
            getEvent: jest.fn(),
        } as any;

        mockGameStatusPublisher = {
            publishOdds: jest.fn(),
        };

        mockContainer = {
            gameData: mockGameData,
            schedulerConsumer: mockSchedulerConsumer,
            oddFeedConsumer: mockOddFeedConsumer,
            gameStatusPublisher: mockGameStatusPublisher,
            appConfigs: {
                oddFeed: {
                    gameId: 123
                }
            }
        };

        eventProcessConsumer = new EventProcessConsumer(mockContainer);
    });

    describe("constructor", () => {
        it("should initialize with correct properties", () => {
            // Arrange & Act
            const consumer = new EventProcessConsumer(mockContainer);

            // Assert
            expect(consumer.gameData).toBe(mockGameData);
            expect(consumer.schedulerConsumer).toBe(mockSchedulerConsumer);
            expect(consumer.oddFeedConsumer).toBe(mockOddFeedConsumer);
            expect(consumer.gameStatusPublisher).toBe(mockGameStatusPublisher);
            expect(consumer.gameId).toBe(123);
        });
    });

    describe("proceed", () => {
        it("should process all events from schedule", async () => {
            // Arrange
            const mockSchedule: ScheduleResponseItem[] = [
                {
                    eventID: 12345,
                    eventNameAKey: "Team A",
                    eventNameBKey: "Team B",
                    scheduleStartTs: new Date(),
                    productCode: "SOCCER",
                    productTypeKey: "MATCH",
                },
                {
                    eventID: 67890,
                    eventNameAKey: "Team C",
                    eventNameBKey: "Team D",
                    scheduleStartTs: new Date(),
                    productCode: "SOCCER",
                    productTypeKey: "MATCH",
                },
            ];

            mockOddFeedConsumer.getSchedule.mockResolvedValue(mockSchedule);

            // Act
            await eventProcessConsumer.proceed();

            // Assert
            expect(mockOddFeedConsumer.getSchedule).toHaveBeenCalled();
        });
    });

    describe("processEvent", () => {
        it("should process event and store in gameData", async () => {
            // Arrange
            const mockEvent: ScheduleResponseItem = {
                eventID: 12345,
                eventNameAKey: "Team A",
                eventNameBKey: "Team B",
                scheduleStartTs: new Date(Date.now() + 60000), // Future date
                productCode: "SOCCER",
                productTypeKey: "MATCH",
            };

            const mockFullEvent: EventResponse = {
                eventID: 12345,
                eventNameAKey: "Team A",
                eventNameBKey: "Team B",
                scheduleStartTs: new Date(),
                productCode: "SOCCER",
                productTypeKey: "MATCH",
                eventDetails: [],
            };

            mockedEventIdHelper.extractGameId.mockReturnValue(123);
            mockedEventIdHelper.extractRoundId.mockReturnValue(45);
            mockOddFeedConsumer.getEvent.mockResolvedValue(mockFullEvent);

            // Act
            await (eventProcessConsumer as any).processEvent(mockEvent);

            // Assert
            expect(mockOddFeedConsumer.getEvent).toHaveBeenCalledWith({ eventID: 12345 });
            expect(mockedEventIdHelper.extractGameId).toHaveBeenCalledWith(12345);
            expect(mockedEventIdHelper.extractRoundId).toHaveBeenCalledWith(12345);
            expect(mockGameData.oddFeedGames[123].rounds[45]).toBe(mockFullEvent);
        });

        it("should create new game entry if game does not exist", async () => {
            // Arrange
            const mockEvent: ScheduleResponseItem = {
                eventID: 12345,
                eventNameAKey: "Team A",
                eventNameBKey: "Team B",
                scheduleStartTs: new Date(Date.now() + 60000), // Future date
                productCode: "SOCCER",
                productTypeKey: "MATCH",
            };

            const mockFullEvent: EventResponse = {
                eventID: 12345,
                eventNameAKey: "Team A",
                eventNameBKey: "Team B",
                scheduleStartTs: new Date(),
                productCode: "SOCCER",
                productTypeKey: "MATCH",
                eventDetails: [],
            };

            mockedEventIdHelper.extractGameId.mockReturnValue(123); // Use the configured gameId
            mockedEventIdHelper.extractRoundId.mockReturnValue(45);
            mockOddFeedConsumer.getEvent.mockResolvedValue(mockFullEvent);

            // Act
            await (eventProcessConsumer as any).processEvent(mockEvent);

            // Assert
            expect(mockGameData.oddFeedGames[123].rounds[45]).toBe(mockFullEvent);
        });

        it("should add round to existing game if game exists", async () => {
            // Arrange
            const mockEvent: ScheduleResponseItem = {
                eventID: 12345,
                eventNameAKey: "Team A",
                eventNameBKey: "Team B",
                scheduleStartTs: new Date(Date.now() + 60000), // Future date
                productCode: "SOCCER",
                productTypeKey: "MATCH",
            };

            const mockFullEvent: EventResponse = {
                eventID: 12345,
                eventNameAKey: "Team A",
                eventNameBKey: "Team B",
                scheduleStartTs: new Date(),
                productCode: "SOCCER",
                productTypeKey: "MATCH",
                eventDetails: [],
            };

            mockGameData.oddFeedGames[123] = {
                rounds: { 10: {} as EventResponse },
            };

            mockedEventIdHelper.extractGameId.mockReturnValue(123);
            mockedEventIdHelper.extractRoundId.mockReturnValue(45);
            mockOddFeedConsumer.getEvent.mockResolvedValue(mockFullEvent);

            // Act
            await (eventProcessConsumer as any).processEvent(mockEvent);

            // Assert
            expect(mockGameData.oddFeedGames[123].rounds[45]).toBe(mockFullEvent);
        });

        it("should skip event if gameId does not match", async () => {
            // Arrange
            const mockEvent: ScheduleResponseItem = {
                eventID: 12345,
                eventNameAKey: "Team A",
                eventNameBKey: "Team B",
                scheduleStartTs: new Date(Date.now() + 60000),
                productCode: "SOCCER",
                productTypeKey: "MATCH",
            };

            mockedEventIdHelper.extractGameId.mockReturnValue(999); // Different gameId

            // Act
            await (eventProcessConsumer as any).processEvent(mockEvent);

            // Assert
            expect(mockOddFeedConsumer.getEvent).not.toHaveBeenCalled();
        });

        it("should skip event if it is in the past", async () => {
            // Arrange
            const mockEvent: ScheduleResponseItem = {
                eventID: 12345,
                eventNameAKey: "Team A",
                eventNameBKey: "Team B",
                scheduleStartTs: new Date(Date.now() - 60000), // Past date
                productCode: "SOCCER",
                productTypeKey: "MATCH",
            };

            mockedEventIdHelper.extractGameId.mockReturnValue(123);

            // Act
            await (eventProcessConsumer as any).processEvent(mockEvent);

            // Assert
            expect(mockOddFeedConsumer.getEvent).not.toHaveBeenCalled();
        });

        it("should skip event if round already exists", async () => {
            // Arrange
            const mockEvent: ScheduleResponseItem = {
                eventID: 12345,
                eventNameAKey: "Team A",
                eventNameBKey: "Team B",
                scheduleStartTs: new Date(Date.now() + 60000),
                productCode: "SOCCER",
                productTypeKey: "MATCH",
            };

            mockGameData.oddFeedGames[123] = {
                rounds: { 45: {} as EventResponse },
            };

            mockedEventIdHelper.extractGameId.mockReturnValue(123);
            mockedEventIdHelper.extractRoundId.mockReturnValue(45);

            // Act
            await (eventProcessConsumer as any).processEvent(mockEvent);

            // Assert
            expect(mockOddFeedConsumer.getEvent).not.toHaveBeenCalled();
        });
    });
});
