import GameCron from "../../../src/crons/game-cron";
import GameData from "../../../src/game-data";
import GameDefinition from "../../../src/game-definition";
import AppConfigs from "../../../src/app-configs";
import { TournamentConsumer } from "../../../src/consumers";
import GameStatusPublisher from "../../../src/publishers/game-status-publisher";
import RunningRoundInfoPublisher from "../../../src/publishers/running-round-info-publisher";
import CacheConsumer from "../../../src/consumers/cache-consumer";
import { EventProcessConsumer } from "../../../src/consumers/event-process-consumer";
import { Table } from "sc-game-base";

jest.mock("sc-game-base");

describe("GameCron", () => {
    let gameCron: GameCron;
    let mockGameData: jest.Mocked<GameData>;
    let mockGameDefinition: jest.Mocked<GameDefinition>;
    let mockAppConfigs: jest.Mocked<typeof AppConfigs>;
    let mockGameStatusPublisher: jest.Mocked<GameStatusPublisher>;
    let mockRunningRoundInfoPublisher: jest.Mocked<RunningRoundInfoPublisher>;
    let mockTournamentConsumer: jest.Mocked<TournamentConsumer>;
    let mockCacheConsumer: jest.Mocked<CacheConsumer>;
    let mockEventProcessConsumer: jest.Mocked<EventProcessConsumer>;
    let mockContainer: {
        gameData: jest.Mocked<GameData>;
        definition: jest.Mocked<GameDefinition>;
        appConfigs: jest.Mocked<typeof AppConfigs>;
        gameStatusPublisher: jest.Mocked<GameStatusPublisher>;
        runningRoundInfoPublisher: jest.Mocked<RunningRoundInfoPublisher>;
        tournamentConsumer: jest.Mocked<TournamentConsumer>;
        cacheConsumer: jest.Mocked<CacheConsumer>;
        eventProcessConsumer: jest.Mocked<EventProcessConsumer>;
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockGameData = {
            liveStreamServer: "",
            gameId: 0,
            remainingTime: 0
        } as unknown as jest.Mocked<GameData>;

        mockGameDefinition = {} as unknown as jest.Mocked<GameDefinition>;

        mockAppConfigs = {
            liveStreamServer: "test-server",
            oddFeed: {
                gameId: 123
            }
        } as unknown as jest.Mocked<typeof AppConfigs>;

        mockGameStatusPublisher = {
            publishDisableGameStatus: jest.fn(),
            publishEnablingGameStatus: jest.fn(),
            publishStartGame: jest.fn(),
            publishBoostedOdds: jest.fn(),
            publishOdds: jest.fn(),
            publishStartPlacingBetStatus: jest.fn(),
            publishEndPlacingBetStatus: jest.fn(),
            publishApiError: jest.fn()
        } as unknown as jest.Mocked<GameStatusPublisher>;

        mockRunningRoundInfoPublisher = {
            publishToAllUsers: jest.fn(),
            publish: jest.fn(),
            publishBetPercentage: jest.fn(),
            gameName: "test-game",
            gameData: mockGameData,
            publishToUser: jest.fn(),
            publishToUsers: jest.fn(),
            publishToTable: jest.fn(),
            publishToTableExcept: jest.fn(),
            publishApiError: jest.fn()
        } as unknown as jest.Mocked<RunningRoundInfoPublisher>;

        mockTournamentConsumer = {
            getCurrentTournament: jest.fn(),
            getLastTournament: jest.fn(),
            getTournamentConfigs: jest.fn(),
            updateMatchResult: jest.fn(),
            updateNext: jest.fn(),
            generate: jest.fn(),
            isHomeUpcoming: jest.fn()
        } as unknown as jest.Mocked<TournamentConsumer>;

        mockCacheConsumer = {
            proceed: jest.fn()
        } as unknown as jest.Mocked<CacheConsumer>;

        mockEventProcessConsumer = {
            proceed: jest.fn(),
            updateAndGetRemainingTime: jest.fn()
        } as unknown as jest.Mocked<EventProcessConsumer>;

        mockContainer = {
            gameData: mockGameData,
            definition: mockGameDefinition,
            appConfigs: mockAppConfigs,
            gameStatusPublisher: mockGameStatusPublisher,
            runningRoundInfoPublisher: mockRunningRoundInfoPublisher,
            tournamentConsumer: mockTournamentConsumer,
            cacheConsumer: mockCacheConsumer,
            eventProcessConsumer: mockEventProcessConsumer
        };

        // Mock the parent class constructor to properly set up properties
        (Table.Crons.TableGameCron as jest.MockedClass<typeof Table.Crons.TableGameCron>).mockImplementation(function(this: any, container: any) {
            this.gameData = container.gameData;
            this.definition = container.definition;
            this.appConfigs = container.appConfigs;
            this.gameStatusPublisher = container.gameStatusPublisher;
            this.runningRoundInfoPublisher = container.runningRoundInfoPublisher;
            this.startCron = jest.fn();
            this.checkGameStatus = jest.fn();
            return this;
        });

        gameCron = new GameCron(mockContainer);
    });

    describe("constructor", () => {
        it("should initialize with correct properties", () => {
            // Arrange & Act are done in beforeEach

            // Assert
            expect(gameCron.gameData.liveStreamServer).toBe("test-server");
            expect(gameCron.tournamentConsumer).toBe(mockTournamentConsumer);
            expect(gameCron.cacheConsumer).toBe(mockCacheConsumer);
            expect(gameCron.eventProcessConsumer).toBe(mockEventProcessConsumer);
            expect(gameCron.eventPullCounter).toBe(60);
        });
    });

    describe("start", () => {
        it("should start the cron", async () => {
            // Arrange
            const mockStartCron = jest.fn();
            gameCron.startCron = mockStartCron;

            // Act
            await gameCron.start();

            // Assert
            expect(mockStartCron).toHaveBeenCalledTimes(1);
        });
    });

    describe("proceed", () => {
        describe("interval passed", () => {
            it("should execute full proceed logic when counter reaches interval", async () => {
                // Arrange
                gameCron.eventPullCounter = 60;
                const mockCheckGameStatus = jest.fn();
                gameCron.checkGameStatus = mockCheckGameStatus;

                // Act
                await gameCron.proceed();

                // Assert
                expect(mockCheckGameStatus).toHaveBeenCalledTimes(1);
                expect(mockGameData.gameId).toBe(123);
                expect(mockEventProcessConsumer.proceed).toHaveBeenCalledTimes(1);
                expect(mockEventProcessConsumer.updateAndGetRemainingTime).toHaveBeenCalledTimes(1);
                expect(gameCron.eventPullCounter).toBe(1);
            });
        });

        describe("interval not passed", () => {
            it("should only update remaining time and increment counter when interval not reached", async () => {
                // Arrange
                gameCron.eventPullCounter = 30;
                const mockCheckGameStatus = jest.fn();
                gameCron.checkGameStatus = mockCheckGameStatus;

                // Act
                await gameCron.proceed();

                // Assert
                expect(mockCheckGameStatus).not.toHaveBeenCalled();
                expect(mockEventProcessConsumer.proceed).not.toHaveBeenCalled();
                expect(mockEventProcessConsumer.updateAndGetRemainingTime).toHaveBeenCalledTimes(1);
                expect(gameCron.eventPullCounter).toBe(31);
            });
        });

        describe("counter increment", () => {
            it("should increment counter after each proceed call", async () => {
                // Arrange
                gameCron.eventPullCounter = 0;

                // Act
                await gameCron.proceed();

                // Assert
                expect(gameCron.eventPullCounter).toBe(1);
            });

            it("should reset counter to 0 after interval is reached", async () => {
                // Arrange
                gameCron.eventPullCounter = 60;
                const mockCheckGameStatus = jest.fn();
                gameCron.checkGameStatus = mockCheckGameStatus;

                // Act
                await gameCron.proceed();

                // Assert
                expect(gameCron.eventPullCounter).toBe(1);
            });
        });

        describe("game status check", () => {
            it("should call checkGameStatus when interval is reached", async () => {
                // Arrange
                gameCron.eventPullCounter = 60;
                const mockCheckGameStatus = jest.fn();
                gameCron.checkGameStatus = mockCheckGameStatus;

                // Act
                await gameCron.proceed();

                // Assert
                expect(mockCheckGameStatus).toHaveBeenCalledTimes(1);
            });

            it("should not call checkGameStatus when interval is not reached", async () => {
                // Arrange
                gameCron.eventPullCounter = 30;
                const mockCheckGameStatus = jest.fn();
                gameCron.checkGameStatus = mockCheckGameStatus;

                // Act
                await gameCron.proceed();

                // Assert
                expect(mockCheckGameStatus).not.toHaveBeenCalled();
            });
        });

        describe("event process consumer calls", () => {
            it("should call eventProcessConsumer.proceed when interval is reached", async () => {
                // Arrange
                gameCron.eventPullCounter = 60;
                const mockCheckGameStatus = jest.fn();
                gameCron.checkGameStatus = mockCheckGameStatus;

                // Act
                await gameCron.proceed();

                // Assert
                expect(mockEventProcessConsumer.proceed).toHaveBeenCalledTimes(1);
            });

            it("should always call eventProcessConsumer.updateAndGetRemainingTime", async () => {
                // Arrange
                gameCron.eventPullCounter = 30;

                // Act
                await gameCron.proceed();

                // Assert
                expect(mockEventProcessConsumer.updateAndGetRemainingTime).toHaveBeenCalledTimes(1);
            });
        });

        describe("game data updates", () => {
            it("should update gameId when interval is reached", async () => {
                // Arrange
                gameCron.eventPullCounter = 60;
                const mockCheckGameStatus = jest.fn();
                gameCron.checkGameStatus = mockCheckGameStatus;

                // Act
                await gameCron.proceed();

                // Assert
                expect(mockGameData.gameId).toBe(123);
            });

            it("should not update gameId when interval is not reached", async () => {
                // Arrange
                gameCron.eventPullCounter = 30;
                const originalGameId = mockGameData.gameId;

                // Act
                await gameCron.proceed();

                // Assert
                expect(mockGameData.gameId).toBe(originalGameId);
            });
        });
    });
});