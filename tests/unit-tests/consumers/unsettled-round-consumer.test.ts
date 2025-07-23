import { UnsettledRoundConsumer } from "../../../src/consumers";
import { stub } from "jest-auto-stub";
import GameData from "../../../src/game-data";
import SettleGameRoundConsumer from "../../../src/consumers/settle-game-round-consumer";
import { EventProcessConsumer } from "../../../src/consumers/event-process-consumer";
import { gameManagementApiClientFactory } from "../global-stubs";

describe("UnSettleRoundConsumer", () => {
    let unSettleRoundConsumer: UnsettledRoundConsumer;
    let mockSettleGameRoundConsumer: jest.Mocked<SettleGameRoundConsumer>;
    let mockEventProcessConsumer: jest.Mocked<EventProcessConsumer>;
    const gameData = stub<GameData>({
        roundId: 1,
        gameId: 123,
        lastRoundId: 456,
    });

    beforeEach(() => {
        mockSettleGameRoundConsumer = {
            settleSpecificRound: jest.fn().mockResolvedValue(undefined),
        } as unknown as jest.Mocked<SettleGameRoundConsumer>;

        mockEventProcessConsumer = {
            syncEventDetailForcingResultAvailable: jest.fn().mockResolvedValue({
                eventID: 528280977864,
                eventNameAKey: "Team A",
                eventNameBKey: "Team B",
                scheduleStartTs: new Date(),
                productCode: "SOCCER",
                productTypeKey: "MATCH",
                eventDetails: [{
                    eventID: 528280977864,
                    scheduleStartTs: new Date(),
                    oddsAvailableTs: new Date(),
                    resultsAvailableTs: new Date(),
                    hasResults: true,
                    playlist: "test-playlist",
                    goalInfo: "test-goal-info",
                    result: "1:0",
                    markets: []
                }]
            }),
        } as unknown as jest.Mocked<EventProcessConsumer>;

        unSettleRoundConsumer = new UnsettledRoundConsumer({
            gameData,
            gameManagementApiClientFactory,
            settleGameRoundConsumer: mockSettleGameRoundConsumer,
            eventProcessConsumer: mockEventProcessConsumer,
        } as any);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("proceed", () => {
        describe("when gameId is not set", () => {
            it("should return early without processing", async () => {
                // Arrange
                gameData.gameId = undefined;

                // Act
                await unSettleRoundConsumer.proceed();

                // Assert
                expect(mockEventProcessConsumer.syncEventDetailForcingResultAvailable).not.toHaveBeenCalled();
                expect(mockSettleGameRoundConsumer.settleSpecificRound).not.toHaveBeenCalled();
            });
        });

        describe("when lastRoundId is not set", () => {
            it("should return early without processing", async () => {
                // Arrange
                gameData.gameId = 123;
                gameData.lastRoundId = undefined;

                // Act
                await unSettleRoundConsumer.proceed();

                // Assert
                expect(mockEventProcessConsumer.syncEventDetailForcingResultAvailable).not.toHaveBeenCalled();
                expect(mockSettleGameRoundConsumer.settleSpecificRound).not.toHaveBeenCalled();
            });
        });

        describe("when lastRoundId is set", () => {
            it("should sync event detail and settle round when event is available", async () => {
                // Arrange
                gameData.gameId = 123;
                gameData.lastRoundId = 456;

                // Act
                await unSettleRoundConsumer.proceed();

                // Assert
                expect(mockEventProcessConsumer.syncEventDetailForcingResultAvailable).toHaveBeenCalledWith(528280977864);
                expect(mockSettleGameRoundConsumer.settleSpecificRound).toHaveBeenCalledWith(456);
            });

            it("should not settle round when event is not available", async () => {
                // Arrange
                gameData.gameId = 123;
                gameData.lastRoundId = 456;
                mockEventProcessConsumer.syncEventDetailForcingResultAvailable.mockResolvedValue(null);

                // Act
                await unSettleRoundConsumer.proceed();

                // Assert
                expect(mockEventProcessConsumer.syncEventDetailForcingResultAvailable).toHaveBeenCalledWith(528280977864);
                expect(mockSettleGameRoundConsumer.settleSpecificRound).not.toHaveBeenCalled();
            });
        });
    });
});
