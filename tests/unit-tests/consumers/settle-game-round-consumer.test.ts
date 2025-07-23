import { Table } from "sc-game-base";
import SettleGameRoundConsumer from "../../../src/consumers/settle-game-round-consumer";
import GameData from "../../../src/game-data";
import {
    betsRepository,
    endGame,
    gameManagementApiClientFactory,
    roundResultPublisher,
    roundsRepository,
    tempBetsRepository,
} from "../global-stubs";
import { stub } from "jest-auto-stub";
import GameDefinition from "../../../src/game-definition";
import { OddsType } from "../../../src/match-configs";
import { BET_CHOICES } from "../../../src/constants";
import { SettlementResultType } from "../../../src/models/rounds";
import { EventResponse } from "../../../src/consumers/odd-feed-consumer";

describe("SettleGameRoundConsumer", () => {
    let settleGameRoundConsumer: SettleGameRoundConsumer;
    let mockContainer: any;
    const gameData = stub<GameData>();
    const definition = stub<GameDefinition>();

    beforeEach(() => {
        mockContainer = {
            gameData: gameData,
            definition,
            roundResultPublisher,
            endGame,
            roundsRepository,
            betsRepository,
            gameManagementApiClientFactory,
            tempBetsRepository,
        };

        // Create the instance
        settleGameRoundConsumer = new SettleGameRoundConsumer(mockContainer);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("constructor", () => {
        it("should initialize with the provided container", () => {
            // Assert
            expect(settleGameRoundConsumer.gameData).toBe(gameData);
            expect(settleGameRoundConsumer.definition).toBe(definition);
        });
    });

    describe("settleRound", () => {
        it("should call super.settleRound", async () => {
            // Arrange
            const superSettleRoundSpy = jest
                .spyOn(Table.EventConsumers.TableSettleGameRoundConsumer.prototype, "settleRound")
                .mockResolvedValue();

            // Act
            await settleGameRoundConsumer.settleRound();

            // Assert
            expect(superSettleRoundSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe("settleSpecificRound", () => {
        it("should settle a specific round successfully", async () => {
            // Arrange
            const roundId = 123;
            const gameId = 456;
            const mockRound: EventResponse = {
                eventID: 12345,
                eventNameAKey: "Team A",
                eventNameBKey: "Team B",
                scheduleStartTs: new Date(),
                productCode: "SOCCER",
                productTypeKey: "MATCH",
                eventDetails: [
                    {
                        eventID: 12345,
                        scheduleStartTs: new Date(),
                        oddsAvailableTs: new Date(),
                        resultsAvailableTs: new Date(),
                        hasResults: true,
                        playlist: "test-playlist",
                        goalInfo: "test-goal-info",
                        result: "2:1",
                        markets: []
                    }
                ]
            };

            gameData.gameId = gameId;
            gameData.oddFeedGames = {
                [gameId]: {
                    rounds: {
                        [roundId]: mockRound
                    }
                }
            };
            gameData.exchangeRates = { exId: 789 } as any;

            definition.settle = jest.fn().mockReturnValue({
                home: true,
                away: false,
                draw: false
            });

            roundsRepository.create = jest.fn().mockResolvedValue({
                id: roundId,
                result: { home: 2, away: 1 },
                settlementResult: { home: true, away: false, draw: false },
                time: new Date(),
                exchangeRateId: 789
            });

            settleGameRoundConsumer.settleBets = jest.fn().mockResolvedValue(undefined);

            // Act
            await settleGameRoundConsumer.settleSpecificRound(roundId);

            // Assert
            expect(definition.settle).toHaveBeenCalledWith(mockRound);
            expect(roundsRepository.create).toHaveBeenCalledWith({
                id: roundId,
                result: { home: 2, away: 1 },
                settlementResult: { home: true, away: false, draw: false },
                time: expect.any(Date),
                exchangeRateId: 789
            });
            expect(roundResultPublisher.publishRoundResult).toHaveBeenCalledWith({
                result: { home: 2, away: 1 },
                settlementResult: { home: true, away: false, draw: false },
                roundId
            });
            expect(settleGameRoundConsumer.settleBets).toHaveBeenCalledWith({
                settlementResult: { home: true, away: false, draw: false },
                result: { home: 2, away: 1 },
                roundId,
                time: expect.any(Date)
            });
            expect(roundResultPublisher.publishWinners).toHaveBeenCalledWith(roundId, gameData.winningPlayers);
            expect(gameData.oddFeedGames[gameId].rounds[roundId]).toBeUndefined();
        });

        it("should return early when gameId is not set", async () => {
            // Arrange
            const roundId = 123;
            gameData.gameId = undefined;
            gameData.oddFeedGames = {};
            definition.settle = jest.fn();

            // Act
            await settleGameRoundConsumer.settleSpecificRound(roundId);

            // Assert
            expect(definition.settle).not.toHaveBeenCalled();
            expect(roundsRepository.create).not.toHaveBeenCalled();
        });

        it("should handle undefined round gracefully", async () => {
            // Arrange
            const roundId = 123;
            const gameId = 456;
            gameData.gameId = gameId;
            gameData.oddFeedGames = {
                [gameId]: {
                    rounds: {}
                }
            };
            gameData.exchangeRates = { exId: 789 } as any;
            definition.settle = jest.fn().mockReturnValue({ home: false, away: false, draw: false });

            // Act & Assert
            await expect(settleGameRoundConsumer.settleSpecificRound(roundId)).rejects.toThrow();
        });

        it("should not publish results when newRound creation fails", async () => {
            // Arrange
            const roundId = 123;
            const gameId = 456;
            const mockRound: EventResponse = {
                eventID: 12345,
                eventNameAKey: "Team A",
                eventNameBKey: "Team B",
                scheduleStartTs: new Date(),
                productCode: "SOCCER",
                productTypeKey: "MATCH",
                eventDetails: [
                    {
                        eventID: 12345,
                        scheduleStartTs: new Date(),
                        oddsAvailableTs: new Date(),
                        resultsAvailableTs: new Date(),
                        hasResults: true,
                        playlist: "test-playlist",
                        goalInfo: "test-goal-info",
                        result: "1:0",
                        markets: []
                    }
                ]
            };

            gameData.gameId = gameId;
            gameData.oddFeedGames = {
                [gameId]: {
                    rounds: {
                        [roundId]: mockRound
                    }
                }
            };
            gameData.exchangeRates = { exId: 789 } as any;

            definition.settle = jest.fn().mockReturnValue({
                home: true,
                away: false,
                draw: false
            });

            roundsRepository.create = jest.fn().mockResolvedValue(null);

            // Act
            await settleGameRoundConsumer.settleSpecificRound(roundId);

            // Assert
            expect(definition.settle).toHaveBeenCalledWith(mockRound);
            expect(roundsRepository.create).toHaveBeenCalled();
            expect(roundResultPublisher.publishRoundResult).not.toHaveBeenCalled();
            expect(roundResultPublisher.publishWinners).not.toHaveBeenCalled();
        });
    });

    describe("getResultFromRound", () => {
        it("should calculate result correctly from round with single event detail", () => {
            // Arrange
            const mockRound: EventResponse = {
                eventID: 12345,
                eventNameAKey: "Team A",
                eventNameBKey: "Team B",
                scheduleStartTs: new Date(),
                productCode: "SOCCER",
                productTypeKey: "MATCH",
                eventDetails: [
                    {
                        eventID: 12345,
                        scheduleStartTs: new Date(),
                        oddsAvailableTs: new Date(),
                        resultsAvailableTs: new Date(),
                        hasResults: true,
                        playlist: "test-playlist",
                        goalInfo: "test-goal-info",
                        result: "2:1",
                        markets: []
                    }
                ]
            };

            // Act
            const result = settleGameRoundConsumer.getResultFromRound(mockRound);

            // Assert
            expect(result).toEqual({ home: 2, away: 1 });
        });

        it("should calculate result correctly from round with multiple event details", () => {
            // Arrange
            const mockRound: EventResponse = {
                eventID: 12345,
                eventNameAKey: "Team A",
                eventNameBKey: "Team B",
                scheduleStartTs: new Date(),
                productCode: "SOCCER",
                productTypeKey: "MATCH",
                eventDetails: [
                    {
                        eventID: 12345,
                        scheduleStartTs: new Date(),
                        oddsAvailableTs: new Date(),
                        resultsAvailableTs: new Date(),
                        hasResults: true,
                        playlist: "test-playlist",
                        goalInfo: "test-goal-info",
                        result: "1:0",
                        markets: []
                    },
                    {
                        eventID: 12345,
                        scheduleStartTs: new Date(),
                        oddsAvailableTs: new Date(),
                        resultsAvailableTs: new Date(),
                        hasResults: true,
                        playlist: "test-playlist",
                        goalInfo: "test-goal-info",
                        result: "2:1",
                        markets: []
                    }
                ]
            };

            // Act
            const result = settleGameRoundConsumer.getResultFromRound(mockRound);

            // Assert
            expect(result).toEqual({ home: 3, away: 1 });
        });
    });

    describe("calculateBetResult", () => {
        // Common test objects
        const defaultSettlementResult = {
            [BET_CHOICES.home]: false,
            [BET_CHOICES.away]: false,
            [BET_CHOICES.draw]: false,
            [BET_CHOICES.over]: false,
            [BET_CHOICES.under]: false,
            [BET_CHOICES.odd]: false,
            [BET_CHOICES.even]: false,
            [BET_CHOICES.homeLive]: false,
            [BET_CHOICES.awayLive]: false,
            [BET_CHOICES.drawLive]: false,
            [BET_CHOICES.overLive]: false,
            [BET_CHOICES.underLive]: false,
            [BET_CHOICES.oddLive]: false,
            [BET_CHOICES.evenLive]: false,
        } as SettlementResultType;

        const odds = {
            home: 2.0,
            away: 2.0,
            draw: 2.0,
            over: 2.0,
            under: 2.0,
            odd: 2.0,
            even: 2.0,
        } as OddsType;

        it("should calculate bet result correctly for a winning bet", () => {
            // Arrange
            const settlementResult = { ...defaultSettlementResult, [BET_CHOICES.home]: true };
            const bet = { [BET_CHOICES.home]: 100, freeBet: false };

            // Act
            const result = settleGameRoundConsumer.calculateBetResult(settlementResult, bet, odds);

            // Assert
            expect(result.totalBetAmount).toBe(100);
            expect(result.totalWin).toBe(200);
            expect(result.netWin).toBe(100);
            expect((result.winningByChoices as any)[BET_CHOICES.home]).toEqual(200);
        });

        it("should calculate bet result correctly for a losing bet", () => {
            // Arrange
            const settlementResult = { ...defaultSettlementResult, [BET_CHOICES.away]: false };
            const bet = { [BET_CHOICES.away]: 100, freeBet: false };

            // Act
            const result = settleGameRoundConsumer.calculateBetResult(settlementResult, bet, odds);

            // Assert
            expect(result.totalBetAmount).toBe(100);
            expect(result.totalWin).toBe(0);
            expect(result.totalLost).toBe(100);
            expect((result.winningByChoices as any)[BET_CHOICES.away]).toEqual(0);
        });

        it("should handle free bets correctly", () => {
            // Arrange
            const settlementResult = { ...defaultSettlementResult, [BET_CHOICES.home]: true };
            const bet = { [BET_CHOICES.home]: 100, freeBet: true };

            // Act
            const result = settleGameRoundConsumer.calculateBetResult(settlementResult, bet, odds);

            // Assert
            expect(result.totalBetAmount).toBe(100);
            expect(result.totalWin).toBe(100);
            expect(result.netWin).toBe(0);
            expect((result.winningByChoices as any)[BET_CHOICES.home]).toEqual(100);
        });

        it("should handle multiple bets correctly", () => {
            // Arrange
            const settlementResult = { ...defaultSettlementResult, [BET_CHOICES.home]: true, [BET_CHOICES.over]: true };
            const bet = { [BET_CHOICES.home]: 100, [BET_CHOICES.over]: 50, freeBet: false };

            // Act
            const result = settleGameRoundConsumer.calculateBetResult(settlementResult, bet, odds);

            // Assert
            expect(result.totalBetAmount).toBe(150);
            expect(result.totalWin).toBe(300);
            expect(result.netWin).toBe(150);
            expect((result.winningByChoices as any)[BET_CHOICES.home]).toEqual(200);
            expect((result.winningByChoices as any)[BET_CHOICES.over]).toEqual(100);
        });

        it("should round results to 2 decimal places", () => {
            // Arrange
            const settlementResult = { ...defaultSettlementResult, [BET_CHOICES.home]: true };
            const bet = { [BET_CHOICES.home]: 100, freeBet: false };

            // Act
            const result = settleGameRoundConsumer.calculateBetResult(settlementResult, bet, odds);

            // Assert
            expect(result.totalWin).toBe(200);
            expect(result.netWin).toBe(100);
        });

        it("should handle bet with _doc property", () => {
            // Arrange
            const settlementResult = { ...defaultSettlementResult, [BET_CHOICES.home]: true };
            const bet = { 
                _doc: { [BET_CHOICES.home]: 100, freeBet: false },
                [BET_CHOICES.home]: 200, 
                freeBet: false 
            };

            // Act
            const result = settleGameRoundConsumer.calculateBetResult(settlementResult, bet, odds);

            // Assert
            expect(result.totalBetAmount).toBe(100);
            expect(result.totalWin).toBe(200);
            expect(result.netWin).toBe(100);
        });
    });
});
