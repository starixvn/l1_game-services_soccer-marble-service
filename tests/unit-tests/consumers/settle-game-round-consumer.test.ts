import SettleGameRoundConsumer from "../../../src/consumers/settle-game-round-consumer";

describe("SettleGameRoundConsumer", () => {
    let consumer: SettleGameRoundConsumer & {
        roundsRepository: any;
        roundResultPublisher: any;
        settleBets: jest.Mock;
        gameData: any;
    };

    beforeEach(() => {
        consumer = Object.create(SettleGameRoundConsumer.prototype) as any;
        consumer.roundsRepository = { create: jest.fn() };
        consumer.roundResultPublisher = {
            publishRoundResult: jest.fn(),
            publishWinners: jest.fn(),
        };
        consumer.settleBets = jest.fn();
        consumer.gameData = {
            exchangeRates: { exId: 789 },
            winningPlayers: ["u1", "u2"],
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("settleSpecificRound", () => {
        it("should create round, publish results, settle bets, and publish winners when creation succeeds", async () => {
            // Arrange
            const roundId = 123;
            const result = { home: 2, away: 1 } as any;
            const settlementResult = { 0: { home: true, away: false } } as any;
            const created = { id: roundId, time: new Date() };
            consumer.roundsRepository.create.mockResolvedValue(created);

            // Act
            await consumer.settleSpecificRound({ roundId, result, settlementResult });

            // Assert
            expect(consumer.roundsRepository.create).toHaveBeenCalledWith({
                id: roundId,
                result,
                settlementResult,
                time: expect.any(Date),
                exchangeRateId: 789,
            });
            expect(consumer.roundResultPublisher.publishRoundResult).toHaveBeenCalledWith({
                result,
                settlementResult,
                roundId,
            });
            expect(consumer.settleBets).toHaveBeenCalledWith({
                settlementResult,
                result,
                roundId: created.id,
                time: created.time,
            });
            expect(consumer.roundResultPublisher.publishWinners).toHaveBeenCalledWith(roundId, consumer.gameData.winningPlayers);
        });

        it("should do nothing after creation when repository returns null", async () => {
            // Arrange
            const roundId = 456;
            consumer.roundsRepository.create.mockResolvedValue(null);

            // Act
            await consumer.settleSpecificRound({ roundId, result: {} as any, settlementResult: {} as any });

            // Assert
            expect(consumer.roundsRepository.create).toHaveBeenCalled();
            expect(consumer.roundResultPublisher.publishRoundResult).not.toHaveBeenCalled();
            expect(consumer.settleBets).not.toHaveBeenCalled();
            expect(consumer.roundResultPublisher.publishWinners).not.toHaveBeenCalled();
        });
    });

    describe("calculateBetResult", () => {
        it("should calculate winning and losing amounts for non-free bet", () => {
            // Arrange
            const settlementResult = {
                0: { home: true, away: false },
            } as any;
            const bet = { index: 0, home: 100, away: 50, freeBet: false };
            const odds = { home: 2.0, away: 2.5 } as Record<string, number>;

            // Act
            const result = consumer.calculateBetResult(settlementResult, bet, odds);

            // Assert
            expect(result.totalBetAmount).toBe(150);
            expect(result.totalWin).toBe(200);
            expect(result.netWin).toBe(100);
            expect(result.totalLost).toBe(50);
            expect((result.winningByChoices as any).home).toBe(200);
            expect((result.winningByChoices as any).away).toBe(0);
        });

        it("should use _doc when present and handle free bet correctly", () => {
            // Arrange
            const settlementResult = {
                0: { home: true },
            } as any;
            const bet = { _doc: { index: 0, home: 100, freeBet: true } } as any;
            const odds = { home: 2.0 } as Record<string, number>;

            // Act
            const result = consumer.calculateBetResult(settlementResult, bet, odds);

            // Assert
            expect(result.totalBetAmount).toBe(100);
            expect(result.totalWin).toBe(100); // (2 - 1) * 100
            expect(result.netWin).toBe(0); // free bet excludes stake
            expect(result.totalLost).toBe(0);
            expect((result.winningByChoices as any).home).toBe(100);
        });

        it("should default odds to 1 and bet amount to 0 when missing", () => {
            // Arrange
            const settlementResult = {
                0: { draw: true },
            } as any;
            const bet = { index: 0 } as any; // no draw amount provided, defaults to 0
            const odds = {} as Record<string, number>; // missing odds default to 1

            // Act
            const result = consumer.calculateBetResult(settlementResult, bet, odds);

            // Assert
            expect(result.totalBetAmount).toBe(0);
            expect(result.totalWin).toBe(0);
            expect(result.netWin).toBe(0);
            expect(result.totalLost).toBe(0);
            expect((result.winningByChoices as any).draw).toBe(0);
        });

        it("should round totals to two decimals", () => {
            // Arrange
            const settlementResult = {
                0: { home: true },
            } as any;
            const bet = { index: 0, home: 33.3333, freeBet: false } as any;
            const odds = { home: 3.3333 } as Record<string, number>;

            // Act
            const result = consumer.calculateBetResult(settlementResult, bet, odds);

            // Assert
            expect(result.totalWin).toBe(111.11);
            expect(result.netWin).toBe(77.78);
        });
        
        it("should compute all zeros when all selections lose", () => {
            // Arrange
            const settlementResult = {
                0: { home: false, away: false },
            } as any;
            const bet = { index: 0, home: 40, away: 60, freeBet: false } as any;
            const odds = { home: 2, away: 3 } as Record<string, number>;

            // Act
            const result = consumer.calculateBetResult(settlementResult, bet, odds);

            // Assert
            expect(result.totalBetAmount).toBe(100);
            expect(result.totalWin).toBe(0);
            expect(result.netWin).toBe(0);
            expect(result.totalLost).toBe(100);
            expect((result.winningByChoices as any).home).toBe(0);
            expect((result.winningByChoices as any).away).toBe(0);
        });
    });
});


