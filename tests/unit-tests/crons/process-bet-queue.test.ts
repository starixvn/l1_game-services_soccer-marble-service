import ProcessBetQueue from "../../../src/crons/process-bet-queue";
import { TableProcessBetQueue } from "sc-game-base/src/table/crons";
import * as gameTimingHelper from "../../../src/helpers/game-timing";
import {
    baseMetrics,
    betLogsRepository,
    betsRepository,
    gameManagementApiClientFactory,
    logService,
    placeBet,
    placeBetPublisher,
} from "../global-stubs";

jest.mock("../../../src/helpers/game-timing");
jest.mock("sc-game-base/src/table/crons");

const mockedGameTimingHelper = gameTimingHelper as jest.Mocked<typeof gameTimingHelper>;

describe("ProcessBetQueue", () => {
    let processBetQueue: ProcessBetQueue;
    let mockGameData: any;
    let mockGameDefinition: any;
    let mockPlayer: any;
    let mockBet: any;
    let mockRate: number;

    beforeEach(() => {
        jest.clearAllMocks();

        mockGameData = {
            roundId: 1,
            remainingTime: 10,
            playerBetCount: {},
            dynamicOdds: {
                choice1: 1.5,
                choice2: 2.0,
            },
        };

        mockGameDefinition = {
            choices: ["choice1", "choice2"],
            durations: {
                placingBets: 10,
                lockingBet: 5,
                wholeRound: 30,
                placingBetsFirstHalf: 10,
                lockingBetFirstHalf: 5,
                startingRound: 2,
                streamingVideoFirstHalf: 4,
                placingBetsSecondHalf: 20,
                lockingBetSecondHalf: 15,
                streamingVideoSecondHalf: 14,
            },
        };

        mockPlayer = {
            UID: "player1",
            profile: {
                name: "Test Player",
            },
            session: {
                siteId: "site1",
                currencyName: "USD",
                operatorId: "op1",
                playerId: "pid1",
            },
        };

        mockBet = {
            amount: 100,
            betChoice: "choice1",
            roundId: 1,
            clientSeed: new Date(),
            freeBet: false,
        };

        mockRate = 1.5;

        // Mock the parent class constructor
        (TableProcessBetQueue as jest.MockedClass<typeof TableProcessBetQueue>).mockImplementation(function(this: any, container: any) {
            this.gameData = container.gameData;
            this.definition = container.definition;
            this.betsRepository = container.betsRepository;
            return this;
        });

        processBetQueue = new ProcessBetQueue({
            gameData: mockGameData,
            definition: mockGameDefinition,
            placeBetPublisher,
            placeBet,
            logService,
            betsRepository,
            betLogsRepository,
            gameManagementApiClientFactory,
            baseMetrics,
        });

        // Mock the helper function
        mockedGameTimingHelper.isWithinBettingTimeInCurrentEventDetail.mockReturnValue(true);
    });

    describe("adjustTotalBets", () => {
        it("should call adjustPlayerBetCount with correct parameters", () => {
            // Arrange
            const adjustPlayerBetCountSpy = jest.spyOn(processBetQueue, "adjustPlayerBetCount");

            // Act
            processBetQueue.adjustTotalBets(mockPlayer, mockBet, mockRate);

            // Assert
            expect(adjustPlayerBetCountSpy).toHaveBeenCalledWith(mockPlayer, mockBet.betChoice);
        });
    });

    describe("adjustPlayerBetCount", () => {
        it("should initialize playerBetCount array if not present", () => {
            // Arrange
            mockGameData.playerBetCount = {};

            // Act
            processBetQueue.adjustPlayerBetCount(mockPlayer, mockBet.betChoice);

            // Assert
            expect(mockGameData.playerBetCount[mockBet.betChoice]).toEqual([mockPlayer.UID]);
        });

        it("should add player UID to playerBetCount array if not already present", () => {
            // Arrange
            mockGameData.playerBetCount[mockBet.betChoice] = [];

            // Act
            processBetQueue.adjustPlayerBetCount(mockPlayer, mockBet.betChoice);

            // Assert
            expect(mockGameData.playerBetCount[mockBet.betChoice]).toContain(mockPlayer.UID);
        });

        it("should not add player UID to playerBetCount array if already present", () => {
            // Arrange
            mockGameData.playerBetCount[mockBet.betChoice] = [mockPlayer.UID];

            // Act
            processBetQueue.adjustPlayerBetCount(mockPlayer, mockBet.betChoice);

            // Assert
            expect(mockGameData.playerBetCount[mockBet.betChoice].length).toBe(1);
            expect(mockGameData.playerBetCount[mockBet.betChoice]).toEqual([mockPlayer.UID]);
        });

        it("should not add player UID if betChoice is not in definition choices", () => {
            // Arrange
            mockGameData.playerBetCount = {};

            // Act
            processBetQueue.adjustPlayerBetCount(mockPlayer, "invalidChoice");

            // Assert
            expect(mockGameData.playerBetCount["invalidChoice"]).toBeUndefined();
        });
    });

    describe("composeBettingTimeValidationCriteria", () => {
        it("should return correct criteria when round ID matches and within betting time", () => {
            // Arrange
            const roundId = 1;
            mockedGameTimingHelper.isWithinBettingTimeInCurrentEventDetail.mockReturnValue(true);

            // Act
            const criteria = processBetQueue.composeBettingTimeValidationCriteria(roundId);

            // Assert
            expect(criteria).toEqual([
                {
                    failure: false,
                    notice: { errorCode: "SB1905" },
                },
                {
                    failure: false,
                    notice: { errorCode: "SB1905" },
                },
            ]);
        });

        it("should return failure when round ID does not match", () => {
            // Arrange
            const wrongRoundId = 2;
            mockedGameTimingHelper.isWithinBettingTimeInCurrentEventDetail.mockReturnValue(true);

            // Act
            const criteria = processBetQueue.composeBettingTimeValidationCriteria(wrongRoundId);

            // Assert
            expect(criteria).toEqual([
                {
                    failure: true,
                    notice: { errorCode: "SB1905" },
                },
                {
                    failure: false,
                    notice: { errorCode: "SB1905" },
                },
            ]);
        });

        it("should return failure when not within betting time", () => {
            // Arrange
            const roundId = 1;
            mockedGameTimingHelper.isWithinBettingTimeInCurrentEventDetail.mockReturnValue(false);

            // Act
            const criteria = processBetQueue.composeBettingTimeValidationCriteria(roundId);

            // Assert
            expect(criteria).toEqual([
                {
                    failure: false,
                    notice: { errorCode: "SB1905" },
                },
                {
                    failure: true,
                    notice: { errorCode: "SB1905" },
                },
            ]);
        });

        it("should return failure when both round ID does not match and not within betting time", () => {
            // Arrange
            const wrongRoundId = 2;
            mockedGameTimingHelper.isWithinBettingTimeInCurrentEventDetail.mockReturnValue(false);

            // Act
            const criteria = processBetQueue.composeBettingTimeValidationCriteria(wrongRoundId);

            // Assert
            expect(criteria).toEqual([
                {
                    failure: true,
                    notice: { errorCode: "SB1905" },
                },
                {
                    failure: true,
                    notice: { errorCode: "SB1905" },
                },
            ]);
        });
    });

    describe("upsertBet", () => {
        beforeEach(() => {
            processBetQueue.betsRepository = {
                updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
            } as any;
        });

        it("should create a new bet when no existing bet is found", async () => {
            // Arrange
            const player = {
                UID: "player1",
                profile: { name: "Test Player" },
            };
            const bet = {
                amount: 100,
                betChoice: "choice1",
                roundId: 1,
                clientSeed: new Date(),
                freeBet: false,
            };
            const rate = 1.5;

            // Act
            const result = await processBetQueue.upsertBet(player, bet.roundId, bet, rate);

            // Assert
            expect(processBetQueue.betsRepository.updateOne).toHaveBeenCalledWith(
                { uid: player.UID, roundId: bet.roundId, freeBet: bet.freeBet },
                {
                    $inc: {
                        [bet.betChoice]: bet.amount,
                        totalAmount: bet.amount,
                    },
                    $setOnInsert: expect.objectContaining({
                        uid: player.UID,
                        name: player.profile.name,
                        freeBet: bet.freeBet,
                        roundId: bet.roundId,
                        clientSeed: bet.clientSeed,
                        time: expect.any(Date),
                    }),
                    $set: {
                        "odds.choice1": 1.5,
                        "odds.choice2": 2.0,
                    },
                },
                { upsert: true, setDefaultsOnInsert: true },
            );
            expect(result).toBeInstanceOf(Date);
        });

        it("should update existing bet when found", async () => {
            // Arrange
            const player = {
                UID: "player1",
                profile: { name: "Test Player" },
            };
            const bet = {
                amount: 100,
                betChoice: "choice1",
                roundId: 1,
                clientSeed: new Date(),
                freeBet: false,
            };
            const rate = 1.5;

            // Act
            await processBetQueue.upsertBet(player, bet.roundId, bet, rate);

            // Assert
            expect(processBetQueue.betsRepository.updateOne).toHaveBeenCalledWith(
                { uid: player.UID, roundId: bet.roundId, freeBet: bet.freeBet },
                {
                    $inc: {
                        [bet.betChoice]: bet.amount,
                        totalAmount: bet.amount,
                    },
                    $setOnInsert: expect.objectContaining({
                        uid: player.UID,
                        name: player.profile.name,
                        freeBet: bet.freeBet,
                        roundId: bet.roundId,
                        clientSeed: bet.clientSeed,
                        time: expect.any(Date),
                    }),
                    $set: {
                        "odds.choice1": 1.5,
                        "odds.choice2": 2.0,
                    },
                },
                { upsert: true, setDefaultsOnInsert: true },
            );
        });

        it("should include session information when player has session", async () => {
            // Arrange
            const player = {
                UID: "player1",
                profile: { name: "Test Player" },
                session: {
                    siteId: "site1",
                    currencyName: "USD",
                    operatorId: "op1",
                    playerId: "pid1",
                },
            };
            const bet = {
                amount: 100,
                betChoice: "choice1",
                roundId: 1,
                clientSeed: new Date(),
                freeBet: false,
            };
            const rate = 1.5;

            // Act
            await processBetQueue.upsertBet(player, bet.roundId, bet, rate);

            // Assert
            expect(processBetQueue.betsRepository.updateOne).toHaveBeenCalledWith(
                { uid: player.UID, roundId: bet.roundId, freeBet: bet.freeBet },
                {
                    $inc: {
                        [bet.betChoice]: bet.amount,
                        totalAmount: bet.amount,
                    },
                    $setOnInsert: expect.objectContaining({
                        uid: player.UID,
                        name: player.profile.name,
                        freeBet: bet.freeBet,
                        roundId: bet.roundId,
                        clientSeed: bet.clientSeed,
                        time: expect.any(Date),
                        siteId: player.session.siteId,
                        currency: player.session.currencyName,
                        rate: rate,
                        operatorId: player.session.operatorId,
                        playerId: player.session.playerId,
                    }),
                    $set: {
                        "odds.choice1": 1.5,
                        "odds.choice2": 2.0,
                    },
                },
                { upsert: true, setDefaultsOnInsert: true },
            );
        });

        it("should not include session information when player has no session", async () => {
            // Arrange
            const player = {
                UID: "player1",
                profile: { name: "Test Player" },
            };
            const bet = {
                amount: 100,
                betChoice: "choice1",
                roundId: 1,
                clientSeed: new Date(),
                freeBet: false,
            };
            const rate = 1.5;

            // Act
            await processBetQueue.upsertBet(player, bet.roundId, bet, rate);

            // Assert
            expect(processBetQueue.betsRepository.updateOne).toHaveBeenCalledWith(
                { uid: player.UID, roundId: bet.roundId, freeBet: bet.freeBet },
                {
                    $inc: {
                        [bet.betChoice]: bet.amount,
                        totalAmount: bet.amount,
                    },
                    $setOnInsert: expect.objectContaining({
                        uid: player.UID,
                        name: player.profile.name,
                        freeBet: bet.freeBet,
                        roundId: bet.roundId,
                        clientSeed: bet.clientSeed,
                        time: expect.any(Date),
                    }),
                    $set: {
                        "odds.choice1": 1.5,
                        "odds.choice2": 2.0,
                    },
                },
                { upsert: true, setDefaultsOnInsert: true },
            );
        });

        it("should handle free bet correctly", async () => {
            // Arrange
            const player = {
                UID: "player1",
                profile: { name: "Test Player" },
            };
            const bet = {
                amount: 100,
                betChoice: "choice1",
                roundId: 1,
                clientSeed: new Date(),
                freeBet: true,
            };
            const rate = 1.5;

            // Act
            await processBetQueue.upsertBet(player, bet.roundId, bet, rate);

            // Assert
            expect(processBetQueue.betsRepository.updateOne).toHaveBeenCalledWith(
                { uid: player.UID, roundId: bet.roundId, freeBet: bet.freeBet },
                expect.objectContaining({
                    $inc: {
                        [bet.betChoice]: bet.amount,
                        totalAmount: bet.amount,
                    },
                    $setOnInsert: expect.objectContaining({
                        uid: player.UID,
                        name: player.profile.name,
                        freeBet: bet.freeBet,
                        roundId: bet.roundId,
                        clientSeed: bet.clientSeed,
                        time: expect.any(Date),
                    }),
                    $set: {
                        "odds.choice1": 1.5,
                        "odds.choice2": 2.0,
                    },
                }),
                { upsert: true, setDefaultsOnInsert: true },
            );
        });

        it("should handle empty dynamic odds", async () => {
            // Arrange
            const player = {
                UID: "player1",
                profile: { name: "Test Player" },
            };
            const bet = {
                amount: 100,
                betChoice: "choice1",
                roundId: 1,
                clientSeed: new Date(),
                freeBet: false,
            };
            const rate = 1.5;
            mockGameData.dynamicOdds = undefined;

            // Act
            await processBetQueue.upsertBet(player, bet.roundId, bet, rate);

            // Assert
            expect(processBetQueue.betsRepository.updateOne).toHaveBeenCalledWith(
                { uid: player.UID, roundId: bet.roundId, freeBet: bet.freeBet },
                {
                    $inc: {
                        [bet.betChoice]: bet.amount,
                        totalAmount: bet.amount,
                    },
                    $setOnInsert: expect.objectContaining({
                        uid: player.UID,
                        name: player.profile.name,
                        freeBet: bet.freeBet,
                        roundId: bet.roundId,
                        clientSeed: bet.clientSeed,
                        time: expect.any(Date),
                    }),
                    $set: {},
                },
                { upsert: true, setDefaultsOnInsert: true },
            );
        });
    });
});
