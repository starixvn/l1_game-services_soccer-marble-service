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
        expect(consumer instanceof TableInGameConsumer).toBeTruthy();
    });

    describe("consume", () => {
        it("should call super.consume and publishOddsToPlayer", async () => {
            // arrange
            const realPlayer = { UID: "player123" };
            const superConsumeSpy = jest.spyOn(TableInGameConsumer.prototype, "consume").mockResolvedValue();
            const publishOddsToPlayerSpy = jest.spyOn(consumer, "publishOddsToPlayer").mockReturnValue(undefined);

            // act
            await consumer.consume(realPlayer);

            // assert
            expect(superConsumeSpy).toHaveBeenCalledWith(realPlayer);
            expect(publishOddsToPlayerSpy).toHaveBeenCalledWith("player123");
        });
    });

    describe("buildPayload", () => {
        it("should build payload with userBetPercentage and video result", async () => {
            // arrange
            const realPlayer = { id: "player1" };
            const basePayload = { some: "payload" };
            const playerBetCount = { home: ["111", "113"], away: ["112"] };
            const userBetPercentage = { home: 66, away: 34, draw: 0 };
            const videoResult = {
                firstHalfVideo: "video1.mp4",
                secondHalfVideo: "video2.mp4",
                firstHalfTimeline: [],
                secondHalfTimeline: [],
                firstHalf: "AH",
                secondHalf: "HA",
            };

            gameData.publishedTournament = {} as any;
            gameData.liveStreamServer = "server1";
            gameData.playerBetCount = playerBetCount;

            jest.spyOn(TableInGameConsumer.prototype, "buildPayload").mockResolvedValue(basePayload);
            jest.spyOn(consumer, "getCurrentVideoResult").mockReturnValue(videoResult as any);
            jest.spyOn(helper, "getUserBetPercentage").mockReturnValue(userBetPercentage);

            // act
            const result = await consumer.buildPayload(realPlayer);

            // assert
            expect(helper.getUserBetPercentage).toHaveBeenCalledWith(playerBetCount);
            expect(result).toEqual({
                ...basePayload,
                userBetPercentage,
                videoResult,
                liveStreamServer: "server1",
                tournament: {},
            });
        });
    });
});
