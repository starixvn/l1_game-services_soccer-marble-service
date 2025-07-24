import { UnsettledRoundConsumer } from "../../../src/consumers";
import GameData from "../../../src/game-data";
import SettleGameRoundConsumer from "../../../src/consumers/settle-game-round-consumer";
import { EventProcessConsumer } from "../../../src/consumers/event-process-consumer";
import { gameManagementApiClientFactory } from "../global-stubs";
import * as eventIdHelper from "../../../src/helpers/eventid";

jest.mock("../../../src/helpers/eventid");

const mockedEventIdHelper = eventIdHelper as jest.Mocked<typeof eventIdHelper>;

describe("UnSettledRoundConsumer", () => {
    let unSettleRoundConsumer: UnsettledRoundConsumer;
    let mockSettleGameRoundConsumer: jest.Mocked<SettleGameRoundConsumer>;
    let mockEventProcessConsumer: jest.Mocked<EventProcessConsumer>;
    let mockGameData: jest.Mocked<GameData>;
    let mockBetsRepository: {
        find: jest.MockedFunction<any>;
    };
    let mockTempBetsRepository: {
        find: jest.MockedFunction<any>;
    };
    let mockContainer: {
        gameData: jest.Mocked<GameData>;
        gameManagementApiClientFactory: typeof gameManagementApiClientFactory;
        settleGameRoundConsumer: jest.Mocked<SettleGameRoundConsumer>;
        eventProcessConsumer: jest.Mocked<EventProcessConsumer>;
        betsRepository: {
            find: jest.MockedFunction<any>;
        };
        tempBetsRepository?: {
            find: jest.MockedFunction<any>;
        };
    };

    const mockUnsettledBets = [
        { roundId: 456, paid: false },
        { roundId: 457, paid: false },
        { roundId: 456, paid: false }
    ];

    beforeEach(() => {
        mockGameData = {
            roundId: 1,
            gameId: 123,
            lastRoundId: 456,
        } as Partial<GameData> as GameData;

        mockSettleGameRoundConsumer = {
            settleSpecificRound: jest.fn().mockResolvedValue(undefined),
        } as unknown as jest.Mocked<SettleGameRoundConsumer>;

        mockEventProcessConsumer = {
            syncForSettle: jest.fn().mockResolvedValue(undefined),
        } as unknown as jest.Mocked<EventProcessConsumer>;

        mockBetsRepository = {
            find: jest.fn().mockReturnValue({
                lean: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue(mockUnsettledBets)
                })
            })
        };

        mockTempBetsRepository = {
            find: jest.fn().mockReturnValue({
                lean: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue([])
                })
            })
        };

        mockContainer = {
            gameData: mockGameData,
            gameManagementApiClientFactory,
            settleGameRoundConsumer: mockSettleGameRoundConsumer,
            eventProcessConsumer: mockEventProcessConsumer,
            betsRepository: mockBetsRepository,
            tempBetsRepository: undefined
        };

        unSettleRoundConsumer = new UnsettledRoundConsumer(mockContainer);

        mockedEventIdHelper.createEventId.mockImplementation((gameId: number, roundId: number) => {
            return gameId * 1000000 + roundId;
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("proceed", () => {
        describe("when gameId is not set", () => {
            it("should return early without processing", async () => {
                // Arrange
                mockGameData.gameId = undefined;

                // Act
                await unSettleRoundConsumer.proceed();

                // Assert
                expect(mockEventProcessConsumer.syncForSettle).not.toHaveBeenCalled();
            });
        });

        describe("when gameId is set", () => {
            it("should call getUnsettledBets", async () => {
                // Arrange
                mockGameData.gameId = 123;

                // Act
                await unSettleRoundConsumer.proceed();

                // Assert
                expect(mockBetsRepository.find).toHaveBeenCalledWith({ paid: false });
            });

            it("should call syncForSettle for each unique unsettled round", async () => {
                // Arrange
                mockGameData.gameId = 123;

                // Act
                await unSettleRoundConsumer.proceed();

                // Assert
                expect(mockEventProcessConsumer.syncForSettle).toHaveBeenCalledWith(123000456);
            });

            it("should call syncForSettle for second unique round", async () => {
                // Arrange
                mockGameData.gameId = 123;

                // Act
                await unSettleRoundConsumer.proceed();

                // Assert
                expect(mockEventProcessConsumer.syncForSettle).toHaveBeenCalledWith(123000457);
            });

            it("should call syncForSettle twice for two unique rounds", async () => {
                // Arrange
                mockGameData.gameId = 123;

                // Act
                await unSettleRoundConsumer.proceed();

                // Assert
                expect(mockEventProcessConsumer.syncForSettle).toHaveBeenCalledTimes(2);
            });
        });
    });

    describe("getUnsettledBets", () => {
        it("should return player bets when tempBetsRepository is undefined", async () => {
            // Arrange
            mockContainer.tempBetsRepository = undefined;

            // Act
            const result = await unSettleRoundConsumer.getUnsettledBets();

            // Assert
            expect(result).toEqual(mockUnsettledBets);
        });

        it("should return combined player and bot bets when tempBetsRepository exists", async () => {
            // Arrange
            const mockBotBets = [{ roundId: 458, paid: false }];
            mockTempBetsRepository.find.mockReturnValue({
                lean: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue(mockBotBets)
                })
            });
            mockContainer.tempBetsRepository = mockTempBetsRepository;
            unSettleRoundConsumer = new UnsettledRoundConsumer(mockContainer);

            // Act
            const result = await unSettleRoundConsumer.getUnsettledBets();

            // Assert
            expect(result).toEqual([...mockUnsettledBets, ...mockBotBets]);
        });

        it("should call tempBetsRepository.find when it exists", async () => {
            // Arrange
            const mockBotBets = [{ roundId: 458, paid: false }];
            mockTempBetsRepository.find.mockReturnValue({
                lean: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue(mockBotBets)
                })
            });
            mockContainer.tempBetsRepository = mockTempBetsRepository;
            unSettleRoundConsumer = new UnsettledRoundConsumer(mockContainer);

            // Act
            await unSettleRoundConsumer.getUnsettledBets();

            // Assert
            expect(mockTempBetsRepository.find).toHaveBeenCalledWith({ paid: false });
        });

        it("should call betsRepository.find with correct query", async () => {
            // Arrange
            mockContainer.tempBetsRepository = undefined;

            // Act
            await unSettleRoundConsumer.getUnsettledBets();

            // Assert
            expect(mockBetsRepository.find).toHaveBeenCalledWith({ paid: false });
        });
    });
});
