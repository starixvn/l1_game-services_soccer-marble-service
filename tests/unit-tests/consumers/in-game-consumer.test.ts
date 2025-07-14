import { stub } from "jest-auto-stub";
import { TableInGameConsumer } from "sc-game-base/src/table/event-consumers";
import GameData from "../../../src/game-data";
import { InGameConsumer } from "../../../src/consumers";
import GameDefinition from "../../../src/game-definition";
import { gameManagementApiClientFactory, publisher, roundQuery } from "../global-stubs";
import * as helper from "../../../src/helpers/bet-percentage";
import * as gameTimingHelper from "../../../src/helpers/game-timing";

describe("InGameConsumer test", () => {
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

    describe("publishOddsToPlayer", () => {
        const UID = "player123";
        const dynamicOdds = {
            home: 1.5,
            away: 2.5,
            draw: 3.0,
            over: 1.8,
            under: 2.0,
            even: 1.9,
            odd: 2.1,
            homeLive: 1.6,
            awayLive: 2.6,
            drawLive: 3.1,
            overLive: 1.9,
            underLive: 2.1,
            evenLive: 2.0,
            oddLive: 2.2,
        };

        beforeEach(() => {
            gameData.dynamicOdds = dynamicOdds;
            publisher.publishToUser = jest.fn();
        });

        it("should publish odds", () => {
            // arrange
            jest.spyOn(gameTimingHelper, "isFirstHalfOddsActive").mockReturnValue(false);

            // act
            consumer.publishOddsToPlayer(UID);

            // assert
            expect(publisher.publishToUser).toHaveBeenCalledWith(UID, { odds: dynamicOdds });
        });
    });

    describe("getCurrentVideoResult", () => {
        const fullVideoFirstHalfResult = {
            firstHalfVideo: "video1.mp4",
            firstHalf: "AH",
            firstHalfTimeline: [1, 2, 3],
        };

        const fullVideoSecondHalfResult = {
            firstHalf: "AH",
            firstHalfTimeline: [1, 2, 3],
            secondHalfVideo: "video2.mp4",
            secondHalfTimeline: [4, 5, 6],
            secondHalf: "HA",
        };

        const timelineSecondHalfResult = {
            firstHalf: "AH",
            firstHalfTimeline: [1, 2, 3],
            secondHalfTimeline: [4, 5, 6],
            secondHalf: "HA",
        };

        const fullVideoResult = {
            ...fullVideoFirstHalfResult,
            ...fullVideoSecondHalfResult,
        };

        beforeEach(() => {
            gameData.result = fullVideoResult as any;
        });

        const testCases = [
            {
                phase: "streaming video first half",
                timeRange: { start: definition.durations.placingBetsSecondHalf + 1, end: definition.durations.streamingVideoFirstHalf },
                resultDescription: "full video first half result",
                expectedResult: fullVideoFirstHalfResult,
            },
            {
                phase: "streaming video second half",
                timeRange: { start: 0, end: definition.durations.streamingVideoSecondHalf },
                resultDescription: "full video second half result",
                expectedResult: fullVideoSecondHalfResult,
            },
            {
                phase: "showing result second half",
                timeRange: { start: definition.durations.startingRound + 1, end: definition.durations.wholeRound },
                resultDescription: "timeline result second half",
                expectedResult: timelineSecondHalfResult,
            },
            {
                phase: "other phase",
                timeRange: { start: definition.durations.placingBetsFirstHalf, end: definition.durations.startingRound },
                resultDescription: "empty result",
                expectedResult: {},
            },
        ];

        testCases.forEach(({ phase, timeRange, resultDescription, expectedResult }) => {
            describe(`during ${phase} phase`, () => {
                it(`should return ${resultDescription}`, () => {
                    // arrange
                    gameData.remainingTime = timeRange.start;

                    // act
                    const result = consumer.getCurrentVideoResult();

                    // assert
                    expect(result).toEqual(expectedResult);
                });
            });
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
