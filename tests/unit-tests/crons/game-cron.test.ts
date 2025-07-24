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

jest.mock("sc-game-base");
jest.mock("../../../src/helpers/game-timing");

const mockedGameTimingHelper = gameTimingHelper as jest.Mocked<typeof gameTimingHelper>;

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

        mockCacheConsumer = {
            proceed: jest.fn()
        } as unknown as jest.Mocked<CacheConsumer>;

        mockEventProcessConsumer = {
            proceed: jest.fn(),
            updateAndGetRemainingTime: jest.fn(),
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
            this.startCron = jest.fn();
            this.checkGameStatus = jest.fn();
            this.getSettingForNewRound = jest.fn();
            this.updateExchangeRates = jest.fn();
            return this;
        });

        // Mock the game timing helper
        mockedGameTimingHelper.isWithinBettingTimeInCurrentEventDetail.mockReturnValue(false);

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
            expect(mockGetSettingForNewRound).toHaveBeenCalledTimes(1);
            expect(mockUpdateExchangeRates).toHaveBeenCalledTimes(1);
            expect(mockUnsettledRoundConsumer.proceed).toHaveBeenCalledTimes(1);
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

            it("should reset counter to 1 after interval is reached", async () => {
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

        describe("bot running", () => {
            it("should run bot when within betting time and bot exists", async () => {
                // Arrange
                gameCron.eventPullCounter = 30;
                mockedGameTimingHelper.isWithinBettingTimeInCurrentEventDetail.mockReturnValue(true);
                gameCron.bot = mockBot;

                // Act
                await gameCron.proceed();

                // Assert
                expect(mockBot.run).toHaveBeenCalledTimes(1);
            });

            it("should not run bot when not within betting time", async () => {
                // Arrange
                gameCron.eventPullCounter = 30;
                mockedGameTimingHelper.isWithinBettingTimeInCurrentEventDetail.mockReturnValue(false);
                gameCron.bot = mockBot;

                // Act
                await gameCron.proceed();

                // Assert
                expect(mockBot.run).not.toHaveBeenCalled();
            });

            it("should not run bot when bot does not exist", async () => {
                // Arrange
                gameCron.eventPullCounter = 30;
                mockedGameTimingHelper.isWithinBettingTimeInCurrentEventDetail.mockReturnValue(true);
                (gameCron as any).bot = undefined;

                // Act
                await gameCron.proceed();

                // Assert
                expect(mockBot.run).not.toHaveBeenCalled();
            });

            it("should run bot when within betting time during interval execution", async () => {
                // Arrange
                gameCron.eventPullCounter = 60;
                mockedGameTimingHelper.isWithinBettingTimeInCurrentEventDetail.mockReturnValue(true);
                gameCron.bot = mockBot;
                const mockCheckGameStatus = jest.fn();
                gameCron.checkGameStatus = mockCheckGameStatus;

                // Act
                await gameCron.proceed();

                // Assert
                expect(mockBot.run).toHaveBeenCalledTimes(1);
                expect(mockCheckGameStatus).toHaveBeenCalledTimes(1);
                expect(mockEventProcessConsumer.proceed).toHaveBeenCalledTimes(1);
            });
        });
    });
});