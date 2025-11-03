import { Table } from "sc-game-base";
import InGameConsumer from "../../../src/consumers/in-game-consumer";
import GameData from "../../../src/game-data";
import { BetStatusService } from "../../../src/features/bet-status/bet-status-service";
import { CurrentEventService } from "../../../src/features/current-event/current-event-service";
import { GameFlow, GameFlowService } from "../../../src/features/game-flow/game-flow-service";
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
    let mockGameFlowService: GameFlowService;

    beforeEach(() => {
        // Create mocks
        mockGameData = stub<GameData>();
        mockDefinition = stub<any>();
        mockGetBalance = jest.fn();
        mockBetStatusService = stub<BetStatusService>();
        mockCurrentEventService = stub<CurrentEventService>();
        mockGameFlowService = stub<GameFlowService>();

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
            mockGameFlowService
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
            expect(inGameConsumer.gameFlowService).toBe(mockGameFlowService);
        });

        it("should extend TableInGameConsumer", () => {
            // Assert
            expect(inGameConsumer).toBeInstanceOf(Table.EventConsumers.TableInGameConsumer);
        });
    });

    describe("consume", () => {
        it("should call super.consume and all publisher methods", async () => {
            // Arrange
            const mockRealPlayer = { UID: DEFAULT_PLAYER_UID };
            const superConsumeSpy = jest
                .spyOn(Table.EventConsumers.TableInGameConsumer.prototype, "consume")
                .mockResolvedValue();
            
            const publishOddsSpy = jest.spyOn(inGameConsumer, "publishOddsToPlayer").mockImplementation();
            const publishBetChoicePointsSpy = jest.spyOn(inGameConsumer, "publishBetChoicePointsToPlayer").mockImplementation();
            const publishMatchSpy = jest.spyOn(inGameConsumer, "publishMatchToPlayer").mockImplementation();
            const publishGameFlowSpy = jest.spyOn(inGameConsumer, "publishCurrentGameFlowToPlayer").mockImplementation();

            // Act
            await inGameConsumer.consume(mockRealPlayer);

            // Assert
            expect(superConsumeSpy).toHaveBeenCalledWith(mockRealPlayer);
            expect(publishOddsSpy).toHaveBeenCalledWith(DEFAULT_PLAYER_UID);
            expect(publishBetChoicePointsSpy).toHaveBeenCalledWith(DEFAULT_PLAYER_UID);
            expect(publishMatchSpy).toHaveBeenCalledWith(DEFAULT_PLAYER_UID);
            expect(publishGameFlowSpy).toHaveBeenCalledWith(DEFAULT_PLAYER_UID);
        });

        it("should handle errors gracefully without throwing", async () => {
            // Arrange
            const mockRealPlayer = { UID: DEFAULT_PLAYER_UID };
            const superConsumeSpy = jest
                .spyOn(Table.EventConsumers.TableInGameConsumer.prototype, "consume")
                .mockResolvedValue();
            
            jest.spyOn(inGameConsumer, "publishOddsToPlayer").mockImplementation(() => {
                throw new Error("Test error");
            });

            // Act & Assert
            await expect(inGameConsumer.consume(mockRealPlayer)).resolves.not.toThrow();
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
            (mockBetStatusService as any).dynamicOddsByGameId = { "10": { home: 1.5, away: 2.0 } };
            (mockGameData as any).roundId = 1 as any;

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
            });
        });
    });

    describe("publishOddsToPlayer", () => {
        it("should publish odds to the specified player", () => {
            // Arrange
            const testUID = DEFAULT_PLAYER_UID;
            const mockOdds = { home: 1.5, away: 2.0, draw: 3.0 };
            const mockBetStatus = { odds: mockOdds, points: {}, currentIndex: 0 };

            (mockBetStatusService.getBetStatus as jest.Mock).mockReturnValue(mockBetStatus);

            // Act
            inGameConsumer.publishOddsToPlayer(testUID);

            // Assert
            expect(mockBetStatusService.getBetStatus).toHaveBeenCalled();
            expect(publisher.publishToUser).toHaveBeenCalledWith(testUID, { odds: mockOdds });
        });
    });

    describe("publishBetChoicePointsToPlayer", () => {
        it("should publish points to the specified player", () => {
            // Arrange
            const testUID = "test-player-456";
            const mockPoints = { home: 10, away: 20, draw: 30 };
            const mockBetStatus = { odds: {}, points: mockPoints, currentIndex: 0 };

            (mockBetStatusService.getBetStatus as jest.Mock).mockReturnValue(mockBetStatus);

            // Act
            inGameConsumer.publishBetChoicePointsToPlayer(testUID);

            // Assert
            expect(mockBetStatusService.getBetStatus).toHaveBeenCalled();
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
            const mockBetStatus = { odds: {}, points: {}, currentIndex: mockCurrentIndex };

            (mockBetStatusService.getBetStatus as jest.Mock).mockReturnValue(mockBetStatus);

            // Act
            inGameConsumer.publishCurrentIndexToPlayer(testUID);

            // Assert
            expect(mockBetStatusService.getBetStatus).toHaveBeenCalled();
            expect(publisher.publishToUser).toHaveBeenCalledWith(testUID, { currentIndex: mockCurrentIndex });
        });
    });

    describe("publishCurrentGameFlowToPlayer", () => {
        it("should publish current game flow payload to the specified player", () => {
            // Arrange
            const testUID = "test-player-202";
            mockGameData.roundId = 123 as any;
            (mockGameFlowService.getCurrentGameFlow as jest.Mock).mockReturnValue({ gameFlow: GameFlow.Start });

            // Act
            inGameConsumer.publishCurrentGameFlowToPlayer(testUID);

            // Assert
            expect(mockGameFlowService.getCurrentGameFlow).toHaveBeenCalled();
            expect(publisher.publishToUser).toHaveBeenCalledWith(testUID, { gameFlow: GameFlow.Start });
        });
    });
});
