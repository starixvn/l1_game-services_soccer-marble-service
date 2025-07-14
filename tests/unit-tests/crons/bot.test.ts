import { stub } from "jest-auto-stub";
import Bot from "../../../src/crons/bot";
import GameData from "../../../src/game-data";
import GameDefinition from "../../../src/game-definition";
import { gameManagementApiClientFactory, publisher, tempBetsRepository } from "../global-stubs";
import { helpers } from "sc-common";
import * as gameTimingHelpers from "../../../src/helpers/game-timing";

jest.mock("sc-common", () => ({
    helpers: {
        arrayHelper: {
            shuffle: jest.fn((arr) => arr),
        },
    },
}));

jest.mock("../../../src/helpers/game-timing", () => ({
    isWithinFirstHalfBettingTime: jest.fn(),
    isWithinBettingTime: jest.fn(),
}));

describe("Bot", () => {
    let botInstance: Bot;
    let mockPickone: jest.Mock;

    const definition = stub<GameDefinition>({
        choices: ["home", "away", "homeLive", "secondHalfAway"] as any,
        hedgeBetGroups: [
            ["home", "away"],
            ["homeLive", "secondHalfAway"],
        ],
        durations: {
            placingBetsFirstHalf: 300,
            lockingBetFirstHalf: 60,
            placingBetsSecondHalf: 200,
            lockingBetSecondHalf: 30,
        },
    });
    const gameData = stub<GameData>({
        players: {},
        playerBetCount: {
            home: [],
            invalidChoice: [],
        },
        remainingTime: 100,
    });

    beforeEach(() => {
        jest.clearAllMocks();

        mockPickone = jest.fn((arr) => arr[0]);

        botInstance = new Bot(definition, gameData, publisher, gameManagementApiClientFactory, tempBetsRepository);

        Object.defineProperty(botInstance, "chance", {
            value: {
                pickone: mockPickone,
            },
        });

        jest.spyOn(botInstance as any, "getBetChoicesRatios").mockReturnValue([]);
    });

    describe("updateBalanceAndPublishBetPayload", () => {
        it("should update the balance and call updatePlayerBetCount", () => {
            // Arrange
            const botId = "bot1";
            const choice = "home";
            const amount = 100;
            const balance = 500;
            gameData.players[botId] = { red: 0 };
            const updatePlayerBetCountSpy = jest.spyOn(botInstance, "updatePlayerBetCount");
            const superUpdateSpy = jest.spyOn(botInstance, "updateBalanceAndPublishBetPayload");

            // Act
            botInstance.updateBalanceAndPublishBetPayload(botId, choice, amount, balance);

            // Assert
            expect(gameData.players[botId].red).toBe(balance);
            expect(updatePlayerBetCountSpy).toHaveBeenCalledWith(botId, choice);
            expect(superUpdateSpy).toHaveBeenCalledWith(botId, choice, amount, balance);
        });
    });

    describe("updatePlayerBetCount", () => {
        it("should update player bet count for a valid choice", () => {
            // Arrange
            const playerId = "player1";
            const choice = "home";

            // Act
            botInstance.updatePlayerBetCount(playerId, choice);

            // Assert
            expect(gameData.playerBetCount[choice]).toContain(playerId);
        });

        it("should not update player bet count for an invalid choice", () => {
            // Arrange
            const playerId = "player1";
            const choice = "invalidChoice";

            // Act
            botInstance.updatePlayerBetCount(playerId, choice);

            // Assert
            expect(gameData.playerBetCount[choice]).toEqual([]);
        });

        it("should initialize playerBetCount array if it doesn't exist", () => {
            // Arrange
            const playerId = "player1";
            const choice = "away";
            delete gameData.playerBetCount[choice];

            // Act
            botInstance.updatePlayerBetCount(playerId, choice);

            // Assert
            expect(gameData.playerBetCount[choice]).toEqual([playerId]);
        });

        it("should not add duplicate player IDs to playerBetCount", () => {
            // Arrange
            const playerId = "player1";
            const choice = "home";
            gameData.playerBetCount[choice] = [playerId];

            // Act
            botInstance.updatePlayerBetCount(playerId, choice);

            // Assert
            expect(gameData.playerBetCount[choice]).toEqual([playerId]);
            expect(gameData.playerBetCount[choice].length).toBe(1);
        });
    });

    describe("getBetChoice", () => {
        describe("during first half betting period", () => {
            beforeEach(() => {
                (gameTimingHelpers.isWithinFirstHalfBettingTime as jest.Mock).mockReturnValue(true);

                Object.defineProperty(botInstance, "PRE_MATCH_BET_CHOICES", {
                    value: {
                        home: "home",
                        away: "away",
                    },
                });

                Object.defineProperty(botInstance, "LIVE_BET_CHOICES", {
                    value: {
                        homeLive: "homeLive",
                        awayLive: "awayLive",
                    },
                });

                Object.defineProperty(botInstance, "gameData", {
                    value: {
                        ...gameData,
                        dynamicOdds: {
                            home: 1.5,
                            away: 2.0,
                            homeLive: 0,
                            awayLive: 0,
                        },
                    },
                    writable: true,
                });
            });

            it("should return a choice from underRatio groups when available", () => {
                // Arrange
                const bot = { choices: ["home", "away"] };
                const underRatioGroups = [{ underBetRatio: true, group: ["home"] }];
                (botInstance as any).getBetChoicesRatios.mockReturnValue(underRatioGroups);
                mockPickone.mockImplementationOnce((arr) => "home");

                // Act
                const result = botInstance.getBetChoice(bot);

                // Assert
                expect(result).toBe("away");
                expect(helpers.arrayHelper.shuffle).toHaveBeenCalledWith(underRatioGroups);
            });

            it("should return original choice when bot doesn't have the opposite choice in hedge bet group", () => {
                // Arrange
                const bot = { choices: ["home"] };
                (botInstance as any).getBetChoicesRatios.mockReturnValue([{ underBetRatio: true, group: ["home"] }]);
                mockPickone.mockImplementationOnce((arr) => "home");
                Object.defineProperty(botInstance, "definition", {
                    value: {
                        ...definition,
                        hedgeBetGroups: [["home", "away"]],
                    },
                    writable: true,
                });

                // Act
                const result = botInstance.getBetChoice(bot);

                // Assert
                expect(result).toBe("home");
            });

            it("should return opposite choice when bot has it in hedge bet group", () => {
                // Arrange
                const bot = { choices: ["home", "away"] };
                (botInstance as any).getBetChoicesRatios.mockReturnValue([{ underBetRatio: true, group: ["home"] }]);
                mockPickone.mockImplementationOnce((arr) => "home");
                Object.defineProperty(botInstance, "definition", {
                    value: {
                        ...definition,
                        hedgeBetGroups: [["home", "away"]],
                    },
                    writable: true,
                });

                // Act
                const result = botInstance.getBetChoice(bot);

                // Assert
                expect(result).toBe("away");
            });
        });

        describe("during second half betting period", () => {
            beforeEach(() => {
                (gameTimingHelpers.isWithinFirstHalfBettingTime as jest.Mock).mockReturnValue(false);

                Object.defineProperty(botInstance, "PRE_MATCH_BET_CHOICES", {
                    value: {
                        home: "home",
                        away: "away",
                    },
                });

                Object.defineProperty(botInstance, "LIVE_BET_CHOICES", {
                    value: {
                        homeLive: "homeLive",
                        secondHalfAway: "secondHalfAway",
                    },
                });

                Object.defineProperty(botInstance, "gameData", {
                    value: {
                        ...gameData,
                        dynamicOdds: {
                            home: 0,
                            away: 0,
                            homeLive: 1.8,
                            secondHalfAway: 2.2,
                        },
                    },
                    writable: true,
                });
            });

            it("should return a second half choice from available options", () => {
                // Arrange
                const bot = { choices: ["homeLive", "secondHalfAway"] };
                (botInstance as any).getBetChoicesRatios.mockReturnValue([{ underBetRatio: true, group: ["homeLive"] }]);
                mockPickone.mockImplementationOnce((arr) => "homeLive");
                Object.defineProperty(botInstance, "definition", {
                    value: {
                        ...definition,
                        hedgeBetGroups: [["homeLive", "secondHalfAway"]],
                    },
                    writable: true,
                });

                // Act
                const result = botInstance.getBetChoice(bot);

                // Assert
                expect(result).toBe("secondHalfAway");
            });
        });
    });

    describe("insertOrUpdateBet", () => {
        let tempBetsUpdateOneSpy: jest.Mock;

        beforeEach(() => {
            Object.defineProperty(botInstance, "tempBetsRepository", {
                value: {
                    updateOne: jest.fn().mockResolvedValue({}),
                },
                writable: true,
            });

            tempBetsUpdateOneSpy = botInstance.tempBetsRepository.updateOne;
        });

        it("should insert a new bet when currentBet is null", async () => {
            // Arrange
            const bot = {
                id: "bot123",
                name: "TestBot",
                clientSeed: "seed123",
            };
            const choice = "home";
            const amount = 100;
            const currentBet = null;
            const mockDate = new Date("2023-01-01T12:00:00Z");

            jest.spyOn(global, "Date").mockImplementation(() => mockDate as any);
            gameData.roundId = 123;
            gameData.dynamicOdds = { home: 1.5, away: 2.5 };

            // Act
            const result = await botInstance.insertOrUpdateBet(bot, choice, amount, currentBet);

            // Assert
            expect(tempBetsUpdateOneSpy).toHaveBeenCalledWith(
                { uid: "bot123", roundId: 123 },
                {
                    $set: {
                        home: 100,
                        odds: gameData.dynamicOdds,
                    },
                    $setOnInsert: {
                        uid: "bot123",
                        name: "TestBot",
                        roundId: 123,
                        time: mockDate,
                        currency: " ",
                        operatorId: " ",
                        clientSeed: "seed123",
                    },
                },
                { upsert: true, setDefaultsOnInsert: true }
            );
            expect(result).toEqual(mockDate);

            jest.spyOn(global, "Date").mockRestore();
        });

        it("should update an existing bet when currentBet exists", async () => {
            // Arrange
            const bot = {
                id: "bot123",
                name: "TestBot",
                clientSeed: "seed123",
            };
            const choice = "home";
            const amount = 100;
            const currentBet = { home: 50 };
            const mockDate = new Date("2023-01-01T12:00:00Z");

            jest.spyOn(global, "Date").mockImplementation(() => mockDate as any);
            gameData.roundId = 123;
            gameData.dynamicOdds = { home: 1.5, away: 2.5 };

            // Act
            const result = await botInstance.insertOrUpdateBet(bot, choice, amount, currentBet);

            // Assert
            expect(tempBetsUpdateOneSpy).toHaveBeenCalledWith(
                { uid: "bot123", roundId: 123 },
                {
                    $set: {
                        home: 150,
                        odds: gameData.dynamicOdds,
                    },
                    $setOnInsert: {
                        uid: "bot123",
                        name: "TestBot",
                        roundId: 123,
                        time: mockDate,
                        currency: " ",
                        operatorId: " ",
                        clientSeed: "seed123",
                    },
                },
                { upsert: true, setDefaultsOnInsert: true }
            );
            expect(result).toEqual(mockDate);

            jest.spyOn(global, "Date").mockRestore();
        });

        it("should handle different bet choices correctly", async () => {
            // Arrange
            const bot = {
                id: "bot123",
                name: "TestBot",
                clientSeed: "seed123",
            };
            const choice = "away";
            const amount = 200;
            const currentBet = null;
            const mockDate = new Date("2023-01-01T12:00:00Z");

            jest.spyOn(global, "Date").mockImplementation(() => mockDate as any);
            gameData.roundId = 123;
            gameData.dynamicOdds = { home: 1.5, away: 2.5 };

            // Act
            const result = await botInstance.insertOrUpdateBet(bot, choice, amount, currentBet);

            // Assert
            expect(tempBetsUpdateOneSpy).toHaveBeenCalledWith(
                { uid: "bot123", roundId: 123 },
                {
                    $set: {
                        away: 200,
                        odds: gameData.dynamicOdds,
                    },
                    $setOnInsert: {
                        uid: "bot123",
                        name: "TestBot",
                        roundId: 123,
                        time: mockDate,
                        currency: " ",
                        operatorId: " ",
                        clientSeed: "seed123",
                    },
                },
                { upsert: true, setDefaultsOnInsert: true }
            );
            expect(result).toEqual(mockDate);

            jest.spyOn(global, "Date").mockRestore();
        });
    });

    describe("isDuringBetTime", () => {
        it("should return true when within betting time", () => {
            // Arrange
            (gameTimingHelpers.isWithinBettingTime as jest.Mock).mockReturnValue(true);

            // Act
            const result = botInstance.isDuringBetTime();

            // Assert
            expect(result).toBe(true);
            expect(gameTimingHelpers.isWithinBettingTime).toHaveBeenCalledWith(gameData.remainingTime, definition.durations);
        });

        it("should return false when not within betting time", () => {
            // Arrange
            (gameTimingHelpers.isWithinBettingTime as jest.Mock).mockReturnValue(false);

            // Act
            const result = botInstance.isDuringBetTime();

            // Assert
            expect(result).toBe(false);
            expect(gameTimingHelpers.isWithinBettingTime).toHaveBeenCalledWith(gameData.remainingTime, definition.durations);
        });
    });

    describe("filterBetChoice", () => {
        beforeEach(() => {
            (gameTimingHelpers.isWithinFirstHalfBettingTime as jest.Mock).mockReset();
        });

        it("should filter out invalid bet choices during first half", () => {
            // Arrange
            const betOptions = ["home", "away", "homeLive", "awayLive"];
            (gameTimingHelpers.isWithinFirstHalfBettingTime as jest.Mock).mockReturnValue(true);
            Object.defineProperty(botInstance, "gameData", {
                value: {
                    ...gameData,
                    dynamicOdds: {
                        home: 1.5,
                        away: 2.0,
                        homeLive: 0,
                        awayLive: 0,
                    },
                },
                writable: true,
            });
            Object.defineProperty(botInstance, "PRE_MATCH_BET_CHOICES", {
                value: {
                    home: "home",
                    away: "away",
                },
            });
            Object.defineProperty(botInstance, "LIVE_BET_CHOICES", {
                value: {
                    homeLive: "homeLive",
                    awayLive: "awayLive",
                },
            });

            // Act
            const result = botInstance.filterBetChoice(betOptions);

            // Assert
            expect(result).toEqual(["home", "away"]);
        });

        it("should filter out invalid bet choices during second half", () => {
            // Arrange
            const betOptions = ["home", "away", "homeLive", "awayLive"];
            (gameTimingHelpers.isWithinFirstHalfBettingTime as jest.Mock).mockReturnValue(false);
            Object.defineProperty(botInstance, "gameData", {
                value: {
                    ...gameData,
                    dynamicOdds: {
                        home: 0,
                        away: 0,
                        homeLive: 1.8,
                        awayLive: 2.2,
                    },
                },
                writable: true,
            });
            Object.defineProperty(botInstance, "PRE_MATCH_BET_CHOICES", {
                value: {
                    home: "home",
                    away: "away",
                },
            });
            Object.defineProperty(botInstance, "LIVE_BET_CHOICES", {
                value: {
                    homeLive: "homeLive",
                    awayLive: "awayLive",
                },
            });

            // Act
            const result = botInstance.filterBetChoice(betOptions);

            // Assert
            expect(result).toEqual(["homeLive", "awayLive"]);
        });

        it("should return empty array when all choices have invalid odds", () => {
            // Arrange
            const betOptions = ["home", "away", "homeLive", "awayLive"];
            (gameTimingHelpers.isWithinFirstHalfBettingTime as jest.Mock).mockReturnValue(true);
            Object.defineProperty(botInstance, "gameData", {
                value: {
                    ...gameData,
                    dynamicOdds: {
                        home: 0,
                        away: 0,
                        homeLive: 0,
                        awayLive: 0,
                    },
                },
                writable: true,
            });
            Object.defineProperty(botInstance, "PRE_MATCH_BET_CHOICES", {
                value: {
                    home: "home",
                    away: "away",
                },
            });
            Object.defineProperty(botInstance, "LIVE_BET_CHOICES", {
                value: {
                    homeLive: "homeLive",
                    awayLive: "awayLive",
                },
            });

            // Act
            const result = botInstance.filterBetChoice(betOptions);

            // Assert
            expect(result).toEqual([]);
        });
    });
});
