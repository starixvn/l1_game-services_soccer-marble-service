import { Core } from "sc-game-base";
import PlaceBetConsumer from "../../../src/consumers/place-bet-consumer";
import GameDefinition from "../../../src/game-definition";
import { BET_CHOICES, LIVE_BET_CHOICES } from "../../../src/constants";
import { BetStatusService } from "../../../src/features/bet-status/bet-status-service";
import { HedgeBetService } from "../../../src/features/bet-status/hedge-bet-service";
import * as eventIdHelper from "../../../src/helpers/eventid";
import { mock as stub } from "jest-mock-extended";

jest.mock("../../../src/helpers/eventid");

const mockedEventIdHelper = eventIdHelper as jest.Mocked<typeof eventIdHelper>;

describe("PlaceBetConsumer", () => {
    let placeBetConsumer: PlaceBetConsumer;
    let mockGameDefinition: any;
    let mockGameData: any;
    let mockEventPublisher: any;
    let mockBetStatusService: BetStatusService;
    let mockHedgeBetService: HedgeBetService;
    let mockPlayer: {
        UID: string;
        profile: {
            name: string;
            minBet: number;
            maxBet: number;
        };
        session: {
            currencyGroupId: string;
            currencyName: string;
            system: string;
            operatorId: string;
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

        // Create service mocks
        mockBetStatusService = stub<BetStatusService>();
        mockHedgeBetService = stub<HedgeBetService>();

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
            UID: "test-uid-123",
            profile: {
                name: "testPlayer",
                minBet: 10,
                maxBet: 1000,
            },
            session: {
                currencyGroupId: "1",
                currencyName: "USD",
                system: "test-system",
                operatorId: "test-operator",
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

        // Setup BetStatusService mocks
        Object.defineProperty(mockBetStatusService, 'currentRoundId', {
            value: 1,
            writable: true
        });
        Object.defineProperty(mockBetStatusService, 'betStatusByGameId', {
            value: { "123": true },
            writable: true
        });
        Object.defineProperty(mockBetStatusService, 'dynamicOddsByGameId', {
            value: {
                "123": {
                    [BET_CHOICES.home]: 1.5,
                    [BET_CHOICES.away]: 2.0,
                    [BET_CHOICES.draw]: 3.0,
                    [LIVE_BET_CHOICES.homeLive]: 1.8,
                    [LIVE_BET_CHOICES.awayLive]: 2.2,
                }
            },
            writable: true
        });
        (mockBetStatusService.getBetStatus as jest.Mock).mockReturnValue({
            currentIndex: 0,
            odds: {
                [BET_CHOICES.home]: 1.5,
                [BET_CHOICES.away]: 2.0,
                [BET_CHOICES.draw]: 3.0,
            },
            points: {}
        });

        // Setup HedgeBetService mocks
        (mockHedgeBetService.verifyHedgeBetRestriction as jest.Mock).mockReturnValue(new Set());

        // Mock the parent class methods
        jest.spyOn(Core.BaseEventConsumers.PlaceBetConsumer.prototype, "getNoticeObj").mockImplementation((notice: any, params?: any) => {
            if (notice === "SB1935") return { errorCode: "SB1935" };
            if (notice === "SB1910") return { errorCode: "SB1910", maxBet: params?.maxBet };
            if (notice === "SB1909") return { errorCode: "SB1909", minBet: params?.minBet };
            if (notice === "SB1911") return { errorCode: "SB1911", maxBet: params?.maxBet };
            if (notice === "SB1939") return { errorCode: "SB1939", hedgeBetGroup: params?.hedgeBetGroup };
            if (notice === "SB1905") return { errorCode: "SB1905" };
            return { errorCode: notice };
        });

        // Mock helper functions
        mockedEventIdHelper.extractGameId.mockReturnValue(123);

        placeBetConsumer = new PlaceBetConsumer(
            mockGameDefinition, 
            mockGameData, 
            mockEventPublisher,
            mockHedgeBetService,
            mockBetStatusService
        );
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
            it("should fail validation when round id does not match betStatusService.currentRoundId", () => {
                // Arrange
                const wrongRoundId = 999;
                mockBetStatusService.currentRoundId = 1;

                // Act
                const result = placeBetConsumer.composeBettingTimeValidationCriteria(wrongRoundId);

                // Assert
                expect(result[1].failure).toBe(true);
                expect(result[1].notice).toEqual({ errorCode: "SB1935" });
            });

            it("should pass validation when round id matches betStatusService.currentRoundId", () => {
                // Arrange
                const correctRoundId = 1;
                mockBetStatusService.currentRoundId = 1;

                // Act
                const result = placeBetConsumer.composeBettingTimeValidationCriteria(correctRoundId);

                // Assert
                expect(result[1].failure).toBe(false);
            });
        });

        describe("betting status validation", () => {
            it("should fail validation when betStatusByGameId is false for the game", () => {
                // Arrange
                Object.defineProperty(mockBetStatusService, 'betStatusByGameId', {
                    value: { "123": false },
                    writable: true
                });

                // Act
                const result = placeBetConsumer.composeBettingTimeValidationCriteria(roundId);

                // Assert
                expect(result[2].failure).toBe(true);
                expect(result[2].notice).toEqual({ errorCode: "SB1905" });
            });

            it("should pass validation when betStatusByGameId is true for the game", () => {
                // Arrange
                Object.defineProperty(mockBetStatusService, 'betStatusByGameId', {
                    value: { "123": true },
                    writable: true
                });

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
                Object.defineProperty(mockBetStatusService, 'dynamicOddsByGameId', {
                    value: {
                        "123": {
                    [BET_CHOICES.home]: 0,
                        }
                    },
                    writable: true
                });
                const betChoice = BET_CHOICES.home;

                // Act
                const result = placeBetConsumer.composeBetChoiceValidationCriteria(betChoice);

                // Assert
                expect(result[0].failure).toBe(true);
                expect(result[0].notice).toEqual({ errorCode: "SB1935" });
            });

            it("should pass validation when the odds for the bet choice is not zero", () => {
                // Arrange
                Object.defineProperty(mockBetStatusService, 'dynamicOddsByGameId', {
                    value: {
                        "123": {
                    [BET_CHOICES.home]: 1.5,
                        }
                    },
                    writable: true
                });
                const betChoice = BET_CHOICES.home;

                // Act
                const result = placeBetConsumer.composeBetChoiceValidationCriteria(betChoice);

                // Assert
                expect(result[0].failure).toBe(false);
                expect(result[0].notice).toEqual({ errorCode: "SB1935" });
            });

            it("should fail validation when the odds for the bet choice is undefined (defaults to zero)", () => {
                // Arrange
                Object.defineProperty(mockBetStatusService, 'dynamicOddsByGameId', {
                    value: {
                        "123": {}
                    },
                    writable: true
                });
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
                const amount = 3100; // Exceeds the hardcoded 3000 limit
                const freeBet = false;

                // Act
                const result = placeBetConsumer.composeBetAmountValidationCriteria(mockPlayer, betChoice, amount, freeBet);

                // Assert
                expect(result[1].failure).toBe(true);
                expect(result[1].notice).toEqual({ errorCode: "SB1910", maxBet: 3000 });
            });

            it("should fail validation when bet amount plus existing bet exceeds max bet per choice", () => {
                // Arrange
                mockGameData.ingame.testPlayer.betTracks = {
                    [BET_CHOICES.home]: 2500,
                };
                const betChoice = BET_CHOICES.home;
                const amount = 600; // 2500 + 600 = 3100 > 3000
                const freeBet = false;

                // Act
                const result = placeBetConsumer.composeBetAmountValidationCriteria(mockPlayer, betChoice, amount, freeBet);

                // Assert
                expect(result[1].failure).toBe(true);
                expect(result[1].notice).toEqual({ errorCode: "SB1910", maxBet: 3000 });
            });

            it("should pass validation when bet amount is within limits", () => {
                // Arrange
                mockGameData.ingame.testPlayer.betTracks = {
                    [BET_CHOICES.home]: 1000,
                };
                const betChoice = BET_CHOICES.home;
                const amount = 500; // 1000 + 500 = 1500 < 3000
                const freeBet = false;

                // Act
                const result = placeBetConsumer.composeBetAmountValidationCriteria(mockPlayer, betChoice, amount, freeBet);

                // Assert
                expect(result[1].failure).toBe(false);
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

            it("should handle missing ingame player by using empty betTracks fallback", () => {
                // Arrange: remove player so coalesce to { betTracks: {} } triggers
                delete mockGameData.ingame.testPlayer;
                const betChoice = BET_CHOICES.home;
                const amount = 100; // within limits
                const freeBet = false;

                // Act
                const result = placeBetConsumer.composeBetAmountValidationCriteria(mockPlayer, betChoice, amount, freeBet);

                // Assert: should not fail any of amount validations (index 1,3,4)
                expect(result[1].failure).toBe(false);
                expect(result[3].failure).toBe(false);
                expect(result[4].failure).toBe(false);
            });

            it("should treat undefined betTracks values as 0 via nullish coalescing", () => {
                // Arrange: include undefined to exercise (amount ?? 0) in reducer
                mockGameData.ingame.testPlayer.betTracks = {
                    [BET_CHOICES.home]: undefined as unknown as number,
                };
                const betChoice = BET_CHOICES.home;
                const amount = 100; // within limits
                const freeBet = false;

                // Act
                const result = placeBetConsumer.composeBetAmountValidationCriteria(mockPlayer, betChoice, amount, freeBet);

                // Assert: undefined should be treated as 0 so totals remain within limits
                expect(result[1].failure).toBe(false);
                expect(result[3].failure).toBe(false);
                expect(result[4].failure).toBe(false);
            });
        });

        describe("max bet validation", () => {
            it("should fail validation when bet amount exceeds max bet", () => {
                // Arrange
                const betChoice = BET_CHOICES.home;
                const amount = 3100; // Exceeds the hardcoded 3000 limit
                const freeBet = false;

                // Act
                const result = placeBetConsumer.composeBetAmountValidationCriteria(mockPlayer, betChoice, amount, freeBet);

                // Assert
                expect(result[3].failure).toBe(true);
                expect(result[3].notice).toEqual({ errorCode: "SB1911", maxBet: 3000 });
            });

            it("should fail validation when total bet amount exceeds max bet", () => {
                // Arrange
                mockGameData.ingame.testPlayer.betTracks = {
                    [BET_CHOICES.home]: 2000,
                };
                const betChoice = LIVE_BET_CHOICES.homeLive;
                const amount = 1100; // 2000 + 1100 = 3100 > 3000
                const freeBet = false;

                // Act
                const result = placeBetConsumer.composeBetAmountValidationCriteria(mockPlayer, betChoice, amount, freeBet);

                // Assert
                expect(result[4].failure).toBe(true);
                expect(result[4].notice).toEqual({ errorCode: "SB1911", maxBet: 3000 });
            });
        });
    });

    describe("consume", () => {
        let mockPayload: any;

        beforeEach(() => {
            mockPayload = {
                amount: 100.5,
                betChoice: BET_CHOICES.home,
                freeBet: false,
                roundId: 1,
                m: 1,
                clientSeed: "test-seed"
            };

            // Mock the parent class methods
            jest.spyOn(placeBetConsumer, "validateRequestParams").mockReturnValue(true);
            jest.spyOn(placeBetConsumer, "validateBetRequest").mockReturnValue(true);
            jest.spyOn(placeBetConsumer, "adjustBetTracks").mockImplementation();
        });

        describe("when validation fails", () => {
            it("should return early when validateRequestParams fails", () => {
                // Arrange
                jest.spyOn(placeBetConsumer, "validateRequestParams").mockReturnValue(false);
                const initialIngameState = { ...mockGameData.ingame };

                // Act
                placeBetConsumer.consume(mockPlayer, mockPayload);

                // Assert
                expect(placeBetConsumer.validateRequestParams).toHaveBeenCalledWith(mockPayload, mockPlayer);
                expect(placeBetConsumer.validateBetRequest).not.toHaveBeenCalled();
                expect(placeBetConsumer.adjustBetTracks).not.toHaveBeenCalled();
                expect(mockGameData.ingame).toEqual(initialIngameState);
            });

            it("should return early when validateBetRequest fails", () => {
                // Arrange
                jest.spyOn(placeBetConsumer, "validateBetRequest").mockReturnValue(false);
                const initialIngameState = { ...mockGameData.ingame };

                // Act
                placeBetConsumer.consume(mockPlayer, mockPayload);

                // Assert
                expect(placeBetConsumer.validateRequestParams).toHaveBeenCalledWith(mockPayload, mockPlayer);
                expect(placeBetConsumer.validateBetRequest).toHaveBeenCalledWith(
                    mockPlayer, 
                    BET_CHOICES.home, 
                    100, // amount should be floored
                    false, 
                    1
                );
                expect(placeBetConsumer.adjustBetTracks).not.toHaveBeenCalled();
                expect(mockGameData.ingame).toEqual(initialIngameState);
            });
        });

        describe("when validation passes", () => {
            it("should process payload and create new player when player doesn't exist in ingame", () => {
                // Arrange
                delete mockGameData.ingame.testPlayer;
                (mockBetStatusService.getBetStatus as jest.Mock).mockReturnValue({
                    currentIndex: 2
                });

                // Act
                placeBetConsumer.consume(mockPlayer, mockPayload);

                // Assert
                expect(mockPayload.amount).toBe(100); // Should be floored
                expect(mockPayload.freeBet).toBe(false);
                expect(mockPayload.roundId).toBe(1);
                expect(mockPayload.mode).toBe(1);
                expect(mockPayload.receivedTime).toBeInstanceOf(Date);
                expect(mockPayload.index).toBe(2);

                expect(mockGameData.ingame.testPlayer).toEqual({
                    name: "testPlayer",
                    currency: "USD",
                    system: "test-system",
                    betTracks: {},
                    betQueue: [{ player: mockPlayer, payload: mockPayload }],
                    clientSeed: "test-seed",
                    operatorId: "test-operator",
                });

                expect(placeBetConsumer.adjustBetTracks).toHaveBeenCalledWith("testPlayer", mockPayload);
            });

            it("should process payload and add to existing player when player exists in ingame", () => {
                // Arrange
                mockGameData.ingame.testPlayer = {
                    name: "testPlayer",
                    currency: "USD",
                    system: "test-system",
                    betTracks: { home: 50 },
                    betQueue: [],
                    clientSeed: "existing-seed",
                    operatorId: "test-operator",
                };
                (mockBetStatusService.getBetStatus as jest.Mock).mockReturnValue({
                    currentIndex: 1
                });

                // Act
                placeBetConsumer.consume(mockPlayer, mockPayload);

                // Assert
                expect(mockGameData.ingame.testPlayer.betQueue).toHaveLength(1);
                expect(mockGameData.ingame.testPlayer.betQueue[0]).toEqual({
                    player: mockPlayer,
                    payload: mockPayload
                });
                expect(mockGameData.ingame.testPlayer.betTracks).toEqual({ home: 50 }); // Should remain unchanged
                expect(placeBetConsumer.adjustBetTracks).toHaveBeenCalledWith("testPlayer", mockPayload);
            });

            it("should handle payload with default values", () => {
                // Arrange
                const payloadWithDefaults: any = {
                    betChoice: BET_CHOICES.away,
                    // Missing amount, freeBet, roundId, m
                };
                mockGameData.roundId = 999;
                delete mockGameData.ingame.testPlayer; // Ensure player doesn't exist
                (mockBetStatusService.getBetStatus as jest.Mock).mockReturnValue({
                    currentIndex: 0
                });

                // Act
                placeBetConsumer.consume(mockPlayer, payloadWithDefaults);

                // Assert
                expect(payloadWithDefaults.amount).toBe(0); // NaN >> 0 = 0
                expect(payloadWithDefaults.freeBet).toBe(false);
                expect(payloadWithDefaults.roundId).toBe(999); // Should use gameData.roundId
                expect(payloadWithDefaults.mode).toBe("1"); // Default DisplayMode.Landscape
                expect(payloadWithDefaults.index).toBe(0);
                
                // Verify player was created with default values
                expect(mockGameData.ingame.testPlayer).toBeDefined();
                expect(mockGameData.ingame.testPlayer.betQueue).toHaveLength(1);
            });
        });
    });

    describe("isBetChoiceOddZero", () => {
        it("should return true when odds is zero", () => {
            // Arrange
            Object.defineProperty(mockBetStatusService, 'dynamicOddsByGameId', {
                value: {
                    "123": {
                        [BET_CHOICES.home]: 0,
                    }
                },
                writable: true
            });

            // Act
            const result = (placeBetConsumer as any).isBetChoiceOddZero(BET_CHOICES.home);

            // Assert
            expect(result).toBe(true);
        });

        it("should return false when odds is greater than zero", () => {
            // Arrange
            Object.defineProperty(mockBetStatusService, 'dynamicOddsByGameId', {
                value: {
                    "123": {
                        [BET_CHOICES.home]: 1.5,
                    }
                },
                writable: true
            });

            // Act
            const result = (placeBetConsumer as any).isBetChoiceOddZero(BET_CHOICES.home);

            // Assert
            expect(result).toBe(false);
        });

        it("should return true when odds is undefined (defaults to 0)", () => {
            // Arrange
            Object.defineProperty(mockBetStatusService, 'dynamicOddsByGameId', {
                value: {
                    "123": {}
                },
                writable: true
            });

            // Act
            const result = (placeBetConsumer as any).isBetChoiceOddZero(BET_CHOICES.home);

            // Assert
            expect(result).toBe(true);
        });

        it("should return true when gameId doesn't exist in dynamicOddsByGameId", () => {
            // Arrange
            Object.defineProperty(mockBetStatusService, 'dynamicOddsByGameId', {
                value: {},
                writable: true
            });

            // Act
            const result = (placeBetConsumer as any).isBetChoiceOddZero(BET_CHOICES.home);

            // Assert
            expect(result).toBe(true);
        });
    });

    describe("adjustBetTracks", () => {
        let mockBet: any;
        let superAdjustBetTracksSpy: jest.SpyInstance;

        beforeEach(() => {
            mockBet = {
                betChoice: BET_CHOICES.home,
                roundId: 1,
                amount: 100
            };
            superAdjustBetTracksSpy = jest.spyOn(Core.BaseEventConsumers.PlaceBetConsumer.prototype, "adjustBetTracks").mockImplementation();
        });

        it("should call super.adjustBetTracks and hedgeBetService.trackHedgeBetRestriction", () => {
            // Act
            placeBetConsumer.adjustBetTracks("testPlayer", mockBet);

            // Assert
            expect(superAdjustBetTracksSpy).toHaveBeenCalledWith("testPlayer", mockBet);
            expect(mockHedgeBetService.trackHedgeBetRestriction).toHaveBeenCalledWith({
                gameId: "123",
                player: "testPlayer",
                betChoice: BET_CHOICES.home,
            });
        });

        it("should handle different bet choices", () => {
            // Arrange
            mockBet.betChoice = LIVE_BET_CHOICES.awayLive;

            // Act
            placeBetConsumer.adjustBetTracks("anotherPlayer", mockBet);

            // Assert
            expect(superAdjustBetTracksSpy).toHaveBeenCalledWith("anotherPlayer", mockBet);
            expect(mockHedgeBetService.trackHedgeBetRestriction).toHaveBeenCalledWith({
                gameId: "123",
                player: "anotherPlayer",
                betChoice: LIVE_BET_CHOICES.awayLive,
            });
        });

        it("should extract gameId from bet.roundId", () => {
            // Arrange
            mockBet.roundId = 456;
            mockedEventIdHelper.extractGameId.mockReturnValue(789);

            // Act
            placeBetConsumer.adjustBetTracks("testPlayer", mockBet);

            // Assert
            expect(mockedEventIdHelper.extractGameId).toHaveBeenCalledWith(456);
            expect(mockHedgeBetService.trackHedgeBetRestriction).toHaveBeenCalledWith({
                gameId: "789",
                player: "testPlayer",
                betChoice: BET_CHOICES.home,
            });
        });
    });

    describe("composeHedgeBetValidationCriteria", () => {
        describe("when bet choice violates hedge bet criteria", () => {
            it("should return failure with hedge bet notice when hedgeBetService returns violation", () => {
                // Arrange
                const violatingGroup = new Set([BET_CHOICES.home, BET_CHOICES.away]);
                (mockHedgeBetService.verifyHedgeBetRestriction as jest.Mock).mockReturnValue(violatingGroup);

                // Act
                const result = placeBetConsumer.composeHedgeBetValidationCriteria(BET_CHOICES.away, mockPlayer);

                // Assert
                expect(mockHedgeBetService.verifyHedgeBetRestriction).toHaveBeenCalledWith({
                    gameId: "123",
                    player: "testPlayer",
                    betChoice: BET_CHOICES.away,
                });
                expect(result[0].failure).toBe(true);
                expect(result[0].notice).toEqual({ 
                    errorCode: "SB1939", 
                    hedgeBetGroup: [BET_CHOICES.home, BET_CHOICES.away] 
                });
            });

            it("should return failure with hedge bet notice for cross-period violations", () => {
                // Arrange
                const violatingGroup = new Set([BET_CHOICES.home, LIVE_BET_CHOICES.awayLive]);
                (mockHedgeBetService.verifyHedgeBetRestriction as jest.Mock).mockReturnValue(violatingGroup);

                // Act
                const result = placeBetConsumer.composeHedgeBetValidationCriteria(LIVE_BET_CHOICES.awayLive, mockPlayer);

                // Assert
                expect(mockHedgeBetService.verifyHedgeBetRestriction).toHaveBeenCalledWith({
                    gameId: "123",
                    player: "testPlayer",
                    betChoice: LIVE_BET_CHOICES.awayLive,
                });
                expect(result[0].failure).toBe(true);
                expect(result[0].notice).toEqual({ 
                    errorCode: "SB1939", 
                    hedgeBetGroup: [BET_CHOICES.home, LIVE_BET_CHOICES.awayLive] 
                });
            });
        });

        describe("when bet choice does not violate hedge bet criteria", () => {
            it("should return no failure when hedgeBetService returns empty set", () => {
                // Arrange
                (mockHedgeBetService.verifyHedgeBetRestriction as jest.Mock).mockReturnValue(new Set());

                // Act
                const result = placeBetConsumer.composeHedgeBetValidationCriteria(BET_CHOICES.draw, mockPlayer);

                // Assert
                expect(mockHedgeBetService.verifyHedgeBetRestriction).toHaveBeenCalledWith({
                    gameId: "123",
                    player: "testPlayer",
                    betChoice: BET_CHOICES.draw,
                });
                expect(result[0].failure).toBe(false);
                expect(result[0].notice).toEqual({ errorCode: "SB1939", hedgeBetGroup: [] });
            });

            it("should return no failure when no existing bets create conflicts", () => {
                // Arrange
                (mockHedgeBetService.verifyHedgeBetRestriction as jest.Mock).mockReturnValue(new Set());

                // Act
                const result = placeBetConsumer.composeHedgeBetValidationCriteria(BET_CHOICES.home, mockPlayer);

                // Assert
                expect(mockHedgeBetService.verifyHedgeBetRestriction).toHaveBeenCalledWith({
                    gameId: "123",
                    player: "testPlayer",
                    betChoice: BET_CHOICES.home,
                });
                expect(result[0].failure).toBe(false);
                expect(result[0].notice).toEqual({ errorCode: "SB1939", hedgeBetGroup: [] });
            });

            it("should default hedgeBetGroup to [] when values() returns undefined", () => {
                // Arrange: craft an object with size and a values() that returns undefined
                const fakeGroup: any = { size: 0, values: () => undefined };
                (mockHedgeBetService.verifyHedgeBetRestriction as jest.Mock).mockReturnValue(fakeGroup);

                // Act
                const result = placeBetConsumer.composeHedgeBetValidationCriteria(BET_CHOICES.away, mockPlayer);

                // Assert
                expect(result[0].failure).toBe(false);
                expect(result[0].notice).toEqual({ errorCode: "SB1939", hedgeBetGroup: [] });
            });
        });
    });
}); 