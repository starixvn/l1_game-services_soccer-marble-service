jest.mock("sc-game-base", () => ({
    Table: {
        Crons: {
            TableGameCron: class {
                constructor(container: any) {
                    Object.assign(this, container);
                }
                resetForNewRound() {}
            },
        },
    },
}));

import GameCron from "../../../src/crons/game-cron";
import { getOrDefault, post } from "sc-game-base/src/core/game-management-api";

jest.mock("sc-game-base/src/core/game-management-api", () => ({
    getOrDefault: jest.fn((p: any, d: any) => Promise.resolve(d)),
    post: jest.fn(() => Promise.resolve(undefined)),
}));

describe("GameCron", () => {
    let cron: GameCron & any;

    beforeEach(() => {
        jest.clearAllMocks();
        cron = Object.create(GameCron.prototype) as any;
        cron.gameData = {
            gameConfigs: {},
            disabled: false,
            proceedEvent: false,
            remainingTime: 0,
        };
        cron.definition = {
            configName: "cfg",
            name: "TestGame",
            durations: { wholeRound: 126 },
        };
        cron.gameStatusPublisher = {
            publishDisableGameStatus: jest.fn(),
            publishStartGame: jest.fn(),
        };
        cron.runningRoundInfoPublisher = {};
        cron.roundIdConsumer = { queryLastRound: jest.fn().mockResolvedValue(undefined) };
        cron.unsettledRoundConsumer = { proceed: jest.fn().mockResolvedValue(undefined) };
        cron.startCron = jest.fn();
        cron.updateExchangeRates = jest.fn().mockResolvedValue(undefined);
        cron.getSettingForNewRound = jest.fn().mockResolvedValue(undefined);
        cron.enableGame = jest.fn().mockResolvedValue(undefined);
        cron.assignNewGameConfigs = jest.fn();
        cron.getDelayStartTime = jest.fn().mockReturnValue(0);
        cron.oddFeedNotAvailable = jest.fn().mockReturnValue(false);
        cron.bot = { run: jest.fn().mockResolvedValue(undefined) };
        cron.bot.reset = jest.fn();
        cron.gameManagementApiClient = {
            gameConfigs: {
                getGameConfigs: jest.fn().mockResolvedValue({}),
                updateExchangeReload: jest.fn().mockReturnValue({ req: true }),
            },
            notification: {
                getUmMessages: jest.fn().mockResolvedValue({}),
            },
        };
        cron.logService = { logError: jest.fn(), logInfo: jest.fn(), logWarning: jest.fn() };
        cron.currentEventService = { eventByEventId: {} };
        cron.eventPullCounter = 0;
    });

    describe("start", () => {
        it("should query last round, update exchange rates, proceed unsettled, set flag, and start cron", async () => {
            await cron.start();
            expect(cron.roundIdConsumer.queryLastRound).toHaveBeenCalled();
            expect(cron.updateExchangeRates).toHaveBeenCalled();
            expect(cron.unsettledRoundConsumer.proceed).toHaveBeenCalled();
            expect(cron.gameData.proceedEvent).toBe(true);
            expect(cron.startCron).toHaveBeenCalled();
        });
    });

    describe("constructor", () => {
        it("should set liveStreamServer, cacheConsumer, and currentEventService from container", () => {
            // Arrange
            const container = {
                gameData: {},
                cacheConsumer: { tag: "cache" },
                currentEventService: { tag: "current" },
            } as any;

            // Act
            const instance = new GameCron(container) as any;

            // Assert
            expect(instance.cacheConsumer).toBe(container.cacheConsumer);
            expect(instance.currentEventService).toBe(container.currentEventService);
        });
    });

    describe("proceed", () => {
        it("should checkGameStatus and run bot when flags satisfied, then increment counter", async () => {
            cron.gameData.proceedEvent = true;
            cron.checkGameStatus = jest.fn().mockResolvedValue(undefined);

            await cron.proceed();

            expect(cron.gameData.proceedEvent).toBe(false);
            expect(cron.checkGameStatus).toHaveBeenCalled();
        });
    });

    describe("checkGameStatus", () => {
        it("should log error when configs missing and set disabled accordingly, then call handleGameStatus", async () => {
            (getOrDefault as jest.Mock).mockResolvedValueOnce(null);
            cron.handleGameStatus = jest.fn();

            await cron.checkGameStatus();

            expect(getOrDefault).toHaveBeenCalled();
            expect(cron.logService.logError).toHaveBeenCalled();
            expect(cron.assignNewGameConfigs).toHaveBeenCalled();
            expect(cron.getSettingForNewRound).toHaveBeenCalled();
            expect(cron.handleGameStatus).toHaveBeenCalledWith(false);
        });

        it("should reload exchange rates when exchangeReload is true", async () => {
            // First call returns enabled configs
            (getOrDefault as jest.Mock).mockResolvedValueOnce({ enabled: true });
            // After assignment, internal code uses gameData.gameConfigs.exchangeReload
            cron.gameData.gameConfigs.exchangeReload = true;

            await cron.checkGameStatus();

            expect(cron.updateExchangeRates).toHaveBeenCalled();
            expect(post).toHaveBeenCalled();
        });
        it("should compute delayStartTime when previously disabled", async () => {
            // Arrange
            (getOrDefault as jest.Mock).mockResolvedValueOnce({ enabled: false });
            cron.gameData.disabled = true;
            cron.getDelayStartTime = jest.fn().mockReturnValue(0);
            cron.handleGameStatus = jest.fn();

            // Act
            await cron.checkGameStatus();

            // Assert
            expect(cron.getDelayStartTime).toHaveBeenCalledWith(true, { enabled: false });
            expect(cron.handleGameStatus).toHaveBeenCalledWith(true);
        });
    });

    describe("handleGameStatus", () => {
        it("should disable game, set remaining time, and publish disable status", async () => {
            (getOrDefault as jest.Mock).mockResolvedValueOnce({});
            cron.gameData.disabled = true;

            await cron.handleGameStatus(false);

            expect(getOrDefault).toHaveBeenCalled();
            expect(cron.gameData.remainingTime).toBe(126);
            expect(cron.gameStatusPublisher.publishDisableGameStatus).toHaveBeenCalled();
        });

        it("should enable game when previously disabled", async () => {
            cron.gameData.disabled = false;
            await cron.handleGameStatus(true);
            expect(cron.enableGame).toHaveBeenCalled();
        });

        it("should publish start game when not disabled and not previously disabled", async () => {
            cron.gameData.disabled = false;
            cron.gameData.playerBetCount = { somePlayer: 2 };
            await cron.handleGameStatus(false);
            expect(cron.gameStatusPublisher.publishStartGame).toHaveBeenCalled();
            expect(cron.gameData.playerBetCount).toEqual({});
            expect(cron.bot.reset).toHaveBeenCalled();
        });
    });

    describe("resetForNewRound", () => {
        it("should clear playerBetCount", () => {
            // Arrange
            cron.gameData.playerBetCount = { p1: 1 };
            // Act
            cron.resetForNewRound();
            // Assert
            expect(cron.gameData.playerBetCount).toEqual({});
        });
    });

    describe("oddFeedNotAvailable", () => {
        beforeEach(() => {
            // Ensure we use the real prototype implementation for this suite
            delete cron.oddFeedNotAvailable;
        });
        it("should return true when no roundId", () => {
            cron.gameData.roundId = undefined;
            expect(cron["oddFeedNotAvailable"]()).toBe(true);
        });

        it("should return true when event not found", () => {
            cron.gameData.roundId = 1;
            cron.currentEventService.eventByEventId = {};
            expect(cron["oddFeedNotAvailable"]()).toBe(true);
        });

        it("should return true when event ended", () => {
            cron.gameData.roundId = 2;
            cron.currentEventService.eventByEventId = {
                2: { eventDetails: [{ resultsAvailableTs: new Date(Date.now() - 1000) }] },
            };
            expect(cron["oddFeedNotAvailable"]()).toBe(true);
        });

        it("should return false when event not ended", () => {
            cron.gameData.roundId = 3;
            cron.currentEventService.eventByEventId = {
                3: { eventDetails: [{ resultsAvailableTs: new Date(Date.now() + 1000) }] },
            };
            expect(cron["oddFeedNotAvailable"]()).toBe(false);
        });
    });
});


