import RoundIdConsumer from "../../../src/consumers/round-id-consumer";
import GameData from "../../../src/game-data";

describe("RoundIdConsumer", () => {
    let consumer: RoundIdConsumer & { roundsRepository: any };
    let gameData: GameData;

    beforeEach(() => {
        // Create an instance without invoking the base class constructor
        consumer = Object.create(RoundIdConsumer.prototype) as RoundIdConsumer & { roundsRepository: any };
        gameData = { lastRoundId: undefined } as unknown as GameData;
        consumer.gameData = gameData;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("queryLastRound", () => {
        it("should set gameData.lastRoundId when a lastRound exists", async () => {
            // Arrange
            const exec = jest.fn().mockResolvedValue({ id: 123 });
            const lean = jest.fn().mockReturnValue({ exec });
            const findOne = jest.fn().mockReturnValue({ lean });
            consumer.roundsRepository = { findOne };

            // Act
            await consumer.queryLastRound();

            // Assert
            expect(findOne).toHaveBeenCalledWith({}, "id", { sort: { id: -1 } });
            expect(lean).toHaveBeenCalledTimes(1);
            expect(exec).toHaveBeenCalledTimes(1);
            expect(consumer.gameData.lastRoundId).toBe(123);
        });

        it("should not set gameData.lastRoundId when no lastRound exists", async () => {
            // Arrange
            const exec = jest.fn().mockResolvedValue(null);
            const lean = jest.fn().mockReturnValue({ exec });
            const findOne = jest.fn().mockReturnValue({ lean });
            consumer.roundsRepository = { findOne };
            consumer.gameData.lastRoundId = undefined;

            // Act
            await consumer.queryLastRound();

            // Assert
            expect(findOne).toHaveBeenCalledWith({}, "id", { sort: { id: -1 } });
            expect(lean).toHaveBeenCalledTimes(1);
            expect(exec).toHaveBeenCalledTimes(1);
            expect(consumer.gameData.lastRoundId).toBeUndefined();
        });
    });
});


