import { Core } from "sc-game-base";
import PlaceBetConsumer from "../../../src/consumers/place-bet-consumer";
import GameDefinition from "../../../src/game-definition";
import { BET_CHOICES, LIVE_BET_CHOICES } from "../../../src/constants";
import * as gameTimingHelper from "../../../src/helpers/game-timing";
import * as eventIdHelper from "../../../src/helpers/eventid";

jest.mock("../../../src/helpers/game-timing");
jest.mock("../../../src/helpers/eventid");

const mockedGameTimingHelper = gameTimingHelper as jest.Mocked<typeof gameTimingHelper>;
const mockedEventIdHelper = eventIdHelper as jest.Mocked<typeof eventIdHelper>;

describe("PlaceBetConsumer", () => {
    let placeBetConsumer: PlaceBetConsumer;
    let mockGameDefinition: any;
    let mockGameData: any;
    let mockEventPublisher: any;
    let mockPlayer: {
        profile: {
            name: string;
            minBet: number;
            maxBet: number;
        };
        session: {
            currencyGroupId: string;
        };
    };
    let mockSettings: {
        groupId: string;
        minBet: number;
        maxBet: number;
        maxBetPerChoices: Record<string, number>;
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockGameData = {
            remainingTime: 110,
            roundId: 1,
            gameId: 123,
            gameConfigs: {
                enabled: true,
                enableFreeBet: true,
                tournamentConfig: {
                    code: "test",
                    teams: ["team1", "team2"]
                },
                videoStreamConfig: {
                    videoInfos: [],
                },
            },
            oddFeedGames: {
                123: {
                    rounds: {
                        1: {
                            eventID: 123,
                            eventNameAKey: "Team A",
                            eventNameBKey: "Team B",
                            scheduleStartTs: new Date(Date.now() - 60000),
                            productCode: "SOCCER",
                            productTypeKey: "MATCH",
                            eventDetails: [{
                                eventID: 123,
                                scheduleStartTs: new Date(Date.now() - 60000),
                                oddsAvailableTs: new Date(Date.now() - 30000),
                                resultsAvailableTs: new Date(Date.now() + 120000),
                                hasResults: false,
                                playlist: "test-playlist",
                                goalInfo: "test-goal-info",
                                result: "test-result",
                                markets: []
                            }]
                        }
                    },
                    currentRound: 1,
                    currentEventDetailIndex: 0
                }
            },
            dynamicOdds: {
                [BET_CHOICES.home]: 1.5,
                [BET_CHOICES.away]: 2.0,
                [BET_CHOICES.draw]: 3.0,
                [LIVE_BET_CHOICES.homeLive]: 1.8,
                [LIVE_BET_CHOICES.awayLive]: 2.2,
            },
            dynamicHedgeBetGroups: [
                new Set([BET_CHOICES.home, BET_CHOICES.away]),
                new Set([LIVE_BET_CHOICES.homeLive, LIVE_BET_CHOICES.awayLive]),
                new Set([BET_CHOICES.home, LIVE_BET_CHOICES.awayLive]),
                new Set([BET_CHOICES.away, LIVE_BET_CHOICES.homeLive]),
            ],
            currencyGroupGames: [],
            ingame: {},
        };

        mockGameDefinition = {
            durations: {
                placingBetsFirstHalf: 130,
                lockingBetFirstHalf: 100,
                placingBetsSecondHalf: 80,
                lockingBetSecondHalf: 60,
            },
            choices: Object.values(BET_CHOICES),
            hedgeBetGroups: [
                [BET_CHOICES.home, BET_CHOICES.away],
                [BET_CHOICES.over, BET_CHOICES.under],
                [BET_CHOICES.odd, BET_CHOICES.even],
                [BET_CHOICES.homeLive, BET_CHOICES.awayLive],
                [BET_CHOICES.overLive, BET_CHOICES.underLive],
                [BET_CHOICES.oddLive, BET_CHOICES.evenLive],
                [BET_CHOICES.home, BET_CHOICES.awayLive],
                [BET_CHOICES.away, BET_CHOICES.homeLive],
                [BET_CHOICES.over, BET_CHOICES.underLive],
                [BET_CHOICES.under, BET_CHOICES.overLive],
                [BET_CHOICES.odd, BET_CHOICES.evenLive],
                [BET_CHOICES.even, BET_CHOICES.oddLive],
            ],
        } as GameDefinition;

        mockEventPublisher = {
            gameName: "test-game",
            gameData: mockGameData,
            publishToAllUsers: jest.fn(),
            publishToAllUsersExcept: jest.fn(),
            publishToUser: jest.fn(),
            publishToUsers: jest.fn(),
            publishToTable: jest.fn(),
            publishToTableExcept: jest.fn(),
        };

        mockPlayer = {
            profile: {
                name: "testPlayer",
                minBet: 10,
                maxBet: 1000,
            },
            session: {
                currencyGroupId: "1",
            },
        };

        mockSettings = {
            groupId: "1",
            minBet: 20,
            maxBet: 2000,
            maxBetPerChoices: {
                home: 500,
                homeLive: 600,
            },
        };

        mockGameData.currencyGroupGames = [mockSettings];
        mockGameData.ingame = {
            testPlayer: {
                betTracks: {},
            },
        };

        // Mock the parent class methods
        jest.spyOn(Core.BaseEventConsumers.PlaceBetConsumer.prototype, "getNoticeObj").mockImplementation((notice: any, params?: any) => {
            if (notice === "SB1935") return { errorCode: "SB1935" };
            if (notice === "SB1910") return { errorCode: "SB1910", maxBet: params?.maxBet };
            if (notice === "SB1909") return { errorCode: "SB1909", minBet: params?.minBet };
            if (notice === "SB1911") return { errorCode: "SB1911", maxBet: params?.maxBet };
            if (notice === "SB1939") return { errorCode: "SB1939", hedgeBetGroup: params?.hedgeBetGroup };
            return { errorCode: notice };
        });

        // Mock the helper functions
        mockedGameTimingHelper.isWithinBettingTimeInCurrentEventDetail.mockReturnValue(true);
        mockedEventIdHelper.getCurrentMatch.mockReturnValue({
            eventID: 123,
            scheduleStartTs: new Date(Date.now() - 60000),
            oddsAvailableTs: new Date(Date.now() - 30000),
            resultsAvailableTs: new Date(Date.now() + 120000),
            hasResults: false,
            playlist: "test-playlist",
            goalInfo: "test-goal-info",
            result: "test-result",
            markets: []
        });

        placeBetConsumer = new PlaceBetConsumer(mockGameDefinition, mockGameData, mockEventPublisher);
        placeBetConsumer.definition = mockGameDefinition;
        placeBetConsumer.gameData = mockGameData;
    });

    describe("composeBettingTimeValidationCriteria", () => {
        const roundId = 1;

        describe("game configs disabled", () => {
            it("should fail validation when game configs are disabled", () => {
                // Arrange
                mockGameData.gameConfigs.enabled = false;

                // Act
                const result = placeBetConsumer.composeBettingTimeValidationCriteria(roundId);

                // Assert
                expect(result[0].failure).toBe(true);
                expect(result[0].notice).toEqual({ errorCode: "SB1935" });
            });
        });

        describe("round id mismatch", () => {
            it("should fail validation when round id does not match", () => {
                // Arrange
                const wrongRoundId = 999;

                // Act
                const result = placeBetConsumer.composeBettingTimeValidationCriteria(wrongRoundId);

                // Assert
                expect(result[1].failure).toBe(true);
                expect(result[1].notice).toEqual({ errorCode: "SB1935" });
            });
        });

        describe("betting time validation", () => {
            it("should fail validation when not within betting time", () => {
                // Arrange
                mockedGameTimingHelper.isWithinBettingTimeInCurrentEventDetail.mockReturnValue(false);

                // Act
                const result = placeBetConsumer.composeBettingTimeValidationCriteria(roundId);

                // Assert
                expect(result[2].failure).toBe(true);
                expect(result[2].notice).toEqual({ errorCode: "SB1905" });
            });

            it("should pass validation when within betting time", () => {
                // Arrange
                mockedGameTimingHelper.isWithinBettingTimeInCurrentEventDetail.mockReturnValue(true);

                // Act
                const result = placeBetConsumer.composeBettingTimeValidationCriteria(roundId);

                // Assert
                expect(result[2].failure).toBe(false);
                expect(result[2].notice).toEqual({ errorCode: "SB1905" });
            });
        });
    });

    describe("composeBetChoiceValidationCriteria", () => {
        describe("zero odds validation", () => {
            it("should fail validation when the odds for the bet choice is zero", () => {
                // Arrange
                mockGameData.dynamicOdds = {
                    [BET_CHOICES.home]: 0,
                };
                const betChoice = BET_CHOICES.home;

                // Act
                const result = placeBetConsumer.composeBetChoiceValidationCriteria(betChoice);

                // Assert
                expect(result[0].failure).toBe(true);
                expect(result[0].notice).toEqual({ errorCode: "SB1935" });
            });

            it("should pass validation when the odds for the bet choice is not zero", () => {
                // Arrange
                mockGameData.dynamicOdds = {
                    [BET_CHOICES.home]: 1.5,
                };
                const betChoice = BET_CHOICES.home;

                // Act
                const result = placeBetConsumer.composeBetChoiceValidationCriteria(betChoice);

                // Assert
                expect(result[0].failure).toBe(false);
                expect(result[0].notice).toEqual({ errorCode: "SB1935" });
            });

            it("should fail validation when the odds for the bet choice is undefined (defaults to zero)", () => {
                // Arrange
                mockGameData.dynamicOdds = {};
                const betChoice = BET_CHOICES.home;

                // Act
                const result = placeBetConsumer.composeBetChoiceValidationCriteria(betChoice);

                // Assert
                expect(result[0].failure).toBe(true);
                expect(result[0].notice).toEqual({ errorCode: "SB1935" });
            });
        });
    });

    describe("composeBetAmountValidationCriteria", () => {
        describe("free bet validation", () => {
            it("should fail validation when free bet is disabled", () => {
                // Arrange
                mockGameData.gameConfigs.enableFreeBet = false;
                const betChoice = BET_CHOICES.home;
                const amount = 100;
                const freeBet = true;

                // Act
                const result = placeBetConsumer.composeBetAmountValidationCriteria(mockPlayer, betChoice, amount, freeBet);

                // Assert
                expect(result[0].failure).toBe(true);
                expect(result[0].notice).toEqual({ errorCode: "SB1935" });
            });

            it("should pass validation when free bet is enabled", () => {
                // Arrange
                mockGameData.gameConfigs.enableFreeBet = true;
                const betChoice = BET_CHOICES.home;
                const amount = 100;
                const freeBet = true;

                // Act
                const result = placeBetConsumer.composeBetAmountValidationCriteria(mockPlayer, betChoice, amount, freeBet);

                // Assert
                expect(result[0].failure).toBe(false);
                expect(result[0].notice).toEqual({ errorCode: "SB1935" });
            });
        });

        describe("max bet per choice validation", () => {
            it("should fail validation when bet amount exceeds max bet per choice", () => {
                // Arrange
                const betChoice = BET_CHOICES.home;
                const amount = 1100;
                const freeBet = false;

                // Act
                const result = placeBetConsumer.composeBetAmountValidationCriteria(mockPlayer, betChoice, amount, freeBet);

                // Assert
                expect(result[1].failure).toBe(true);
                expect(result[1].notice).toEqual({ errorCode: "SB1910", maxBet: 1000 });
            });

            it("should fail validation when bet amount plus existing bet exceeds max bet per choice", () => {
                // Arrange
                mockGameData.ingame.testPlayer.betTracks = {
                    [BET_CHOICES.home]: 600,
                };
                const betChoice = BET_CHOICES.home;
                const amount = 500;
                const freeBet = false;

                // Act
                const result = placeBetConsumer.composeBetAmountValidationCriteria(mockPlayer, betChoice, amount, freeBet);

                // Assert
                expect(result[1].failure).toBe(true);
                expect(result[1].notice).toEqual({ errorCode: "SB1910", maxBet: 1000 });
            });

            it("should limit max bet based on odds for second half bets", () => {
                // Arrange
                mockGameData.dynamicOdds = {
                    [LIVE_BET_CHOICES.homeLive]: 2.5,
                };
                const betChoice = LIVE_BET_CHOICES.homeLive;
                const amount = 1000;
                const freeBet = false;

                // Act
                const result = placeBetConsumer.composeBetAmountValidationCriteria(mockPlayer, betChoice, amount, freeBet);

                // Assert
                // maxBet / (odds - 1) = 1000 / (2.5 - 1) = 666.67, rounded to 667
                expect(result[1].failure).toBe(true);
                expect(result[1].notice).toEqual({ errorCode: "SB1910", maxBet: 667 });
            });
        });

        describe("min bet validation", () => {
            it("should fail validation when bet amount is less than min bet", () => {
                // Arrange
                const betChoice = BET_CHOICES.home;
                const amount = 5;
                const freeBet = false;

                // Act
                const result = placeBetConsumer.composeBetAmountValidationCriteria(mockPlayer, betChoice, amount, freeBet);

                // Assert
                expect(result[2].failure).toBe(true);
                expect(result[2].notice).toEqual({ errorCode: "SB1909", minBet: 20 });
            });
        });

        describe("max bet validation", () => {
            it("should fail validation when bet amount exceeds max bet", () => {
                // Arrange
                const betChoice = BET_CHOICES.home;
                const amount = 2500;
                const freeBet = false;

                // Act
                const result = placeBetConsumer.composeBetAmountValidationCriteria(mockPlayer, betChoice, amount, freeBet);

                // Assert
                expect(result[3].failure).toBe(true);
                expect(result[3].notice).toEqual({ errorCode: "SB1911", maxBet: 1000 });
            });

            it("should fail validation when total bet amount exceeds max bet", () => {
                // Arrange
                mockGameData.ingame.testPlayer.betTracks = {
                    [BET_CHOICES.home]: 600,
                };
                const betChoice = LIVE_BET_CHOICES.homeLive;
                const amount = 500;
                const freeBet = false;

                // Act
                const result = placeBetConsumer.composeBetAmountValidationCriteria(mockPlayer, betChoice, amount, freeBet);

                // Assert
                expect(result[4].failure).toBe(true);
                expect(result[4].notice).toEqual({ errorCode: "SB1911", maxBet: 1000 });
            });
        });
    });

    describe("composeHedgeBetValidationCriteria", () => {
        describe("when bet choice violates hedge bet criteria", () => {
            it("should return failure with hedge bet notice between first half choices", () => {
                // Arrange
                mockGameData.ingame.testPlayer.betTracks = {
                    [BET_CHOICES.home]: 300,
                };

                // Act
                const result = placeBetConsumer.composeHedgeBetValidationCriteria(BET_CHOICES.away, mockPlayer);

                // Assert
                expect(result[0].failure).toBe(true);
                expect(result[0].notice).toEqual({ errorCode: "SB1939", hedgeBetGroup: [BET_CHOICES.home, BET_CHOICES.away] });
            });

            it("should return failure with hedge bet notice between first half and second half", () => {
                // Arrange
                mockGameData.ingame.testPlayer.betTracks = {
                    [BET_CHOICES.home]: 300,
                };

                // Act
                const result = placeBetConsumer.composeHedgeBetValidationCriteria(LIVE_BET_CHOICES.awayLive, mockPlayer);

                // Assert
                expect(result[0].failure).toBe(true);
                expect(result[0].notice).toEqual({ errorCode: "SB1939", hedgeBetGroup: [BET_CHOICES.home, LIVE_BET_CHOICES.awayLive] });
            });
        });

        describe("when bet choice does not violate hedge bet criteria", () => {
            it("should return no failure with empty hedge bet group", () => {
                // Arrange
                mockGameData.ingame.testPlayer.betTracks = {
                    [BET_CHOICES.home]: 300,
                };

                // Act
                const result = placeBetConsumer.composeHedgeBetValidationCriteria(BET_CHOICES.draw, mockPlayer);

                // Assert
                expect(result[0].failure).toBe(false);
                expect(result[0].notice).toEqual({ errorCode: "SB1939", hedgeBetGroup: [] });
            });

            it("should return no failure when no existing bets in hedge bet group", () => {
                // Arrange
                mockGameData.ingame.testPlayer.betTracks = {};

                // Act
                const result = placeBetConsumer.composeHedgeBetValidationCriteria(BET_CHOICES.home, mockPlayer);

                // Assert
                expect(result[0].failure).toBe(false);
                expect(result[0].notice).toEqual({ errorCode: "SB1939", hedgeBetGroup: [] });
            });

            it("should return no failure when dynamicHedgeBetGroups is undefined", () => {
                // Arrange
                mockGameData.dynamicHedgeBetGroups = undefined;
                mockGameData.ingame.testPlayer.betTracks = {
                    [BET_CHOICES.home]: 300,
                };

                // Act
                const result = placeBetConsumer.composeHedgeBetValidationCriteria(BET_CHOICES.away, mockPlayer);

                // Assert
                expect(result[0].failure).toBe(false);
                expect(result[0].notice).toEqual({ errorCode: "SB1939", hedgeBetGroup: [] });
            });
        });
    });
}); 