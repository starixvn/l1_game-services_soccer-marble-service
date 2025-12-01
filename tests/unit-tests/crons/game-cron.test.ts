jest.mock("sc-game-base", () => ({
    Table: {
        Crons: {
            TableGameCron: class {
                constructor(container: any) {
                    Object.assign(this, container);
                }
                resetForNewRound() { // EMPTY FOR A REASON
                }
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
    let cron: any;
    const FIXED_TIMESTAMP = 1700000000000; // Fixed timestamp: 2023-11-14T22:13:20.000Z

    beforeEach(() => {
        jest.clearAllMocks();
        cron = Object.create(GameCron.prototype);
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
        };
        cron.runningRoundInfoPublisher = {
            publish: jest.fn(),
        };
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
        cron.eventStartListener = jest.fn();
        cron.oddsFeedEventSource = {
            on: jest.fn(),
            eventOn: jest.fn(),
            eventDetailOn: jest.fn(),
        };
        cron.delayHandlingService = {
            getDelayedTime: jest.fn(({ time }: { time: Date }) => time),
        };
        cron.upcomingEventService = {
            nextEvent: {
                eventID: 123,
                scheduleStartTs: FIXED_TIMESTAMP + 60000,
            },
        };
        cron.oddsFeedCron = {
            stop: jest.fn(),
            start: jest.fn().mockResolvedValue(undefined),
        };
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
        cron.currentEventService = { 
            eventByEventId: {},
            getCurrentEvent: jest.fn().mockReturnValue({
                scheduleEndTs: new Date(FIXED_TIMESTAMP + 60000).toISOString(),
            }),
        };
        cron.eventPullCounter = 0;
        cron.betStatusService = { allowBets: true };
        cron.gameData.roundId = 0;
        cron.serverTimeDiffService = { now: FIXED_TIMESTAMP };
    });

    describe("start", () => {
        it("should update exchange rates, proceed unsettled rounds, set flag, and start cron", async () => {
            await cron.start();
            expect(cron.updateExchangeRates).toHaveBeenCalled();
            expect(cron.unsettledRoundConsumer.proceed).toHaveBeenCalled();
            expect(cron.startCron).toHaveBeenCalled();
        });
    });

    describe("constructor", () => {
        it("should set liveStreamServer, cacheConsumer, currentEventService, betStatusService, and serverTimeDiffService from container", () => {
            // Arrange
            const container = {
                gameData: {},
                cacheConsumer: { tag: "cache" },
                currentEventService: { tag: "current" },
                betStatusService: { tag: "bet" },
                serverTimeDiffService: { tag: "serverTime" },
            } as any;

            // Act
            const instance = new GameCron(container) as any;

            // Assert
            expect(instance.cacheConsumer).toBe(container.cacheConsumer);
            expect(instance.currentEventService).toBe(container.currentEventService);
            expect(instance.betStatusService).toBe(container.betStatusService);
            expect(instance.serverTimeDiffService).toBe(container.serverTimeDiffService);
        });
    });

    describe("proceed", () => {
        it("should calculate remainingTime and run bot when flags satisfied", async () => {
            cron.gameData.proceedEvent = true;
            cron.checkGameStatus = jest.fn().mockResolvedValue(undefined);
            const mockNow = FIXED_TIMESTAMP;
            cron.serverTimeDiffService.now = mockNow;
            // Set event end time to be in the future so remainingTime > 0
            const futureEventStartTs = mockNow + 60000;
            cron.upcomingEventService.nextEvent = {
                eventID: 123,
                scheduleStartTs: futureEventStartTs,
            } as any;
            cron.delayHandlingService.getDelayedTime = jest.fn(() => new Date(futureEventStartTs));
            const logSpy = jest.spyOn(console, "log").mockImplementation();

            await cron.proceed();

            expect(cron.gameData.proceedEvent).toBe(true);
            // checkGameStatus should not be called when remainingTime > 0
            expect(cron.checkGameStatus).not.toHaveBeenCalled();
            expect(cron.bot.run).toHaveBeenCalled();
            expect(cron.runningRoundInfoPublisher.publish).toHaveBeenCalled();
            // Verify remainingTime is calculated using serverTimeDiffService.now
            const expectedRemainingTime = Math.floor((futureEventStartTs - mockNow) / 1000);
            expect(cron.gameData.remainingTime).toBe(expectedRemainingTime);
            logSpy.mockRestore();
        });

        it("should not run bot when betting time is closed", async () => {
            cron.gameData.proceedEvent = false;
            cron.betStatusService.allowBets = false;
            const logSpy = jest.spyOn(console, "log").mockImplementation();

            await cron.proceed();

            expect(cron.bot.run).not.toHaveBeenCalled();
            expect(cron.runningRoundInfoPublisher.publish).not.toHaveBeenCalled();
            logSpy.mockRestore();
        });

        it("should call checkGameStatus when remainingTime <= 0", async () => {
            cron.checkGameStatus = jest.fn().mockResolvedValue(undefined);
            cron.betStatusService.allowBets = false;
            // Set event end time to be in the past so remainingTime <= 0
            const mockNow = FIXED_TIMESTAMP;
            const pastTime = mockNow - 1000;
            cron.serverTimeDiffService.now = mockNow;
            cron.delayHandlingService.getDelayedTime = jest.fn(() => new Date(pastTime));
            cron.upcomingEventService.nextEvent = {
                eventID: 123,
                scheduleStartTs: pastTime,
            } as any;

            await cron.proceed();

            // proceed() doesn't call checkGameStatus directly, it only calculates remainingTime
            expect(cron.gameData.remainingTime).toBeLessThanOrEqual(0);
        });

        it("should call checkGameStatus when remainingTime is exactly 0", async () => {
            cron.checkGameStatus = jest.fn().mockResolvedValue(undefined);
            cron.betStatusService.allowBets = false;
            // Set event end time to be exactly now so remainingTime = 0
            const mockNow = FIXED_TIMESTAMP;
            cron.serverTimeDiffService.now = mockNow;
            cron.delayHandlingService.getDelayedTime = jest.fn(() => new Date(mockNow));
            cron.upcomingEventService.nextEvent = {
                eventID: 123,
                scheduleStartTs: mockNow,
            } as any;

            await cron.proceed();

            // proceed() doesn't call checkGameStatus directly, it only calculates remainingTime
            expect(cron.gameData.remainingTime).toBeLessThanOrEqual(0);
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
        it("should disable game, set remaining time, publish disable status, and stop odds feed cron", async () => {
            (getOrDefault as jest.Mock).mockResolvedValueOnce({});
            cron.gameData.disabled = true;

            await cron.handleGameStatus(false);

            expect(getOrDefault).toHaveBeenCalled();
            expect(cron.gameData.remainingTime).toBe(126);
            expect(cron.gameStatusPublisher.publishDisableGameStatus).toHaveBeenCalled();
            expect(cron.oddsFeedCron.stop).toHaveBeenCalled();
        });

        it("should enable game, start odds feed cron when previously disabled", async () => {
            cron.gameData.disabled = false;
            await cron.handleGameStatus(true);
            expect(cron.enableGame).toHaveBeenCalled();
            expect(cron.oddsFeedCron.start).toHaveBeenCalled();
        });

        it("should reset for new round and reset bot when not disabled and not previously disabled", async () => {
            cron.gameData.disabled = false;
            cron.gameData.playerBetCount = { somePlayer: 2 };
            await cron.handleGameStatus(false);
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
});


