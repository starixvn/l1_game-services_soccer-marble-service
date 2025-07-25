import GameCron from "../../../src/crons/game-cron";
import GameData from "../../../src/game-data";
import GameDefinition from "../../../src/game-definition";
import AppConfigs from "../../../src/app-configs";
import GameStatusPublisher from "../../../src/publishers/game-status-publisher";
import RunningRoundInfoPublisher from "../../../src/publishers/running-round-info-publisher";
import CacheConsumer from "../../../src/consumers/cache-consumer";
import { EventProcessConsumer } from "../../../src/consumers/event-process-consumer";
import RoundIdConsumer from "../../../src/consumers/round-id-consumer";
import { UnsettledRoundConsumer } from "../../../src/consumers";
import { Table } from "sc-game-base";
import * as gameTimingHelper from "../../../src/helpers/game-timing";
import * as gameManagementApi from "sc-game-base/src/core/game-management-api";

jest.mock("sc-game-base");
jest.mock("../../../src/helpers/game-timing");
jest.mock("sc-game-base/src/core/game-management-api");

const mockedGameTimingHelper = gameTimingHelper as jest.Mocked<typeof gameTimingHelper>;
const mockedGameManagementApi = gameManagementApi as jest.Mocked<typeof gameManagementApi>;

describe("GameCron", () => {
    let gameCron: GameCron;
    let mockGameData: jest.Mocked<GameData>;
    let mockGameDefinition: jest.Mocked<GameDefinition>;
    let mockAppConfigs: jest.Mocked<typeof AppConfigs>;
    let mockGameStatusPublisher: jest.Mocked<GameStatusPublisher>;
    let mockRunningRoundInfoPublisher: jest.Mocked<RunningRoundInfoPublisher>;
    let mockCacheConsumer: jest.Mocked<CacheConsumer>;
    let mockEventProcessConsumer: jest.Mocked<EventProcessConsumer>;
    let mockRoundIdConsumer: jest.Mocked<RoundIdConsumer>;
    let mockUnsettledRoundConsumer: jest.Mocked<UnsettledRoundConsumer>;
    let mockBot: any;
    let mockContainer: {
        gameData: jest.Mocked<GameData>;
        definition: jest.Mocked<GameDefinition>;
        appConfigs: jest.Mocked<typeof AppConfigs>;
        gameStatusPublisher: jest.Mocked<GameStatusPublisher>;
        runningRoundInfoPublisher: jest.Mocked<RunningRoundInfoPublisher>;
        cacheConsumer: jest.Mocked<CacheConsumer>;
        eventProcessConsumer: jest.Mocked<EventProcessConsumer>;
        roundIdConsumer: jest.Mocked<RoundIdConsumer>;
        unsettledRoundConsumer: jest.Mocked<UnsettledRoundConsumer>;
        bot?: any;
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockGameData = {
            liveStreamServer: "",
            gameId: 0,
            remainingTime: 0,
            proceedEvent: false,
            disabled: false,
            delayStartTime: 0,
            gameConfigs: { enabled: true, exchangeReload: false },
            oddFeedGames: {}
        } as unknown as jest.Mocked<GameData>;

        mockGameDefinition = {
            configName: "test-config",
            name: "test-game"
        } as unknown as jest.Mocked<GameDefinition>;

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

        mockCacheConsumer = {
            proceed: jest.fn()
        } as unknown as jest.Mocked<CacheConsumer>;

        mockEventProcessConsumer = {
            proceed: jest.fn(),
            updateRemainingTime: jest.fn().mockReturnValue(100),
            init: jest.fn()
        } as unknown as jest.Mocked<EventProcessConsumer>;

        mockRoundIdConsumer = {
            queryLastRound: jest.fn()
        } as unknown as jest.Mocked<RoundIdConsumer>;

        mockUnsettledRoundConsumer = {
            proceed: jest.fn()
        } as unknown as jest.Mocked<UnsettledRoundConsumer>;

        mockBot = { run: jest.fn() };

        mockContainer = {
            gameData: mockGameData,
            definition: mockGameDefinition,
            appConfigs: mockAppConfigs,
            gameStatusPublisher: mockGameStatusPublisher,
            runningRoundInfoPublisher: mockRunningRoundInfoPublisher,
            cacheConsumer: mockCacheConsumer,
            eventProcessConsumer: mockEventProcessConsumer,
            roundIdConsumer: mockRoundIdConsumer,
            unsettledRoundConsumer: mockUnsettledRoundConsumer,
            bot: mockBot
        };

        // Mock the parent class constructor to properly set up properties
        (Table.Crons.TableGameCron as jest.MockedClass<typeof Table.Crons.TableGameCron>).mockImplementation(function(this: any, container: any) {
            this.gameData = container.gameData;
            this.definition = container.definition;
            this.appConfigs = container.appConfigs;
            this.gameStatusPublisher = container.gameStatusPublisher;
            this.runningRoundInfoPublisher = container.runningRoundInfoPublisher;
            this.roundIdConsumer = container.roundIdConsumer;
            this.unsettledRoundConsumer = container.unsettledRoundConsumer;
            this.bot = container.bot;
            this.gameManagementApiClient = {
                gameConfigs: {
                    getGameConfigs: jest.fn(),
                    updateExchangeReload: jest.fn()
                }
            };
            this.logService = {
                logError: jest.fn()
            };
            this.startCron = jest.fn();
            this.getDelayStartTime = jest.fn().mockReturnValue(0);
            this.assignNewGameConfigs = jest.fn();
            this.handleGameStatus = jest.fn();
            this.getSettingForNewRound = jest.fn();
            this.updateExchangeRates = jest.fn();
            return this;
        });

        // Mock the game timing helper
        mockedGameTimingHelper.isWithinBettingTimeInCurrentEventDetail.mockReturnValue(false);
        mockedGameTimingHelper.isOddFeedAvailable.mockReturnValue(true);

        // Mock game management API
        mockedGameManagementApi.getOrDefault.mockResolvedValue({ enabled: true });
        mockedGameManagementApi.post.mockResolvedValue({});

        gameCron = new GameCron(mockContainer);
    });

    describe("constructor", () => {
        it("should initialize with correct properties", () => {
            // Arrange & Act are done in beforeEach

            // Assert
            expect(gameCron.gameData.liveStreamServer).toBe("test-server");
            expect(gameCron.cacheConsumer).toBe(mockCacheConsumer);
            expect(gameCron.eventProcessConsumer).toBe(mockEventProcessConsumer);
            expect(gameCron.eventPullCounter).toBe(60);
        });
    });

    describe("start", () => {
        it("should initialize event process consumer and start the cron", async () => {
            // Arrange
            const mockStartCron = jest.fn();
            const mockGetSettingForNewRound = jest.fn();
            const mockUpdateExchangeRates = jest.fn();
            gameCron.startCron = mockStartCron;
            gameCron.getSettingForNewRound = mockGetSettingForNewRound;
            gameCron.updateExchangeRates = mockUpdateExchangeRates;

            // Act
            await gameCron.start();

            // Assert
            expect(mockEventProcessConsumer.init).toHaveBeenCalledTimes(1);
            expect(mockRoundIdConsumer.queryLastRound).toHaveBeenCalledTimes(1);
            expect(mockUpdateExchangeRates).toHaveBeenCalledTimes(1);
            expect(mockUnsettledRoundConsumer.proceed).toHaveBeenCalledTimes(1);
            expect(mockStartCron).toHaveBeenCalledTimes(1);
            expect(mockGameData.proceedEvent).toBe(true);
        });
    });

    describe("proceed", () => {
        describe("when proceedEvent is true", () => {
                    it("should execute full proceed logic when proceedEvent is true", async () => {
            // Arrange
            gameCron.eventPullCounter = 60;
            mockGameData.proceedEvent = true;
            const mockGetGameConfigs = jest.fn().mockReturnValue("api-call");
            gameCron.gameManagementApiClient.gameConfigs.getGameConfigs = mockGetGameConfigs;
            const newConfigs = { enabled: true };
            mockedGameManagementApi.getOrDefault.mockResolvedValue(newConfigs);

            // Act
            await gameCron.proceed();

            // Assert
            expect(mockGetGameConfigs).toHaveBeenCalledWith("test-config");
            expect(mockEventProcessConsumer.proceed).toHaveBeenCalledTimes(1);
            expect(mockEventProcessConsumer.updateRemainingTime).toHaveBeenCalledTimes(1);
            expect(mockGameData.proceedEvent).toBe(false);
            expect(gameCron.eventPullCounter).toBe(61);
        });

                    it("should reset proceedEvent to false after execution", async () => {
            // Arrange
            mockGameData.proceedEvent = true;
            const mockGetGameConfigs = jest.fn().mockReturnValue("api-call");
            gameCron.gameManagementApiClient.gameConfigs.getGameConfigs = mockGetGameConfigs;
            const newConfigs = { enabled: true };
            mockedGameManagementApi.getOrDefault.mockResolvedValue(newConfigs);

            // Act
            await gameCron.proceed();

            // Assert
            expect(mockGameData.proceedEvent).toBe(false);
        });
        });

        describe("when proceedEvent is false", () => {
            it("should only update remaining time and increment counter when proceedEvent is false", async () => {
                // Arrange
                gameCron.eventPullCounter = 30;
                mockGameData.proceedEvent = false;
                const mockCheckGameStatus = jest.fn();
                gameCron.checkGameStatus = mockCheckGameStatus;

                // Act
                await gameCron.proceed();

                // Assert
                expect(mockCheckGameStatus).not.toHaveBeenCalled();
                expect(mockEventProcessConsumer.proceed).not.toHaveBeenCalled();
                expect(mockEventProcessConsumer.updateRemainingTime).toHaveBeenCalledTimes(1);
                expect(gameCron.eventPullCounter).toBe(31);
            });
        });

        describe("counter increment", () => {
            it("should increment counter after each proceed call", async () => {
                // Arrange
                gameCron.eventPullCounter = 0;
                mockGameData.proceedEvent = false;

                // Act
                await gameCron.proceed();

                // Assert
                expect(gameCron.eventPullCounter).toBe(1);
            });

            it("should increment counter even when proceedEvent is true", async () => {
                // Arrange
                gameCron.eventPullCounter = 60;
                mockGameData.proceedEvent = true;
                const mockCheckGameStatus = jest.fn();
                gameCron.checkGameStatus = mockCheckGameStatus;

                // Act
                await gameCron.proceed();

                // Assert
                expect(gameCron.eventPullCounter).toBe(61);
            });
        });

        describe("remaining time update", () => {
            it("should always call updateRemainingTime", async () => {
                // Arrange
                mockGameData.proceedEvent = false;

                // Act
                await gameCron.proceed();

                // Assert
                expect(mockEventProcessConsumer.updateRemainingTime).toHaveBeenCalledTimes(1);
            });

            it("should call updateRemainingTime when proceedEvent is true", async () => {
                // Arrange
                mockGameData.proceedEvent = true;
                const mockGetGameConfigs = jest.fn().mockReturnValue("api-call");
                gameCron.gameManagementApiClient.gameConfigs.getGameConfigs = mockGetGameConfigs;
                const newConfigs = { enabled: true };
                mockedGameManagementApi.getOrDefault.mockResolvedValue(newConfigs);

                // Act
                await gameCron.proceed();

                // Assert
                expect(mockEventProcessConsumer.updateRemainingTime).toHaveBeenCalledTimes(1);
            });
        });

        describe("bot running", () => {
            it("should run bot when within betting time and bot exists", async () => {
                // Arrange
                mockGameData.proceedEvent = false;
                mockedGameTimingHelper.isWithinBettingTimeInCurrentEventDetail.mockReturnValue(true);
                gameCron.bot = mockBot;

                // Act
                await gameCron.proceed();

                // Assert
                expect(mockBot.run).toHaveBeenCalledTimes(1);
            });

            it("should not run bot when not within betting time", async () => {
                // Arrange
                mockGameData.proceedEvent = false;
                mockedGameTimingHelper.isWithinBettingTimeInCurrentEventDetail.mockReturnValue(false);
                gameCron.bot = mockBot;

                // Act
                await gameCron.proceed();

                // Assert
                expect(mockBot.run).not.toHaveBeenCalled();
            });

            it("should not run bot when bot does not exist", async () => {
                // Arrange
                mockGameData.proceedEvent = false;
                mockedGameTimingHelper.isWithinBettingTimeInCurrentEventDetail.mockReturnValue(true);
                (gameCron as any).bot = undefined;

                // Act
                await gameCron.proceed();

                // Assert
                expect(mockBot.run).not.toHaveBeenCalled();
            });

            it("should run bot when within betting time during proceedEvent execution", async () => {
                // Arrange
                mockGameData.proceedEvent = true;
                mockedGameTimingHelper.isWithinBettingTimeInCurrentEventDetail.mockReturnValue(true);
                gameCron.bot = mockBot;
                const mockGetGameConfigs = jest.fn().mockReturnValue("api-call");
                gameCron.gameManagementApiClient.gameConfigs.getGameConfigs = mockGetGameConfigs;
                const newConfigs = { enabled: true };
                mockedGameManagementApi.getOrDefault.mockResolvedValue(newConfigs);

                // Act
                await gameCron.proceed();

                // Assert
                expect(mockBot.run).toHaveBeenCalledTimes(1);
                expect(mockEventProcessConsumer.proceed).toHaveBeenCalledTimes(1);
            });
        });
    });



    describe("oddFeedNotAvailable", () => {
        it("should return true when odd feed is not available", () => {
            // Arrange
            mockedGameTimingHelper.isOddFeedAvailable.mockReturnValue(false);

            // Act
            const result = (gameCron as any).oddFeedNotAvailable();

            // Assert
            expect(result).toBe(true);
        });

        it("should return false when odd feed is available", () => {
            // Arrange
            mockedGameTimingHelper.isOddFeedAvailable.mockReturnValue(true);

            // Act
            const result = (gameCron as any).oddFeedNotAvailable();

            // Assert
            expect(result).toBe(false);
        });
    });
});