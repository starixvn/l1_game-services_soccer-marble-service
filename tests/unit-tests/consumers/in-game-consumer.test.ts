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
        
        // Setup BetStatusService payload mock
        let payloadValue: any = {
            odds: { home: 1.5, away: 2 },
            points: { home: 1.2, away: 2.3 },
            index: 0,
        };
        Object.defineProperty(mockBetStatusService, "payload", {
            configurable: true,
            get: () => payloadValue,
            set: (value: any) => {
                payloadValue = value;
            },
        });
        
        // Setup allowBets mock
        let allowBetsValue = true;
        Object.defineProperty(mockBetStatusService, "allowBets", {
            configurable: true,
            get: () => allowBetsValue,
            set: (value: boolean) => {
                allowBetsValue = value;
            },
        });
        
        // Keep odds getter for backward compatibility in tests
        Object.defineProperty(mockBetStatusService, "odds", {
            configurable: true,
            get: () => payloadValue.odds,
        });

        // Setup StreamingService mock
        Object.defineProperty(mockStreamingService, "currentPlaylist", {
            configurable: true,
            get: () => "test-playlist",
        });

        // Create container with all dependencies
        const container = {
            definition: mockDefinition,
            gameData: mockGameData,
            roundQuery,
            publisher,
            getBalance: mockGetBalance,
            gameManagementApiClientFactory,
            betStatusService: mockBetStatusService,
            currentEventService: mockCurrentEventService,
            streamingService: mockStreamingService,
        };

        // Create the instance
        inGameConsumer = new InGameConsumer(container);
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
        it("should build payload with userBetPercentage, match, playlist, and spb when allowBets is true", async () => {
            // Arrange
            const mockRealPlayer = { UID: DEFAULT_PLAYER_UID };
            const mockSuperPayload = { existingProperty: "value" };
            const mockUserBetPercentage = { home: 50, away: 30, draw: 20 };

            mockGameData.playerBetCount = { home: ["player1"], away: ["player2"] };
            Object.defineProperty(mockBetStatusService, "payload", {
                configurable: true,
                get: () => ({
                    odds: { home: 1.5, away: 2 },
                    points: { home: 1.2, away: 2.3 },
                    index: 0,
                }),
            });
            Object.defineProperty(mockBetStatusService, "allowBets", {
                configurable: true,
                get: () => true,
            });
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
                odds: { home: 1.5, away: 2 },
                points: { home: 1.2, away: 2.3 },
                index: 0,
                userBetPercentage: mockUserBetPercentage,
                match: { home: "Team A", away: "Team B" },
                playlist: "test-playlist",
                spb: true,
            });
            expect(result.epb).toBeUndefined();
        });

        it("should build payload with epb when allowBets is false", async () => {
            // Arrange
            const mockRealPlayer = { UID: DEFAULT_PLAYER_UID };
            const mockSuperPayload = { existingProperty: "value" };
            const mockUserBetPercentage = { home: 50, away: 30 };

            mockGameData.playerBetCount = { home: ["player1"], away: ["player2"] };
            Object.defineProperty(mockBetStatusService, "payload", {
                configurable: true,
                get: () => ({
                    odds: { home: 1.5, away: 2 },
                    points: { home: 1.2, away: 2.3 },
                    index: 0,
                }),
            });
            Object.defineProperty(mockBetStatusService, "allowBets", {
                configurable: true,
                get: () => false,
            });
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
                odds: { home: 1.5, away: 2 },
                points: { home: 1.2, away: 2.3 },
                index: 0,
                userBetPercentage: mockUserBetPercentage,
                match: { home: "Team A", away: "Team B" },
                playlist: "test-playlist",
                epb: true,
            });
            expect(result.spb).toBeUndefined();
        });

        it("should include previousOdds in payload when currentIndex > 0", async () => {
            // Arrange
            const mockRealPlayer = { UID: DEFAULT_PLAYER_UID };
            const mockSuperPayload = { existingProperty: "value" };
            const mockUserBetPercentage = { home: 50, away: 30 };

            mockGameData.playerBetCount = { home: ["player1"], away: ["player2"] };
            Object.defineProperty(mockBetStatusService, "payload", {
                configurable: true,
                get: () => ({
                    odds: { home: 1.5, away: 2 },
                    points: { home: 1.2, away: 2.3 },
                    index: 1,
                    previousOdds: { home: 1.8, away: 2.2 },
                }),
            });
            Object.defineProperty(mockBetStatusService, "allowBets", {
                configurable: true,
                get: () => true,
            });
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
            expect(result).toEqual({
                ...mockSuperPayload,
                odds: { home: 1.5, away: 2 },
                points: { home: 1.2, away: 2.3 },
                index: 1,
                previousOdds: { home: 1.8, away: 2.2 },
                userBetPercentage: mockUserBetPercentage,
                match: { home: "Team A", away: "Team B" },
                playlist: "test-playlist",
                spb: true,
            });
        });
    });
});
