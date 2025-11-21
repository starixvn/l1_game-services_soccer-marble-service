import Bot from "../../../src/crons/bot";
import { TableGameConfigBot } from "sc-game-base/src/table/crons";
jest.mock("../../../src/helpers/eventid", () => ({
    extractGameId: jest.fn(() => 10),
}));
import {
    gameManagementApiClientFactory,
    publisher,
    tempBetsRepository,
} from "../global-stubs";

jest.mock("sc-game-base/src/table/crons");
jest.mock("sc-common", () => ({
    helpers: {
        arrayHelper: {
            shuffle: jest.fn((arr) => arr),
        },
    },
}));


describe("Bot", () => {
    let botInstance: Bot;
    let mockGameData: any;
    let mockGameDefinition: any;
    let mockChance: any;
    let betStatusService: any;
    let hedgeBetService: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockGameData = {
            roundId: 123,
            playerBetCount: {
                home: [],
                away: [],
                draw: [],
            },
            gameConfigs: {
                bot_maxbet: 1000,
            },
            players: {},
        };

        betStatusService = {
            allowBets: true,
            odds: {
                home: 1.5,
                away: 2.0,
                draw: 3.0,
                homeLive: 1.8,
                awayLive: 2.2,
            },
            points: {
                home: 1,
                away: 2,
                draw: 3,
                homeLive: 4,
                awayLive: 5,
            },
            currentIndex: 0,
        };

        let hedgeGroups = [
            new Set(["home", "away"]),
            new Set(["homeLive", "awayLive"]),
            new Set(["home", "awayLive"]),
            new Set(["away", "homeLive"]),
        ];

        hedgeBetService = {
            get hedgeBetGroups() {
                return hedgeGroups;
            },
            set hedgeBetGroups(value) {
                hedgeGroups = value;
            },
        };

        mockGameDefinition = {
            choices: ["home", "away", "draw", "homeLive", "awayLive"],
            hedgeBetGroups: [
                ["home", "away"],
                ["homeLive", "awayLive"],
            ],
            durations: {
                placingBetsFirstHalf: 300,
                lockingBetFirstHalf: 60,
                placingBetsSecondHalf: 200,
                lockingBetSecondHalf: 30,
            },
        };

        mockChance = {
            integer: jest.fn(),
            pickone: jest.fn(),
            shuffle: jest.fn((arr) => arr),
        };

        // Mock the parent class constructor
        (TableGameConfigBot as jest.MockedClass<typeof TableGameConfigBot>).mockImplementation(function(this: any, definition: any, gameData: any, publisher: any, gameManagementApiClientFactory: any, tempBetsRepository: any) {
            this.definition = definition;
            this.gameData = gameData;
            this.publisher = publisher;
            this.gameManagementApiClientFactory = gameManagementApiClientFactory;
            this.tempBetsRepository = tempBetsRepository;
            this.chance = mockChance;
            this.botsInRoom = {};
            this.hedgeBetGroups = definition.hedgeBetGroups;
            this.getBetChoicesRatios = jest.fn().mockReturnValue([]);
            return this;
        });

        botInstance = new Bot(mockGameDefinition, mockGameData, publisher, gameManagementApiClientFactory, tempBetsRepository, betStatusService, hedgeBetService);

        // Mock the helper function
    });

    describe("updateBalanceAndPublishBetPayload", () => {
        it("should call updatePlayerBetCount with correct parameters", () => {
            // Arrange
            const botId = "bot1";
            const choice = "home";
            const amount = 100;
            const balance = 500;
            const updatePlayerBetCountSpy = jest.spyOn(botInstance, "updatePlayerBetCount");

            // Act
            botInstance.updateBalanceAndPublishBetPayload(botId, choice, amount, balance);

            // Assert
            expect(updatePlayerBetCountSpy).toHaveBeenCalledWith(botId, choice);
        });
    });

    describe("getTicketsPerRound", () => {
        it("should return random integer between 2 and 10", () => {
            // Arrange
            const expectedTickets = 5;
            mockChance.integer.mockReturnValue(expectedTickets);

            // Act
            const result = botInstance.getTicketsPerRound();

            // Assert
            expect(result).toBe(expectedTickets);
            expect(mockChance.integer).toHaveBeenCalledWith({ min: 2, max: 10 });
        });
    });

    describe("resetBot", () => {
        it("should set totalTickets to remainTickets", () => {
            // Arrange
            const bot = { remainTickets: 10, totalTickets: 0 };

            // Act
            botInstance.resetBot(bot);

            // Assert
            expect(bot.totalTickets).toBe(10);
        });
    });

    describe("getNumberOfBotsToBet", () => {
        it("should calculate number of bots based on total tickets", () => {
            // Arrange
            botInstance.botsInRoom = {
                bot1: { totalTickets: 5 },
                bot2: { totalTickets: 3 },
                bot3: { totalTickets: 2 },
            };
            mockChance.integer
                .mockReturnValueOnce(5) // randomPercent = 5/100 = 0.05
                .mockReturnValueOnce(3); // final result

            // Act
            const result = botInstance.getNumberOfBotsToBet();

            // Assert
            expect(result).toBe(3);
            expect(mockChance.integer).toHaveBeenCalledWith({ min: 1, max: 10 }); // randomPercent
            expect(mockChance.integer).toHaveBeenCalledWith({ min: 1, max: 2 }); // maxTickets = max(2, floor(10 * 0.05)) = max(2, 0) = 2
        });

        it("should return at least 1 bot even with low total tickets", () => {
            // Arrange
            botInstance.botsInRoom = {
                bot1: { totalTickets: 1 },
            };
            mockChance.integer
                .mockReturnValueOnce(1) // randomPercent = 1/100 = 0.01
                .mockReturnValueOnce(1); // final result

            // Act
            const result = botInstance.getNumberOfBotsToBet();

            // Assert
            expect(result).toBe(1);
        });
    });

    describe("getBotsToBet", () => {
        it("should return filtered and shuffled bots", () => {
            // Arrange
            const mockBots = [
                { id: "bot1", totalBet: 500, remainTickets: 5 },
                { id: "bot2", totalBet: 1200, remainTickets: 3 }, // Over max bet
                { id: "bot3", totalBet: 800, remainTickets: 0 }, // No tickets
                { id: "bot4", totalBet: 600, remainTickets: 2 },
            ];
            botInstance.botsInRoom = mockBots;
            mockChance.shuffle.mockReturnValue(mockBots);
            jest.spyOn(botInstance, "getNumberOfBotsToBet").mockReturnValue(2);

            // Act
            const result = botInstance.getBotsToBet();

            // Assert
            expect(mockChance.shuffle).toHaveBeenCalled();
            expect(result.length).toBeLessThanOrEqual(2);
        });
    });

    describe("updatePlayerBetCount", () => {
        it("should add player to bet count for valid choice", () => {
            // Arrange
            const playerId = "player1";
            const choice = "home";

            // Act
            botInstance.updatePlayerBetCount(playerId, choice);

            // Assert
            expect(mockGameData.playerBetCount[choice]).toContain(playerId);
        });

        it("should not add player for invalid choice", () => {
            // Arrange
            const playerId = "player1";
            const choice = "invalidChoice";

            // Act
            botInstance.updatePlayerBetCount(playerId, choice);

            // Assert
            expect(mockGameData.playerBetCount[choice]).toBeUndefined();
        });

        it("should initialize array if not exists", () => {
            // Arrange
            const playerId = "player1";
            const choice = "away";
            delete mockGameData.playerBetCount[choice];

            // Act
            botInstance.updatePlayerBetCount(playerId, choice);

            // Assert
            expect(mockGameData.playerBetCount[choice]).toEqual([playerId]);
        });

        it("should not add duplicate player", () => {
            // Arrange
            const playerId = "player1";
            const choice = "home";
            mockGameData.playerBetCount[choice] = [playerId];

            // Act
            botInstance.updatePlayerBetCount(playerId, choice);

            // Assert
            expect(mockGameData.playerBetCount[choice]).toEqual([playerId]);
            expect(mockGameData.playerBetCount[choice].length).toBe(1);
        });
    });

    describe("getBetChoice", () => {
        it("should return choice from available bet choices", () => {
            // Arrange
            const bot = { choices: ["home", "away"] };
            mockChance.pickone.mockReturnValue("home");

            // Act
            const result = botInstance.getBetChoice(bot);

            // Assert
            expect(result).toBe("away"); // Should return opposite choice since bot has "away" in choices
            expect(mockChance.pickone).toHaveBeenCalledWith(["home", "away", "draw", "homeLive", "awayLive"]);
        });

        it("should return opposite choice when bot has opposite choice in hedge bet group", () => {
            // Arrange
            const bot = { choices: ["home", "away"] };
            mockChance.pickone.mockReturnValue("home");

            // Act
            const result = botInstance.getBetChoice(bot);

            // Assert
            expect(result).toBe("away"); // Should return opposite choice from hedge bet group
        });

        it("should return original choice when bot doesn't have opposite choice", () => {
            // Arrange
            const bot = { choices: ["home"] };
            mockChance.pickone.mockReturnValue("home");

            // Act
            const result = botInstance.getBetChoice(bot);

            // Assert
            expect(result).toBe("home"); // Should return original choice since bot doesn't have "away"
        });

        it("should return choice when no hedge bet group found", () => {
            // Arrange
            const bot = { choices: ["draw"] };
            mockChance.pickone.mockReturnValue("draw");

            // Act
            const result = botInstance.getBetChoice(bot);

            // Assert
            expect(result).toBe("draw"); // Should return original choice since no hedge bet group
        });

        it("should return choice when dynamicHedgeBetGroups is undefined", () => {
            // Arrange
            hedgeBetService.hedgeBetGroups = undefined as any;
            const bot = { choices: ["home", "away"] };
            mockChance.pickone.mockReturnValue("home");

            // Act
            const result = botInstance.getBetChoice(bot);

            // Assert
            expect(result).toBe("home"); // Should return original choice since no hedge bet groups
        });

        it("should return choice when dynamicOdds is undefined", () => {
            // Arrange
            betStatusService.odds = undefined;
            const bot = { choices: ["home", "away"] };
            mockChance.pickone.mockReturnValue("home");

            // Act
            const result = botInstance.getBetChoice(bot);

            // Assert
            expect(result).toBe("away"); // Should return opposite choice since bot has "away" in choices
        });

        it("should filter out choices with zero odds", () => {
            // Arrange
            betStatusService.odds = {
                home: 1.5,
                away: 0, // Zero odds
                draw: 3.0,
                homeLive: 1.8,
                awayLive: 2.2,
            };
            const bot = { choices: ["home", "away"] };
            mockChance.pickone.mockReturnValue("home");

            // Act
            const result = botInstance.getBetChoice(bot);

            // Assert
            expect(result).toBe("away"); // Should return opposite choice since bot has "away" in choices
            expect(mockChance.pickone).toHaveBeenCalledWith(["home", "draw", "homeLive", "awayLive"]);
        });

        it("should handle cross-period hedge bet groups", () => {
            // Arrange
            const bot = { choices: ["home", "awayLive"] };
            mockChance.pickone.mockReturnValue("home");

            // Act
            const result = botInstance.getBetChoice(bot);

            // Assert
            expect(result).toBe("home"); // Should return original choice since bot doesn't have "away" (opposite)
        });

        it("should handle case where picked choice is not in bot choices", () => {
            // Arrange
            const bot = { choices: ["draw"] };
            mockChance.pickone.mockReturnValue("home");

            // Act
            const result = botInstance.getBetChoice(bot);

            // Assert
            expect(result).toBe("home"); // Should return picked choice since bot doesn't have "away" (opposite)
        });
    });

    describe("filterBetChoicesRatios", () => {
        it("should filter bet choices ratios and return valid options", () => {
            // Arrange
            const betChoiceRatios = [
                { underBetRatio: true, group: ["home", "away"] },
                { underBetRatio: false, group: ["draw"] },
            ];
            jest.spyOn(botInstance, "filterBetChoice").mockReturnValue(["home"]);

            // Act
            const result = botInstance.filterBetChoicesRatios(betChoiceRatios);

            // Assert
            expect(result.length).toBe(2); // Both groups should be returned since filterBetChoice returns non-empty arrays
            expect(result[0].underBetRatio).toBe(true);
            expect(result[1].underBetRatio).toBe(false);
        });

        it("should set all underBetRatio to true when all are false", () => {
            // Arrange
            const betChoiceRatios = [
                { underBetRatio: false, group: ["home"] },
                { underBetRatio: false, group: ["away"] },
            ];
            jest.spyOn(botInstance, "filterBetChoice").mockReturnValue(["home", "away"]);

            // Act
            const result = botInstance.filterBetChoicesRatios(betChoiceRatios);

            // Assert
            expect(result[0].underBetRatio).toBe(true);
            expect(result[1].underBetRatio).toBe(true);
        });
    });
    
    describe("insertOrUpdateBet", () => {
        beforeEach(() => {
            botInstance.tempBetsRepository = {
                updateOne: jest.fn().mockResolvedValue({}),
            } as any;
        });

        it("should insert new bet when currentBet is null", async () => {
            // Arrange
            const bot = {
                id: "bot123",
                name: "TestBot",
                clientSeed: "seed123",
            };
            const choice = "home";
            const amount = 100;
            const currentBet = { index: 0 };
            const mockDate = new Date("2023-01-01T12:00:00Z");
            jest.spyOn(global, "Date").mockImplementation(() => mockDate as any);

            // Act
            const result = await botInstance.insertOrUpdateBet(bot, choice, amount, currentBet);

            // Assert
            expect(botInstance.tempBetsRepository.updateOne).toHaveBeenCalledWith(
                { uid: "bot123", roundId: 123 },
                {
                    $set: {
                        "0.home": 100,
                            "odds.0.home": { price: 1.5, point: 1 },
                            "odds.0.away": { price: 2.0, point: 2 },
                            "odds.0.draw": { price: 3.0, point: 3 },
                            "odds.0.homeLive": { price: 1.8, point: 4 },
                            "odds.0.awayLive": { price: 2.2, point: 5 },
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

        it("should update existing bet when currentBet exists", async () => {
            // Arrange
            const bot = {
                id: "bot123",
                name: "TestBot",
                clientSeed: "seed123",
            };
            const choice = "home";
            const amount = 100;
            const currentBet = { index: 0, 0: { home: 50 } };
            const mockDate = new Date("2023-01-01T12:00:00Z");
            jest.spyOn(global, "Date").mockImplementation(() => mockDate as any);

            // Act
            const result = await botInstance.insertOrUpdateBet(bot, choice, amount, currentBet);

            // Assert
            expect(botInstance.tempBetsRepository.updateOne).toHaveBeenCalledWith(
                { uid: "bot123", roundId: 123 },
                {
                    $set: {
                        "0.home": 150,
                        "odds.0.home": { price: 1.5, point: 1 },
                        "odds.0.away": { price: 2.0, point: 2 },
                        "odds.0.draw": { price: 3.0, point: 3 },
                        "odds.0.homeLive": { price: 1.8, point: 4 },
                        "odds.0.awayLive": { price: 2.2, point: 5 },
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

    describe("filterBetChoice", () => {
        it("should filter out choices with invalid odds", () => {
            // Arrange
            const betOptions = ["home", "away", "draw"];
            betStatusService.odds = {
                home: 1.5,
                away: 0, // Invalid odds
                draw: 3.0,
            };

            // Act
            const result = botInstance.filterBetChoice(betOptions);

            // Assert
            expect(result).toEqual(["home", "draw"]);
        });

        it("should filter out choices with undefined odds", () => {
            // Arrange
            const betOptions = ["home", "away", "draw"];
            betStatusService.odds = {
                home: 1.5,
                // away is undefined
                draw: 3.0,
            };

            // Act
            const result = botInstance.filterBetChoice(betOptions);

            // Assert
            expect(result).toEqual(["home", "draw"]);
        });

        it("should return empty array when all choices have invalid odds", () => {
            // Arrange
            const betOptions = ["home", "away", "draw"];
            betStatusService.odds = {
                home: 0,
                away: 0,
                draw: 0,
            };

            // Act
            const result = botInstance.filterBetChoice(betOptions);

            // Assert
            expect(result).toEqual([]);
        });

        it("should return all choices when all have valid odds", () => {
            // Arrange
            const betOptions = ["home", "away", "draw"];
            betStatusService.odds = {
                home: 1.5,
                away: 2.0,
                draw: 3.0,
            };

            // Act
            const result = botInstance.filterBetChoice(betOptions);

            // Assert
            expect(result).toEqual(["home", "away", "draw"]);
        });
    });
});
