import { Core } from "sc-game-base";
import PlaceBetConsumer from "../../../src/consumers/place-bet-consumer";
import GameDefinition from "../../../src/game-definition";
import { BET_CHOICES, LIVE_BET_CHOICES } from "../../../src/constants";

describe("PlaceBetConsumer", () => {
    let placeBetConsumer: PlaceBetConsumer;
    let mockGameDefinition: GameDefinition;
    let mockGameData: any;
    let mockEventPublisher: any;
    let mockPlayer: any;
    let mockSettings: any;

    const DURATIONS = {
        placingBetsFirstHalf: 130,
        lockingBetFirstHalf: 100,
        placingBetsSecondHalf: 80,
        lockingBetSecondHalf: 60,
    };

    beforeEach(() => {
        jest.spyOn(Core.BaseEventConsumers.PlaceBetConsumer.prototype, "composeBetChoiceValidationCriteria").mockReturnValue([]);

        mockGameData = {
            remainingTime: 110,
            roundId: 1,
            gameConfigs: {
                enabled: true,
                tournamentConfig: {},
                videoStreamConfig: {
                    videoInfos: [],
                },
            },
        };

        mockGameDefinition = {
            durations: DURATIONS,
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
        mockGameData.gameConfigs = {
            enableFreeBet: true,
        };
        mockGameData.ingame = {
            testPlayer: {
                betTracks: {},
            },
        };

        placeBetConsumer = new PlaceBetConsumer(mockGameDefinition, mockGameData, mockEventPublisher);
        placeBetConsumer.definition = mockGameDefinition;
        placeBetConsumer.gameData = mockGameData;
    });

    describe("composeBettingTimeValidationCriteria", () => {
        const roundId = 1;
        describe("first half", () => {
            describe("betting boundary", () => {
                it("right before placingBets, should fail validation", () => {
                    // Arrange
                    mockGameData.remainingTime = 131;

                    // Act
                    const result = placeBetConsumer.composeBettingTimeValidationCriteria(roundId);

                    // Assert
                    expect(result[2].failure).toBe(true);
                });

                it("exactly at placingBets, should fail validation", () => {
                    // Arrange
                    mockGameData.remainingTime = 130;

                    // Act
                    const result = placeBetConsumer.composeBettingTimeValidationCriteria(roundId);

                    // Assert
                    expect(result[2].failure).toBe(true);
                });

                it("right after placingBets, should pass validation", () => {
                    // Arrange
                    mockGameData.remainingTime = 129;

                    // Act
                    const result = placeBetConsumer.composeBettingTimeValidationCriteria(roundId);

                    // Assert
                    expect(result[2].failure).toBe(false);
                });
            });

            describe("locking boundary", () => {
                describe("right before lockingBet", () => {
                    it("right before lockingBet, should pass validation", () => {
                        // Arrange
                        mockGameData.remainingTime = 101;

                        // Act
                        const result = placeBetConsumer.composeBettingTimeValidationCriteria(roundId);

                        // Assert
                        expect(result[2].failure).toBe(false);
                    });
                });
                describe("exactly at lockingBet", () => {
                    it("exactly at lockingBet, should pass validation", () => {
                        // Arrange
                        mockGameData.remainingTime = 100;

                        // Act
                        const result = placeBetConsumer.composeBettingTimeValidationCriteria(roundId);

                        // Assert
                        expect(result[2].failure).toBe(false);
                    });
                });
                describe("right after lockingBet", () => {
                    it("right after lockingBet, should fail validation", () => {
                        // Arrange
                        mockGameData.remainingTime = 99;

                        // Act
                        const result = placeBetConsumer.composeBettingTimeValidationCriteria(roundId);

                        // Assert
                        expect(result[2].failure).toBe(true);
                    });
                });
            });
        });

        describe("second half", () => {
            describe("betting boundary", () => {
                it("right before placingBets, should fail validation", () => {
                    // Arrange
                    mockGameData.remainingTime = 81;

                    // Act
                    const result = placeBetConsumer.composeBettingTimeValidationCriteria(roundId);

                    // Assert
                    expect(result[2].failure).toBe(true);
                });

                it("exactly at placingBets, should fail validation", () => {
                    // Arrange
                    mockGameData.remainingTime = 80;

                    // Act
                    const result = placeBetConsumer.composeBettingTimeValidationCriteria(roundId);

                    // Assert
                    expect(result[2].failure).toBe(true);
                });

                it("right after placingBets, should pass validation", () => {
                    // Arrange
                    mockGameData.remainingTime = 79;

                    // Act
                    const result = placeBetConsumer.composeBettingTimeValidationCriteria(roundId);

                    // Assert
                    expect(result[2].failure).toBe(false);
                });
            });

            describe("locking boundary", () => {
                describe("right before lockingBet", () => {
                    it("right before lockingBet, should pass validation", () => {
                        // Arrange
                        mockGameData.remainingTime = 61;

                        // Act
                        const result = placeBetConsumer.composeBettingTimeValidationCriteria(roundId);

                        // Assert
                        expect(result[2].failure).toBe(false);
                    });
                });
                describe("exactly at lockingBet", () => {
                    it("exactly at lockingBet, should pass validation", () => {
                        // Arrange
                        mockGameData.remainingTime = 60;

                        // Act
                        const result = placeBetConsumer.composeBettingTimeValidationCriteria(roundId);

                        // Assert
                        expect(result[2].failure).toBe(false);
                    });
                });
                describe("right after lockingBet", () => {
                    it("right after lockingBet, should fail validation", () => {
                        // Arrange
                        mockGameData.remainingTime = 59;

                        // Act
                        const result = placeBetConsumer.composeBettingTimeValidationCriteria(roundId);

                        // Assert
                        expect(result[2].failure).toBe(true);
                    });
                });
            });
        });
    });

    describe("composeBetChoiceValidationCriteria", () => {
        describe("first half", () => {
            describe("betting boundary", () => {
                it("right before placingBetsFirstHalf, should NOT validate first half bet choice", () => {
                    // Arrange
                    mockGameData.remainingTime = 131;
                    const betChoice = BET_CHOICES.home;

                    // Act
                    const result = placeBetConsumer.composeBetChoiceValidationCriteria(betChoice);

                    // Assert
                    expect(result[0].failure).toBe(false);
                    expect(result[0].notice).toEqual({ errorCode: "SB1935" });
                });

                it("right before placingBetsFirstHalf, should NOT validate second half bet choice", () => {
                    // Arrange
                    mockGameData.remainingTime = 131;
                    const betChoice = LIVE_BET_CHOICES.homeLive;

                    // Act
                    const result = placeBetConsumer.composeBetChoiceValidationCriteria(betChoice);

                    // Assert
                    expect(result[0].failure).toBe(false);
                    expect(result[0].notice).toEqual({ errorCode: "SB1935" });
                });

                it("exactly at placingBetsFirstHalf, should NOT validate first half bet choice", () => {
                    // Arrange
                    mockGameData.remainingTime = 130;
                    const betChoice = BET_CHOICES.home;

                    // Act
                    const result = placeBetConsumer.composeBetChoiceValidationCriteria(betChoice);

                    // Assert
                    expect(result[0].failure).toBe(false);
                });

                it("exactly at placingBetsFirstHalf, should NOT validate second half bet choice", () => {
                    // Arrange
                    mockGameData.remainingTime = 130;
                    const betChoice = LIVE_BET_CHOICES.homeLive;

                    // Act
                    const result = placeBetConsumer.composeBetChoiceValidationCriteria(betChoice);

                    // Assert
                    expect(result[0].failure).toBe(false);
                    expect(result[0].notice).toEqual({ errorCode: "SB1935" });
                });

                it("right after placingBetsFirstHalf, should pass validation for first half bet choice", () => {
                    // Arrange
                    mockGameData.remainingTime = 129;
                    const betChoice = BET_CHOICES.home;

                    // Act
                    const result = placeBetConsumer.composeBetChoiceValidationCriteria(betChoice);

                    // Assert
                    expect(result[0].failure).toBe(false);
                });

                it("right after placingBetsFirstHalf, should fail validation for second half bet choice", () => {
                    // Arrange
                    mockGameData.remainingTime = 129;
                    const betChoice = LIVE_BET_CHOICES.homeLive;

                    // Act
                    const result = placeBetConsumer.composeBetChoiceValidationCriteria(betChoice);

                    // Assert
                    expect(result[0].failure).toBe(true);
                    expect(result[0].notice).toEqual({ errorCode: "SB1935" });
                });
            });

            describe("locking boundary", () => {
                it("right before lockingBetFirstHalf, should pass validation for first half bet choice", () => {
                    // Arrange
                    mockGameData.remainingTime = 101;
                    const betChoice = BET_CHOICES.home;

                    // Act
                    const result = placeBetConsumer.composeBetChoiceValidationCriteria(betChoice);

                    // Assert
                    expect(result[0].failure).toBe(false);
                });

                it("right before lockingBetFirstHalf, should fail validation for second half bet choice", () => {
                    // Arrange
                    mockGameData.remainingTime = 101;
                    const betChoice = LIVE_BET_CHOICES.homeLive;

                    // Act
                    const result = placeBetConsumer.composeBetChoiceValidationCriteria(betChoice);

                    // Assert
                    expect(result[0].failure).toBe(true);
                    expect(result[0].notice).toEqual({ errorCode: "SB1935" });
                });

                it("exactly at lockingBetFirstHalf, should pass validation for first half bet choice", () => {
                    // Arrange
                    mockGameData.remainingTime = 100;
                    const betChoice = BET_CHOICES.home;

                    // Act
                    const result = placeBetConsumer.composeBetChoiceValidationCriteria(betChoice);

                    // Assert
                    expect(result[0].failure).toBe(false);
                });

                it("exactly at lockingBetFirstHalf, should fail validation for second half bet choice", () => {
                    // Arrange
                    mockGameData.remainingTime = 100;
                    const betChoice = LIVE_BET_CHOICES.homeLive;

                    // Act
                    const result = placeBetConsumer.composeBetChoiceValidationCriteria(betChoice);

                    // Assert
                    expect(result[0].failure).toBe(true);
                    expect(result[0].notice).toEqual({ errorCode: "SB1935" });
                });

                it("right after lockingBetFirstHalf, should NOT validate first half bet choice", () => {
                    // Arrange
                    mockGameData.remainingTime = 99;
                    const betChoice = BET_CHOICES.home;

                    // Act
                    const result = placeBetConsumer.composeBetChoiceValidationCriteria(betChoice);

                    // Assert
                    expect(result[0].failure).toBe(false);
                    expect(result[0].notice).toEqual({ errorCode: "SB1935" });
                });

                it("right after lockingBetFirstHalf, should NOT validate second half bet choice", () => {
                    // Arrange
                    mockGameData.remainingTime = 99;
                    const betChoice = LIVE_BET_CHOICES.homeLive;

                    // Act
                    const result = placeBetConsumer.composeBetChoiceValidationCriteria(betChoice);

                    // Assert
                    expect(result[0].failure).toBe(false);
                    expect(result[0].notice).toEqual({ errorCode: "SB1935" });
                });
            });
        });

        describe("second half", () => {
            describe("betting boundary", () => {
                it("right before placingBetsSecondHalf, should NOT validate first half bet choice", () => {
                    // Arrange
                    mockGameData.remainingTime = 81;
                    const betChoice = BET_CHOICES.home;

                    // Act
                    const result = placeBetConsumer.composeBetChoiceValidationCriteria(betChoice);

                    // Assert
                    expect(result[0].failure).toBe(false);
                    expect(result[0].notice).toEqual({ errorCode: "SB1935" });
                });

                it("right before placingBetsSecondHalf, should NOT validate second half bet choice", () => {
                    // Arrange
                    mockGameData.remainingTime = 81;
                    const betChoice = LIVE_BET_CHOICES.homeLive;

                    // Act
                    const result = placeBetConsumer.composeBetChoiceValidationCriteria(betChoice);

                    // Assert
                    expect(result[0].failure).toBe(false);
                    expect(result[0].notice).toEqual({ errorCode: "SB1935" });
                });

                it("exactly at placingBetsSecondHalf, should NOT validate first half bet choice", () => {
                    // Arrange
                    mockGameData.remainingTime = 80;
                    const betChoice = BET_CHOICES.home;

                    // Act
                    const result = placeBetConsumer.composeBetChoiceValidationCriteria(betChoice);

                    // Assert
                    expect(result[0].failure).toBe(false);
                    expect(result[0].notice).toEqual({ errorCode: "SB1935" });
                });

                it("exactly at placingBetsSecondHalf, should NOT validate second half bet choice", () => {
                    // Arrange
                    mockGameData.remainingTime = 80;
                    const betChoice = LIVE_BET_CHOICES.homeLive;

                    // Act
                    const result = placeBetConsumer.composeBetChoiceValidationCriteria(betChoice);

                    // Assert
                    expect(result[0].failure).toBe(false);
                });

                it("right after placingBetsSecondHalf, should fail validation for first half bet choice", () => {
                    // Arrange
                    mockGameData.remainingTime = 79;
                    const betChoice = BET_CHOICES.home;

                    // Act
                    const result = placeBetConsumer.composeBetChoiceValidationCriteria(betChoice);

                    // Assert
                    expect(result[0].failure).toBe(true);
                    expect(result[0].notice).toEqual({ errorCode: "SB1935" });
                });

                it("right after placingBetsSecondHalf, should pass validation for second half bet choice", () => {
                    // Arrange
                    mockGameData.remainingTime = 79;
                    const betChoice = LIVE_BET_CHOICES.homeLive;

                    // Act
                    const result = placeBetConsumer.composeBetChoiceValidationCriteria(betChoice);

                    // Assert
                    expect(result[0].failure).toBe(false);
                });
            });

            describe("locking boundary", () => {
                it("right before lockingBetSecondHalf, should fail validation for first half bet choice", () => {
                    // Arrange
                    mockGameData.remainingTime = 61;
                    const betChoice = BET_CHOICES.home;

                    // Act
                    const result = placeBetConsumer.composeBetChoiceValidationCriteria(betChoice);

                    // Assert
                    expect(result[0].failure).toBe(true);
                    expect(result[0].notice).toEqual({ errorCode: "SB1935" });
                });

                it("right before lockingBetSecondHalf, should pass validation for second half bet choice", () => {
                    // Arrange
                    mockGameData.remainingTime = 61;
                    const betChoice = LIVE_BET_CHOICES.homeLive;

                    // Act
                    const result = placeBetConsumer.composeBetChoiceValidationCriteria(betChoice);

                    // Assert
                    expect(result[0].failure).toBe(false);
                });

                it("exactly at lockingBetSecondHalf, should fail validation for first half bet choice", () => {
                    // Arrange
                    mockGameData.remainingTime = 60;
                    const betChoice = BET_CHOICES.home;

                    // Act
                    const result = placeBetConsumer.composeBetChoiceValidationCriteria(betChoice);

                    // Assert
                    expect(result[0].failure).toBe(true);
                    expect(result[0].notice).toEqual({ errorCode: "SB1935" });
                });

                it("exactly at lockingBetSecondHalf, should pass validation for second half bet choice", () => {
                    // Arrange
                    mockGameData.remainingTime = 60;
                    const betChoice = LIVE_BET_CHOICES.homeLive;

                    // Act
                    const result = placeBetConsumer.composeBetChoiceValidationCriteria(betChoice);

                    // Assert
                    expect(result[0].failure).toBe(false);
                });

                it("right after lockingBetSecondHalf, should NOT validate first half bet choice", () => {
                    // Arrange
                    mockGameData.remainingTime = 59;
                    const betChoice = BET_CHOICES.home;

                    // Act
                    const result = placeBetConsumer.composeBetChoiceValidationCriteria(betChoice);

                    // Assert
                    expect(result[0].failure).toBe(false);
                    expect(result[0].notice).toEqual({ errorCode: "SB1935" });
                });

                it("right after lockingBetSecondHalf, should NOT validate second half bet choice", () => {
                    // Arrange
                    mockGameData.remainingTime = 59;
                    const betChoice = LIVE_BET_CHOICES.homeLive;

                    // Act
                    const result = placeBetConsumer.composeBetChoiceValidationCriteria(betChoice);

                    // Assert
                    expect(result[0].failure).toBe(false);
                    expect(result[0].notice).toEqual({ errorCode: "SB1935" });
                });
            });
        });

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
                expect(result[1].failure).toBe(true);
                expect(result[1].notice).toEqual({ errorCode: "SB1935" });
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
                expect(result[1].failure).toBe(false);
            });

            it("should fail validation when the odds for the bet choice is undefined (defaults to zero)", () => {
                // Arrange
                mockGameData.dynamicOdds = {};
                const betChoice = BET_CHOICES.home;

                // Act
                const result = placeBetConsumer.composeBetChoiceValidationCriteria(betChoice);

                // Assert
                expect(result[1].failure).toBe(true);
                expect(result[1].notice).toEqual({ errorCode: "SB1935" });
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
            });
        });

        describe("max bet per choice validation", () => {
            it("should fail validation when bet amount exceeds max bet per choice for first half", () => {
                // Arrange
                const betChoice = BET_CHOICES.home;
                const amount = 600;
                const freeBet = false;

                // Act
                const result = placeBetConsumer.composeBetAmountValidationCriteria(mockPlayer, betChoice, amount, freeBet);

                // Assert
                expect(result[1].failure).toBe(true);
                expect(result[1].notice).toEqual({ errorCode: "SB1910", maxBet: 500 });
            });

            it("should fail validation when bet amount plus existing bet exceeds max bet per choice", () => {
                // Arrange
                mockGameData.ingame.testPlayer.betTracks = {
                    [BET_CHOICES.home]: 300,
                };
                const betChoice = BET_CHOICES.home;
                const amount = 300;
                const freeBet = false;

                // Act
                const result = placeBetConsumer.composeBetAmountValidationCriteria(mockPlayer, betChoice, amount, freeBet);

                // Assert
                expect(result[1].failure).toBe(true);
                expect(result[1].notice).toEqual({ errorCode: "SB1910", maxBet: 500 });
            });

            it("should limit max bet based on odds for second half bets", () => {
                // Arrange
                mockGameData.dynamicOdds = {
                    [BET_CHOICES.homeLive]: 2.5,
                };
                const betChoice = BET_CHOICES.homeLive;
                const amount = 1000;
                const freeBet = false;

                // Act
                const result = placeBetConsumer.composeBetAmountValidationCriteria(mockPlayer, betChoice, amount, freeBet);

                // Assert
                // maxBet / (odds - 1) = 1000 / (2.5 - 1) = 666.67
                expect(result[1].failure).toBe(true);
                expect(result[1].notice).toEqual({ errorCode: "SB1910", maxBet: 600 });
            });

            it("should limit max bet based on odds when odds-based calculation is smaller than both player profile max bet and settings max bet", () => {
                // Arrange
                mockGameData.dynamicOdds = {
                    [BET_CHOICES.homeLive]: 3.0, // Higher odds will result in smaller max bet
                };
                const betChoice = BET_CHOICES.homeLive;
                const amount = 1000;
                const freeBet = false;

                (placeBetConsumer.gameData.currencyGroupGames as any) = [
                    {
                        groupId: "1",
                        minBet: 20,
                        maxBet: 200,
                        maxBetPerChoices: {
                            home: 500,
                            homeLive: 600,
                        },
                    },
                ];

                // Act
                const result = placeBetConsumer.composeBetAmountValidationCriteria(mockPlayer, betChoice, amount, freeBet);

                // Assert
                // maxBet / (odds - 1) = 1000 / (3.0 - 1) = 500
                expect(result[1].failure).toBe(true);
                expect(result[1].notice).toEqual({ errorCode: "SB1910", maxBet: 100 });
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
                const betChoice = BET_CHOICES.homeLive;
                const amount = 500;
                const freeBet = false;

                // Act
                const result = placeBetConsumer.composeBetAmountValidationCriteria(mockPlayer, betChoice, amount, freeBet);

                // Assert
                expect(result[4].failure).toBe(true);
                expect(result[4].notice).toEqual({ errorCode: "SB1911", maxBet: 1000 });
            });

            it("should fail validation when total amount across multiple bet choices exceeds max bet", () => {
                // Arrange
                mockGameData.ingame.testPlayer.betTracks = {
                    [BET_CHOICES.home]: 300,
                    [BET_CHOICES.away]: 400,
                    [BET_CHOICES.homeLive]: 200,
                };
                const betChoice = BET_CHOICES.homeLive;
                const amount = 200;
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
        describe("when bet choice is violated hedge bet criteria", () => {
            it("should return failure with hedge bet notice between first half", () => {
                // Arrange
                mockGameData.ingame.testPlayer.betTracks = {
                    [BET_CHOICES.home]: 300,
                };

                // Act
                const actualResult = placeBetConsumer.composeHedgeBetValidationCriteria(BET_CHOICES.away, mockPlayer);

                // Assert
                expect(!!actualResult[0].failure).toBe(true);
                expect(actualResult[0].notice).toEqual({ errorCode: "SB1939", hedgeBetGroup: [BET_CHOICES.home, BET_CHOICES.away] });
            });

            it("should return failure with hedge bet notice between first half and second half", () => {
                // Arrange
                mockGameData.ingame.testPlayer.betTracks = {
                    [BET_CHOICES.home]: 300,
                };

                // Act
                const actualResult = placeBetConsumer.composeHedgeBetValidationCriteria(BET_CHOICES.awayLive, mockPlayer);

                // Assert
                expect(!!actualResult[0].failure).toBe(true);
                expect(actualResult[0].notice).toEqual({ errorCode: "SB1939", hedgeBetGroup: [BET_CHOICES.home, BET_CHOICES.awayLive] });
            });
        });

        describe("when bet choice is NOT violated hedge bet criteria", () => {
            it("should return NO failure with hedge bet notice", () => {
                // Arrange
                mockGameData.ingame.testPlayer.betTracks = {
                    [BET_CHOICES.home]: 300,
                };

                // Act
                const actualResult = placeBetConsumer.composeHedgeBetValidationCriteria(BET_CHOICES.draw, mockPlayer);

                // Assert
                expect(!!actualResult[0].failure).toBe(false);
                expect(actualResult[0].notice).toEqual({ errorCode: "SB1939", hedgeBetGroup: [] });
            });
        });
    });
});
