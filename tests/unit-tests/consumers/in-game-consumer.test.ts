import { stub } from "jest-auto-stub";
import { TableInGameConsumer } from "sc-game-base/src/table/event-consumers";
import GameData from "../../../src/game-data";
import { InGameConsumer } from "../../../src/consumers";
import GameDefinition from "../../../src/game-definition";
import { gameManagementApiClientFactory, publisher, roundQuery } from "../global-stubs";
import * as helper from "../../../src/helpers/bet-percentage";

describe("InGameConsumer", () => {
    let consumer: InGameConsumer;
    const definition = stub<GameDefinition>();
    definition.durations = {
        wholeRound: 121,
        startingRound: 118,
        placingBetsFirstHalf: 115,
        lockingBetFirstHalf: 99,
        streamingVideoFirstHalf: 94,
        placingBetsSecondHalf: 63,
        lockingBetSecondHalf: 47,
        streamingVideoSecondHalf: 42,
        lockingBet: 0,
        placingBets: 0,
    };
    const gameData = stub<GameData>();
    const getBalance = jest.fn();

    beforeEach(() => {
        consumer = new InGameConsumer(definition, gameData, roundQuery, publisher, getBalance, gameManagementApiClientFactory);
    });

    it("should inherit from TableInGameConsumer", () => {
        // Assert
        expect(consumer instanceof TableInGameConsumer).toBeTruthy();
    });

    describe("consume", () => {
        it("should call super.consume and publishOddsToPlayer", async () => {
            // Arrange
            const realPlayer = { UID: "player123" };
            const superConsumeSpy = jest.spyOn(TableInGameConsumer.prototype, "consume").mockResolvedValue();
            const publishOddsToPlayerSpy = jest.spyOn(consumer, "publishOddsToPlayer").mockReturnValue(undefined);
            const publishBetChoicePointsToPlayerSpy = jest.spyOn(consumer, "publishBetChoicePointsToPlayer").mockReturnValue(undefined);
            const publishMatchToPlayerSpy = jest.spyOn(consumer, "publishMatchToPlayer").mockReturnValue(undefined);

            // Act
            await consumer.consume(realPlayer);

            // Assert
            expect(superConsumeSpy).toHaveBeenCalledWith(realPlayer);
            expect(publishOddsToPlayerSpy).toHaveBeenCalledWith("player123");
            expect(publishBetChoicePointsToPlayerSpy).toHaveBeenCalledWith("player123");
            expect(publishMatchToPlayerSpy).toHaveBeenCalledWith("player123");
        });
    });

    describe("buildPayload", () => {
        it("should build payload with userBetPercentage", async () => {
            // Arrange
            const realPlayer = { id: "player1" };
            const basePayload = { some: "payload" };
            const playerBetCount = { home: ["111", "113"], away: ["112"] };
            const userBetPercentage = { home: 66, away: 34, draw: 0 };

            gameData.playerBetCount = playerBetCount;

            jest.spyOn(TableInGameConsumer.prototype, "buildPayload").mockResolvedValue(basePayload);
            jest.spyOn(helper, "getUserBetPercentage").mockReturnValue(userBetPercentage);

            // Act
            const result = await consumer.buildPayload(realPlayer);

            // Assert
            expect(helper.getUserBetPercentage).toHaveBeenCalledWith(playerBetCount);
            expect(result).toEqual({
                ...basePayload,
                userBetPercentage,
            });
        });
    });

    describe("publishOddsToPlayer", () => {
        it("should publish odds to user", () => {
            // Arrange
            const UID = "player123";
            const dynamicOdds = { home: 2.0, away: 1.8, draw: 3.2 };
            gameData.dynamicOdds = dynamicOdds;

            // Act
            consumer.publishOddsToPlayer(UID);

            // Assert
            expect(publisher.publishToUser).toHaveBeenCalledWith(UID, { odds: dynamicOdds });
        });

        it("should handle undefined dynamicOdds", () => {
            // Arrange
            const UID = "player123";
            gameData.dynamicOdds = undefined;

            // Act
            consumer.publishOddsToPlayer(UID);

            // Assert
            expect(publisher.publishToUser).toHaveBeenCalledWith(UID, { odds: undefined });
        });
    });

    describe("publishBetChoicePointsToPlayer", () => {
        it("should publish bet choice points to user", () => {
            // Arrange
            const UID = "player123";
            const betChoicePoints = { home: 1, away: 2 };
            gameData.betChoicePoints = betChoicePoints;

            // Act
            consumer.publishBetChoicePointsToPlayer(UID);

            // Assert
            expect(publisher.publishToUser).toHaveBeenCalledWith(UID, { points: betChoicePoints });
        });
    });

    describe("publishMatchToPlayer", () => {
        it("should publish match to user", () => {
            // Arrange
            const UID = "player123";
            const match = { home: "A", away: "B" };
            gameData.currentMatch = match;

            // Act
            consumer.publishMatchToPlayer(UID);

            // Assert
            expect(publisher.publishToUser).toHaveBeenCalledWith(UID, { match });
        });
    });
});
