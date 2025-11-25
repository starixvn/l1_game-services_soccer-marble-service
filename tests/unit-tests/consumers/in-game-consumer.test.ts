import { Table } from "sc-game-base";
import InGameConsumer from "../../../src/consumers/in-game-consumer";
import GameData from "../../../src/game-data";
import { BetStatusService } from "../../../src/features/bet-status/bet-status-service";
import { CurrentEventService } from "../../../src/features/current-event/current-event-service";
import { StreamingService } from "../../../src/features/streaming-service/streaming-service";
import { getUserBetPercentage } from "../../../src/helpers/bet-percentage";
jest.mock("../../../src/helpers/eventid", () => ({
    extractGameId: jest.fn(() => 10),
}));
import {
    gameManagementApiClientFactory,
    publisher,
    roundQuery,
} from "../global-stubs";
import { mock as stub } from "jest-mock-extended";

// Mock the getUserBetPercentage helper
jest.mock("../../../src/helpers/bet-percentage", () => ({
    getUserBetPercentage: jest.fn(),
}));

const mockedGetUserBetPercentage = jest.mocked(getUserBetPercentage);
const DEFAULT_PLAYER_UID = "test-player-123";

describe("InGameConsumer", () => {
    let inGameConsumer: InGameConsumer;
    let mockGameData: GameData;
    let mockDefinition: any;
    let mockGetBalance: any;
    let mockBetStatusService: BetStatusService;
    let mockCurrentEventService: CurrentEventService;
    let mockStreamingService: StreamingService;

    beforeEach(() => {
        // Create mocks
        mockGameData = stub<GameData>();
        mockDefinition = stub<any>();
        mockGetBalance = jest.fn();
        mockBetStatusService = stub<BetStatusService>();
        mockCurrentEventService = stub<CurrentEventService>();
        mockStreamingService = stub<StreamingService>();
        let oddsValue: Record<string, number> = { home: 1.5, away: 2 };
        Object.defineProperty(mockBetStatusService, "odds", {
            configurable: true,
            get: () => oddsValue,
            set: (value: Record<string, number>) => {
                oddsValue = value;
            },
        });
        let pointsValue: Record<string, number> = { home: 1.2, away: 2.3 };
        Object.defineProperty(mockBetStatusService, "points", {
            configurable: true,
            get: () => pointsValue,
            set: (value: Record<string, number>) => {
                pointsValue = value;
            },
        });
        let currentIndexValue = 0;
        Object.defineProperty(mockBetStatusService, "currentIndex", {
            configurable: true,
            get: () => currentIndexValue,
            set: (value: number) => {
                currentIndexValue = value;
            },
        });

        // Setup StreamingService mock
        Object.defineProperty(mockStreamingService, "currentPlaylist", {
            configurable: true,
            get: () => "test-playlist",
        });

        // Create the instance
        inGameConsumer = new InGameConsumer(
            mockDefinition,
            mockGameData,
            roundQuery,
            publisher,
            mockGetBalance,
            gameManagementApiClientFactory,
            mockBetStatusService,
            mockCurrentEventService,
            mockStreamingService,
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("constructor", () => {
        it("should initialize with the provided dependencies", () => {
            // Assert
            expect(inGameConsumer.gameData).toBe(mockGameData);
            expect(inGameConsumer.betStatusService).toBe(mockBetStatusService);
            expect(inGameConsumer.currentEventService).toBe(mockCurrentEventService);
            expect(inGameConsumer.streamingService).toBe(mockStreamingService);
        });

        it("should extend TableInGameConsumer", () => {
            // Assert
            expect(inGameConsumer).toBeInstanceOf(Table.EventConsumers.TableInGameConsumer);
        });
    });

    describe("consume", () => {
        it("should call super.consume", async () => {
            // Arrange
            const mockRealPlayer = { UID: DEFAULT_PLAYER_UID };
            const superConsumeSpy = jest
                .spyOn(Table.EventConsumers.TableInGameConsumer.prototype, "consume")
                .mockResolvedValue();

            // Act
            await inGameConsumer.consume(mockRealPlayer);

            // Assert
            expect(superConsumeSpy).toHaveBeenCalledWith(mockRealPlayer);
        });

        it("should handle errors gracefully without throwing", async () => {
            // Arrange
            const mockRealPlayer = { UID: DEFAULT_PLAYER_UID };
            const superConsumeSpy = jest
                .spyOn(Table.EventConsumers.TableInGameConsumer.prototype, "consume")
                .mockRejectedValue(new Error("Test error"));

            // Act & Assert
            await expect(inGameConsumer.consume(mockRealPlayer)).rejects.toThrow("Test error");
            expect(superConsumeSpy).toHaveBeenCalledWith(mockRealPlayer);
        });
    });

    describe("buildPayload", () => {
        it("should build payload with userBetPercentage (based on dynamicOdds keys) and videoResult", async () => {
            // Arrange
            const mockRealPlayer = { UID: DEFAULT_PLAYER_UID };
            const mockSuperPayload = { existingProperty: "value" };
            const mockUserBetPercentage = { home: 50, away: 30, draw: 20 };

            mockGameData.playerBetCount = { home: ["player1"], away: ["player2"] };
            (mockBetStatusService as any).odds = { home: 1.5, away: 2 };
            (mockGameData as any).roundId = 1 as any;
            
            const mockCurrentEvent = {
                eventNameAKey: "Team A",
                eventNameBKey: "Team B",
            };
            (mockCurrentEventService.getCurrentEvent as jest.Mock).mockReturnValue(mockCurrentEvent);

            const superBuildPayloadSpy = jest
                .spyOn(Table.EventConsumers.TableInGameConsumer.prototype, "buildPayload")
                .mockResolvedValue(mockSuperPayload);

            mockedGetUserBetPercentage.mockReturnValue(mockUserBetPercentage);

            // Act
            const result = await inGameConsumer.buildPayload(mockRealPlayer);

            // Assert
            expect(superBuildPayloadSpy).toHaveBeenCalledWith(mockRealPlayer);
            expect(mockedGetUserBetPercentage).toHaveBeenCalledWith(mockGameData.playerBetCount, ["home", "away"]);
            expect(result).toEqual({
                ...mockSuperPayload,
                userBetPercentage: mockUserBetPercentage,
                odds: { home: 1.5, away: 2 },
                points: { home: 1.2, away: 2.3 },
                index: 0,
                match: { home: "Team A", away: "Team B" },
                playlist: "test-playlist",
            });
        });
    });

    describe("publishOddsToPlayer", () => {
        it("should publish odds to the specified player", () => {
            // Arrange
            const testUID = DEFAULT_PLAYER_UID;
            const mockOdds = { home: 1.5, away: 2, draw: 3     };
            (mockBetStatusService as any).odds = mockOdds;

            // Act
            inGameConsumer.publishOddsToPlayer(testUID);

            // Assert
            expect(publisher.publishToUser).toHaveBeenCalledWith(testUID, { odds: mockOdds });
        });
    });

    describe("publishBetChoicePointsToPlayer", () => {
        it("should publish points to the specified player", () => {
            // Arrange
            const testUID = "test-player-456";
            const mockPoints = { home: 10, away: 20, draw: 30 };
            (mockBetStatusService as any).points = mockPoints;

            // Act
            inGameConsumer.publishBetChoicePointsToPlayer(testUID);

            // Assert
            expect(publisher.publishToUser).toHaveBeenCalledWith(testUID, { points: mockPoints });
        });
    });

    describe("publishMatchToPlayer", () => {
        it("should publish match data to the specified player", () => {
            // Arrange
            const testUID = "test-player-789";
            const mockCurrentEvent = {
                eventNameAKey: "Team A",
                eventNameBKey: "Team B",
            };

            (mockCurrentEventService.getCurrentEvent as jest.Mock).mockReturnValue(mockCurrentEvent);

            // Act
            inGameConsumer.publishMatchToPlayer(testUID);

            // Assert
            expect(mockCurrentEventService.getCurrentEvent).toHaveBeenCalled();
            expect(publisher.publishToUser).toHaveBeenCalledWith(testUID, {
                match: { home: "Team A", away: "Team B" }
            });
        });
    });

    describe("publishCurrentIndexToPlayer", () => {
        it("should publish current index to the specified player", () => {
            // Arrange
            const testUID = "test-player-101";
            const mockCurrentIndex = 2;
            (mockBetStatusService as any).currentIndex = mockCurrentIndex;

            // Act
            inGameConsumer.publishCurrentIndexToPlayer(testUID);

            // Assert
            expect(publisher.publishToUser).toHaveBeenCalledWith(testUID, { currentIndex: mockCurrentIndex });
        });
    });
});
