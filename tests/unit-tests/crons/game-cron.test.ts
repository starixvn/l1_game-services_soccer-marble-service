import GameCron from "../../../src/crons/game-cron";
import { Table } from "sc-game-base";
import { stub } from "jest-auto-stub";

import {
    bot,
    gameManagementApiClientFactory,
    gameStatusPublisher,
    provablyFairConsumer,
    roundIdConsumer,
    roundResultConsumer,
    runningRoundInfoPublisher,
    settleGameConsumer,
    unsettledRoundConsumer,
    logService,
    tournamentConsumer,
    cacheConsumer,
} from "../global-stubs";
import GameData from "../../../src/game-data";
import GameDefinition from "../../../src/game-definition";
import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
import crypto from "crypto";
import { PRE_MATCH_BET_CHOICES, LIVE_BET_CHOICES } from "../../../src/constants";
import { DEFAULT_VOICE_DURATION_CONFIG } from "../../../src/helpers/voices";
jest.mock("../../../src/timelines/video-timelines", () => ({
    "22841ea360fc3c3676a38502aa9a90a1ae1fbdac1d937746358efe559d349b6f_0": [],
    "53e5fe7054fb5c4867e0277e8867c0c08f9ca8be43fdac0d3b6c6ea5c7d656a2_AAAA": [1.8, 19.033333333333335, 33.8, 42.43333333333333],
    "cc682a8a1c7d8184524fbb91f04e5ca13e5ea9500960e271f0343e0f18643043_AAAH": [3.8666666666666667, 18.066666666666666, 25.6, 34],
    "1cfbaffb0d00aa024775152621561732337e66109d8885f39612a44d2b99251a_AAA": [5.466666666666667, 19.466666666666665, 37.733333333333334],
    "0d24c9bd7c63dbab23c1f4d827509ee43a17100faeb3284555e60530fb1c1b7b_AAHA": [
        2.6333333333333333, 20.033333333333335, 26.2, 35.266666666666666,
    ],
    "c20a85328513d3c79d6d66919175d0a1d112d0c6c660359e4731c444700c21f4_AAHH": [11.5, 26.166666666666668, 33.86666666666667, 41.56666666666667],
    "4b7c786db2cc35db7b37343c0290c083a548044106fecfd206454332ce0ddeea_AAH": [19.166666666666668, 26.9, 40.766666666666666],
    "7a67a3e74e83cbfd65185e1828aa09b85f76bad052538cd1f030f5af06ce2928_AA": [3.7333333333333334, 42],
    "4abd1b067acf617a255861fb3a5d8bb0838c89ec4eac1cc25538583568fdf985_AHAA": [
        2.566666666666667, 18.966666666666665, 29.133333333333333, 37,
    ],
    "7044e5388c3d625e1e95f46a9dfde0b4abc1eeeb7687e3c9e4ac58e13184ce04_AHAH": [2.7, 10.233333333333333, 19.3, 25.6],
    "01099e7f5e7bda327aebc9b027b70fa122c20f65d7eb30833051126580311f88_AHA": [18.333333333333332, 26.6, 35.7],
    "8e626c2af2d112ad3a7a8c0a09898bccde2bdb988ad789d38d1a8c0a51d6104d_AHHA": [
        5.966666666666667, 18.366666666666667, 24.933333333333334, 31.166666666666668,
    ],
    "79ce0aa56795de56ff40f2789f68276f4d3ad703a391b2d39bc780b15479a854_AHHH": [4.1, 10.5, 22.633333333333333, 39.46666666666667],
    "2bec7228ad358ad1e65496edd7a6607c8db04a9aaf80070d754f1de9b47da68b_AHH": [2.9, 11.833333333333334, 25.1],
    "c89550cefa212faa7dd7421a06c28711434f6da5fc6093c4e19baaba29a4f960_AH": [13.133333333333333, 24.866666666666667],
    "b4510afb170d8204b5ce6dc535770a39fbc66e1a65a8af2a22193b6d4104b49c_A": [37.46666666666667],
    "23b073f2deb8e68cd1e5879dae5e1bf54bb173e2f9646759df0243cf13e4cb94_HAAA": [5.4, 14.866666666666667, 24.9, 39.5],
    "c64887d3730b5a52e96e39fb67972ca0f64e21da8aef0ba85517da0e3497584a_HAAH": [18.366666666666667, 27, 33.8, 40.2],
    "ab4e46235565c9b63b6c1dae2367a318e6c2605a8645ca575cf0063417d23db3_HAA": [10.133333333333333, 18.9, 41.4],
    "3ff0610ea6b1620a3136fb41df7c2402e77fad6dfbecd88dc3493c3501ac82f7_HAHA": [4.1, 16.9, 25.7, 39.266666666666666],
    "bb6e05bad5803753dbd34e8f1aad56e357437844955554b059ba90466a71a73d_HAHH": [5, 12.9, 26.166666666666668, 39.46666666666667],
    "4d29f01056b561efccf6a2bb54e4e5a02747b152d9b7736a1682a4fe81183e89_HAH": [10.866666666666667, 19.966666666666665, 29.5],
    "a5ed9e3bdf040f0497132a2964bf16b6ddf17c2582882eb88e5d40bcc3a38e1b_HA": [28.5, 37.06666666666667],
    "847b2dc5fa761efd64fc6af330a8316ef7192457f1e19c29a384d336f3849bab_HHAA": [
        2.8333333333333335, 17.966666666666665, 32.46666666666667, 41.5,
    ],
    "ae29dae888d7ac7670cd45e55e056857c13d6fb20bda2fc77dd11872b26864c8_HHAH": [6.3, 26.866666666666667, 33.06666666666667, 41.733333333333334],
    "09bbbfffb623070ce8d9e9ec474457e0a2994458f7178696a4d49a7d077ebef6_HHA": [19.2, 29.966666666666665, 39.86666666666667],
    "33a9416c68b765630961e6f43f980b492c91fbf0dc722a2223941cf3834aa220_HHHA": [
        18.166666666666668, 24.233333333333334, 32.5, 40.03333333333333,
    ],
    "529722ee2e00df1acf61aa94f8194ab24f98ce7325c571f4efda68e57e6a24d2_HHHH": [
        6.8, 12.566666666666666, 26.866666666666667, 36.266666666666666,
    ],
    "c9bc635dd734e24c6ba8b47af4628a6b705945c68adbebbf393212376c99d365_HHH": [10.966666666666667, 30.466666666666665, 39.96666666666667],
    "6cd3e090b30fb5a3a3c2c0496d142afc678d8c02131f63b8aa8b60ed813ce8eb_HH": [11.2, 27],
    "4bba7d1cd4adb14007764406ba64b1da5720aeccddc5782940741ec477cd8b03_H": [22.366666666666667],
}));
jest.mock("../../../src/timelines/event-timelines", () => ({
    "53e5fe7054fb5c4867e0277e8867c0c08f9ca8be43fdac0d3b6c6ea5c7d656a2_AAAA": {"timeLine":[2.7333333333333334,12.566666666666666,18.5,27.6],"frame":[82,377,555,828],"eventName":["goal_A","goal_A","goal_A","goal_A"]},
    "cc682a8a1c7d8184524fbb91f04e5ca13e5ea9500960e271f0343e0f18643043_AAAH":{"timeLine":[2.6666666666666665,13.3,18.066666666666666,27.033333333333335],"frame":[80,399,542,811],"eventName":["goal_A","goal_A","goal_A","goal_H"]},
    "1cfbaffb0d00aa024775152621561732337e66109d8885f39612a44d2b99251a_AAA":{"timeLine":[2.8,11.1,19.166666666666668],"frame":[84,333,575],"eventName":["goal_A","goal_A","goal_A"]},
    "0d24c9bd7c63dbab23c1f4d827509ee43a17100faeb3284555e60530fb1c1b7b_AAHA":{"timeLine":[2.6666666666666665,8.133333333333333,13.7,23.3],"frame":[80,244,411,699],"eventName":["goal_A","goal_A","goal_H","goal_A"]},
    "c20a85328513d3c79d6d66919175d0a1d112d0c6c660359e4731c444700c21f4_AAHH":{"timeLine":[5.3,11.133333333333333,18.333333333333332,27.866666666666667],"frame":[159,334,550,836],"eventName":["goal_A","goal_A","goal_H","goal_H"]},
    "4b7c786db2cc35db7b37343c0290c083a548044106fecfd206454332ce0ddeea_AAH":{"timeLine":[10.366666666666667,17.9,27.2],"frame":[311,537,816],"eventName":["goal_A","goal_A","goal_H"]},
    "7a67a3e74e83cbfd65185e1828aa09b85f76bad052538cd1f030f5af06ce2928_AA":{"timeLine":[3.533333333333333,22.833333333333332,26.866666666666667],"frame":[106,685,806],"eventName":["goal_A","hit_glove_R","goal_A"]},
    "4abd1b067acf617a255861fb3a5d8bb0838c89ec4eac1cc25538583568fdf985_AHAA":{"timeLine":[8.733333333333333,13.733333333333333,19.7,27.266666666666666],"frame":[262,412,591,818],"eventName":["goal_A","goal_H","goal_A","goal_A"]},
    "7044e5388c3d625e1e95f46a9dfde0b4abc1eeeb7687e3c9e4ac58e13184ce04_AHAH":{"timeLine":[2.7,11.5,19.933333333333334,25.633333333333333],"frame":[81,345,598,769],"eventName":["goal_A","goal_H","goal_A","goal_H"]},
    "01099e7f5e7bda327aebc9b027b70fa122c20f65d7eb30833051126580311f88_AHA":{"timeLine":[4.666666666666667,9.3,18.533333333333335],"frame":[140,279,556],"eventName":["goal_A","goal_H","goal_A"]},
    "8e626c2af2d112ad3a7a8c0a09898bccde2bdb988ad789d38d1a8c0a51d6104d_AHHA":{"timeLine":[2.7333333333333334,9.733333333333333,14.766666666666667,28.033333333333335],"frame":[82,292,443,841],"eventName":["goal_A","goal_H","goal_H","goal_A"]},
    "79ce0aa56795de56ff40f2789f68276f4d3ad703a391b2d39bc780b15479a854_AHHH":{"timeLine":[2.7333333333333334,9.5,13.866666666666667,21.733333333333334,27.6],"frame":[82,285,416,652,828],"eventName":["goal_A","goal_H","goal_H","goal_H","hit_glove_B"]},
    "2bec7228ad358ad1e65496edd7a6607c8db04a9aaf80070d754f1de9b47da68b_AHH":{"timeLine":[5.3,21.733333333333334,28.266666666666666],"frame":[159,652,848],"eventName":["goal_A","goal_H","goal_H"]},
    "c89550cefa212faa7dd7421a06c28711434f6da5fc6093c4e19baaba29a4f960_AH":{"timeLine":[4.9,9.6,24.066666666666666,26.266666666666666],"frame":[147,288,722,788],"eventName":["goal_A","goal_H","hit_glove_B","hit_glove_R"]},
    "b4510afb170d8204b5ce6dc535770a39fbc66e1a65a8af2a22193b6d4104b49c_A":{"timeLine":[5.166666666666667,14.666666666666666],"frame":[155,440],"eventName":["goal_A","hit_glove_R"]},
    "23b073f2deb8e68cd1e5879dae5e1bf54bb173e2f9646759df0243cf13e4cb94_HAAA":{"timeLine":[6.6,14.966666666666667,19.9,26.766666666666666],"frame":[198,449,597,803],"eventName":["goal_H","goal_A","goal_A","goal_A"]},
    "c64887d3730b5a52e96e39fb67972ca0f64e21da8aef0ba85517da0e3497584a_HAAH":{"timeLine":[5.633333333333334,16.233333333333334,23,27.233333333333334],"frame":[169,487,690,817],"eventName":["goal_H","goal_A","goal_A","goal_H"]},
    "ab4e46235565c9b63b6c1dae2367a318e6c2605a8645ca575cf0063417d23db3_HAA":{"timeLine":[11.033333333333333,17.6,26.5],"frame":[331,528,795],"eventName":["goal_H","goal_A","goal_A"]},
    "3ff0610ea6b1620a3136fb41df7c2402e77fad6dfbecd88dc3493c3501ac82f7_HAHA":{"timeLine":[4.633333333333334,11.466666666666667,19.4,27.033333333333335],"frame":[139,344,582,811],"eventName":["goal_H","goal_A","goal_H","goal_A"]},
    "bb6e05bad5803753dbd34e8f1aad56e357437844955554b059ba90466a71a73d_HAHH":{"timeLine":[4.533333333333333,9.566666666666666,15.3,26.8],"frame":[136,287,459,804],"eventName":["goal_H","goal_A","goal_H","goal_H"]},
    "4d29f01056b561efccf6a2bb54e4e5a02747b152d9b7736a1682a4fe81183e89_HAH":{"timeLine":[6.333333333333333,10.833333333333334,18.733333333333334,24.733333333333334],"frame":[190,325,562,742],"eventName":["goal_H","goal_A","goal_H","hit_glove_B"]},
    "a5ed9e3bdf040f0497132a2964bf16b6ddf17c2582882eb88e5d40bcc3a38e1b_HA":{"timeLine":[5.066666666666666,11.033333333333333,24.833333333333332],"frame":[152,331,745],"eventName":["goal_H","goal_A","hit_glove_B"]},
    "847b2dc5fa761efd64fc6af330a8316ef7192457f1e19c29a384d336f3849bab_HHAA":{"timeLine":[4.433333333333334,6.266666666666667,10.9,18.266666666666666,28.333333333333332],"frame":[133,188,327,548,850],"eventName":["hit_glove_R","goal_H","goal_H","goal_A","goal_A"]},
    "ae29dae888d7ac7670cd45e55e056857c13d6fb20bda2fc77dd11872b26864c8_HHAH":{"timeLine":[9.633333333333333,13.733333333333333,20.7,26],"frame":[289,412,621,780],"eventName":["goal_H","goal_H","goal_A","goal_H"]},
    "09bbbfffb623070ce8d9e9ec474457e0a2994458f7178696a4d49a7d077ebef6_HHA":{"timeLine":[6.966666666666667,8.566666666666666,13.733333333333333,25.466666666666665],"frame":[209,257,412,764],"eventName":["hit_glove_B","goal_H","goal_H","goal_A"]},
    "33a9416c68b765630961e6f43f980b492c91fbf0dc722a2223941cf3834aa220_HHHA":{"timeLine":[9.366666666666667,13.7,18.566666666666666,26.5],"frame":[281,411,557,795],"eventName":["goal_H","goal_H","goal_H","goal_A"]},
    "529722ee2e00df1acf61aa94f8194ab24f98ce7325c571f4efda68e57e6a24d2_HHHH":{"timeLine":[4.766666666666667,9.233333333333333,20.633333333333333,25.9],"frame":[143,277,619,777],"eventName":["goal_H","goal_H","goal_H","goal_H"]},
    "c9bc635dd734e24c6ba8b47af4628a6b705945c68adbebbf393212376c99d365_HHH":{"timeLine":[5.466666666666667,18.166666666666668,26.866666666666667],"frame":[164,545,806],"eventName":["goal_H","goal_H","goal_H"]},
    "6cd3e090b30fb5a3a3c2c0496d142afc678d8c02131f63b8aa8b60ed813ce8eb_HH":{"timeLine":[8.866666666666667,14.866666666666667,21.566666666666666,27.166666666666668,27.8],"frame":[266,446,647,815,834],"eventName":["goal_H","hit_glove_B","hit_glove_R","hit_glove_B","goal_H"]},
    "4bba7d1cd4adb14007764406ba64b1da5720aeccddc5782940741ec477cd8b03_H":{"timeLine":[11.433333333333334],"frame":[343],"eventName":["goal_H"]}
}));

// Add axios mock
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock generateVoiceWithEventTimeline
jest.mock("../../../src/helpers/voices", () => ({
    ...jest.requireActual("../../../src/helpers/voices"),
    generateVoiceWithEventTimeline: jest.fn().mockReturnValue(["voice1", "voice2"]),
    VOICE_DURATION_CONFIG: {}
}));

describe("GameCron", () => {
    let gameCron: GameCron;

    const definition = stub<GameDefinition>();

    definition.durations = {
        wholeRound: 121,
        startingRound: 117,
        placingBetsFirstHalf: 114,
        lockingBetFirstHalf: 104,
        streamingVideoFirstHalf: 100,
        placingBetsSecondHalf: 58,
        lockingBetSecondHalf: 39,
        streamingVideoSecondHalf: 38,
        placingBets: 0,
        lockingBet: 0,
    };

    beforeEach(() => {
        const gameData = stub<GameData>({
            disabled: false,
        });

        gameCron = new GameCron({
            definition,
            gameData,
            bot: bot as any,
            settleGameRoundConsumer: settleGameConsumer,
            gameStatusPublisher,
            runningRoundInfoPublisher,
            logService: logService as any,
            roundResultConsumer,
            resultsRepository: {} as any,
            appConfigs: {},
            gameManagementApiClientFactory,
            roundIdConsumer,
            provablyFairConsumer,
            unsettledRoundConsumer,
            tournamentConsumer,
            cacheConsumer,
        });

        gameCron.gameManagementApiClient = {
            notification: {
                getUmMessages: jest.fn(),
            },
        } as any;
    });

    afterEach(() => {
        jest.clearAllMocks();
        (axios.get as jest.Mock).mockReset();
    });

    describe("generateRoundData", () => {
        it("should generate round data and reset settlement result from admin", async () => {
            // act
            await gameCron.generateRoundData();

            // assert
            expect(roundResultConsumer.generateResult).toHaveBeenCalled();
            expect(gameCron.gameData.settlementResultFromAdmin).toEqual({});
        });
    });

    describe("proceed", () => {
        it("should reset player bet count for new round", () => {
            // act
            gameCron.resetForNewRound();

            // assert
            expect(gameCron.gameData.playerBetCount).toEqual({});
        });
        it("should reset dynamic odds for new round", () => {
            // act
            gameCron.resetForNewRound();

            // assert
            expect(gameCron.gameData.dynamicOdds).toEqual({});
        });

        it("should generate round data and reset settlement result from admin", async () => {
            // act
            await gameCron.generateRoundData();

            // assert
            expect(roundResultConsumer.generateResult).toHaveBeenCalled();
            expect(gameCron.gameData.settlementResultFromAdmin).toEqual({});
        });

        it("should proceed and handle game status check at the start of a new round", async () => {
            // arrange
            gameCron.gameData.remainingTime = definition.durations.wholeRound;
            jest.spyOn(gameCron, "checkGameStatus").mockImplementation(async () => {});

            // act
            await gameCron.proceed();

            // assert
            expect(gameCron.checkGameStatus).toHaveBeenCalled();
        });

        it("should decrement remaining time if game is not disabled", async () => {
            // arrange
            gameCron.gameData.remainingTime = 5;
            gameCron.gameData.disabled = false;

            // act
            await gameCron.proceed();

            // assert
            expect(gameCron.gameData.remainingTime).toBe(4);
        });

        describe("first half", () => {
            it("should publish start placing bet status and calculate pre-match odds at placing bet time", async () => {
                // arrange
                gameCron.gameData.remainingTime = definition.durations.placingBetsFirstHalf + 1;
                gameCron.calculateAndPublishOddsPreMatch = jest.fn();
                gameCron.resetForNewRound = jest.fn();
                gameCron.bot = { reset: jest.fn() } as any;
                gameCron.updateNewMatchConfig = jest.fn().mockResolvedValue(null);
                gameCron.generateRoundData = jest.fn().mockResolvedValue(null);

                // act
                await gameCron.proceed();

                // assert
                expect(gameCron.resetForNewRound).toHaveBeenCalled();
                expect(gameCron.bot.reset).toHaveBeenCalled();
                expect(gameCron.updateNewMatchConfig).toHaveBeenCalled();
                expect(gameCron.calculateAndPublishOddsPreMatch).toHaveBeenCalled();
                expect(gameCron.generateRoundData).toHaveBeenCalled();
                expect(gameStatusPublisher.publishStartPlacingBetStatus).toHaveBeenCalled();
            });

            it("should publish end placing bet status at locking bet time", async () => {
                // arrange
                gameCron.gameData.remainingTime = definition.durations.lockingBetFirstHalf;

                // act
                await gameCron.proceed();

                // assert
                expect(gameStatusPublisher.publishEndPlacingBetStatus).toHaveBeenCalled();
            });

            it("should publish running round info and not run bot at beginning of place bet time", async () => {
                // arrange
                gameCron.gameData.remainingTime = definition.durations.placingBetsFirstHalf - 1;

                // act
                await gameCron.proceed();

                // assert
                expect(bot.run).not.toHaveBeenCalled();
                expect(runningRoundInfoPublisher.publish).toHaveBeenCalled();
            });

            it("should run bot and publish running round info during bot betting time", async () => {
                // arrange
                gameCron.gameData.remainingTime = definition.durations.placingBetsFirstHalf - 3;

                // act
                await gameCron.proceed();

                // assert
                expect(bot.run).toHaveBeenCalled();
                expect(runningRoundInfoPublisher.publish).toHaveBeenCalled();
            });

            describe("at first half streaming time", () => {
                it("should call getVideoTimelineAndVoiceForFirstHalf", async () => {
                    // arrange
                    gameCron.gameData.remainingTime = definition.durations.streamingVideoFirstHalf + 1;
                    jest.spyOn(gameCron, "getVideoTimelineAndVoiceForFirstHalf").mockResolvedValue();

                    // act
                    await gameCron.proceed();

                    // assert
                    expect(gameCron.getVideoTimelineAndVoiceForFirstHalf).toHaveBeenCalled();
                });

                it("should publish video stream", async () => {
                    // arrange
                    gameCron.gameData.remainingTime = definition.durations.streamingVideoFirstHalf + 1;
                    gameCron.gameData.result = {
                        firstHalfVideo: "http://marble-football/watch?v=HH",
                        firstHalfTimeline: [1, 2, 3],
                        firstHalfEventTimeline: {
                            timeline: [1.5, 2.5, 3.5],
                            eventName: ["goal_H", "goal_H", "hit_glove_B"]
                        },
                        firstHalf: "HH",
                    } as any;

                    jest.spyOn(gameCron, "getVideoTimelineAndVoiceForFirstHalf").mockResolvedValue();

                    // act
                    await gameCron.proceed();

                    // assert
                    expect(runningRoundInfoPublisher.publishToAllUsers).toHaveBeenCalledWith({
                        videoResult: {
                            firstHalfVideo: "http://marble-football/watch?v=HH",
                            firstHalfTimeline: [1, 2, 3],
                            firstHalf: "HH",
                        },
                    });
                });
            });
        });

        describe("second half", () => {
            it("should publish start placing bet status and calculate live odds at placing bet time", async () => {
                // arrange
                gameCron.gameData.remainingTime = definition.durations.placingBetsSecondHalf + 1;
                gameCron.calculateAndPublishOddsLive = jest.fn();

                // act
                await gameCron.proceed();

                // assert
                expect(gameCron.calculateAndPublishOddsLive).toHaveBeenCalled();
                expect(gameStatusPublisher.publishStartPlacingBetStatus).toHaveBeenCalled();
            });

            it("should publish running round info and not run bot at beginning of place bet time", async () => {
                // arrange
                gameCron.gameData.remainingTime = definition.durations.placingBetsSecondHalf - 1;

                // act
                await gameCron.proceed();

                // assert
                expect(bot.run).not.toHaveBeenCalled();
                expect(runningRoundInfoPublisher.publish).toHaveBeenCalled();
            });

            it("should run bot and publish running round info during bot betting time", async () => {
                // arrange
                gameCron.gameData.remainingTime = definition.durations.placingBetsSecondHalf - 3;

                // act
                await gameCron.proceed();

                // assert
                expect(bot.run).toHaveBeenCalled();
                expect(runningRoundInfoPublisher.publish).toHaveBeenCalled();
            });

            it("should publish end placing bet status at locking bet time", async () => {
                // arrange
                gameCron.gameData.remainingTime = definition.durations.lockingBetSecondHalf;

                // act
                await gameCron.proceed();

                // assert
                expect(gameStatusPublisher.publishEndPlacingBetStatus).toHaveBeenCalled();
            });

            describe("at streaming time", () => {
                it("should call getVideoTimelineAndVoiceForSecondHalf", async () => {
                    // arrange
                    gameCron.gameData.remainingTime = definition.durations.streamingVideoSecondHalf + 1;
                    jest.spyOn(gameCron, "getVideoTimelineAndVoiceForSecondHalf").mockResolvedValue();

                    // act
                    await gameCron.proceed();

                    // assert
                    expect(gameCron.getVideoTimelineAndVoiceForSecondHalf).toHaveBeenCalled();
                });

                it("should publish video stream", async () => {
                    // arrange
                    gameCron.gameData.remainingTime = definition.durations.streamingVideoSecondHalf + 1;
                    gameCron.gameData.result = {
                        secondHalfVideo: "http://marble-football/watch?v=AA",
                        secondHalfTimeline: [4, 5, 6],
                        secondHalfEventTimeline: {
                            timeLine: [4.5, 5.5, 6.5],
                            eventName: ["goal_A", "goal_A", "hit_glove_R"]
                        },
                        secondHalf: "AA",
                    } as any;

                    jest.spyOn(gameCron, "getVideoTimelineAndVoiceForSecondHalf").mockResolvedValue();

                    // act
                    await gameCron.proceed();

                    // assert
                    expect(runningRoundInfoPublisher.publishToAllUsers).toHaveBeenCalledWith({
                        videoResult: {
                            secondHalfVideo: "http://marble-football/watch?v=AA",
                            secondHalfTimeline: [4, 5, 6],
                            secondHalf: "AA",
                        },
                    });
                });
            });
        });

        it("should publish tournament at the round start time", async () => {
            // arrange
            gameCron.gameData.remainingTime = definition.durations.startingRound + 1;

            (tournamentConsumer.getCurrentTournament as any).mockResolvedValue("fake tournament");

            // act
            await gameCron.proceed();

            // assert
            expect(runningRoundInfoPublisher.publishToAllUsers).toHaveBeenCalledWith({ tournament: "fake tournament" });
        });

        describe("when the remaining time is less than 0", () => {
            it("should reset remaining time", async () => {
                // arrange
                gameCron.gameData.remainingTime = -1;
                (definition.settle as jest.Mock).mockReturnValue({ draw: false });

                // act
                await gameCron.proceed();

                // assert
                expect(gameCron.gameData.remainingTime).toBe(definition.durations.wholeRound);
            });

            it("should settle round", async () => {
                // arrange
                gameCron.gameData.remainingTime = -1;
                (definition.settle as jest.Mock).mockReturnValue({ draw: false });

                // act
                await gameCron.proceed();

                // assert
                expect(settleGameConsumer.settleRound).toHaveBeenCalled();
            });
        });

        it("should not decrement remaining time if game is disabled", async () => {
            // arrange
            gameCron.gameData.remainingTime = 5;
            gameCron.gameData.disabled = true;

            // act
            await gameCron.proceed();

            // assert
            expect(gameCron.gameData.remainingTime).toBe(5);
        });

        describe("bot betting time", () => {
            it("should run bot during first half betting time with buffer", async () => {
                // arrange
                const { placingBetsFirstHalf } = definition.durations;
                gameCron.gameData.remainingTime = placingBetsFirstHalf - 3; // 2 seconds before betting window closes

                // act
                await gameCron.proceed();

                // assert
                expect(bot.run).toHaveBeenCalled();
            });

            it("should not run bot at the end of first half betting time", async () => {
                // arrange
                const { placingBetsFirstHalf } = definition.durations;
                gameCron.gameData.remainingTime = placingBetsFirstHalf - 1; // 1 second before betting window closes

                // act
                await gameCron.proceed();

                // assert
                expect(bot.run).not.toHaveBeenCalled();
            });

            it("should run bot during second half betting time with buffer", async () => {
                // arrange
                const { placingBetsSecondHalf } = definition.durations;
                gameCron.gameData.remainingTime = placingBetsSecondHalf - 3; // 2 seconds before betting window closes

                // act
                await gameCron.proceed();

                // assert
                expect(bot.run).toHaveBeenCalled();
            });

            it("should not run bot at the end of second half betting time", async () => {
                // arrange
                const { placingBetsSecondHalf } = definition.durations;
                gameCron.gameData.remainingTime = placingBetsSecondHalf - 1; // 1 second before betting window closes

                // act
                await gameCron.proceed();

                // assert
                expect(bot.run).not.toHaveBeenCalled();
            });

            it("should not run bot outside betting windows", async () => {
                // arrange
                const { placingBetsFirstHalf, lockingBetFirstHalf, placingBetsSecondHalf, lockingBetSecondHalf } = definition.durations;

                // Test various times outside betting windows
                const testTimes = [
                    placingBetsFirstHalf, // Start of first half betting
                    lockingBetFirstHalf - 1, // Just before first half betting ends
                    placingBetsSecondHalf, // Start of second half betting
                    lockingBetSecondHalf - 1, // Just before second half betting ends
                ];

                for (const time of testTimes) {
                    gameCron.gameData.remainingTime = time;
                    await gameCron.proceed();
                    expect(bot.run).not.toHaveBeenCalled();
                    jest.clearAllMocks();
                }
            });
        });
    });

    describe("getVideoTimelineByVideoName", () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it("should fetch timeline with proxy when enabled", async () => {
            // Arrange
            const videoName = "test-video";
            const mockTimeline = [1, 2, 3];
            gameCron.appConfigs = {
                liveStreamServer: "http://example.com/",
                proxyServer: {
                    enabled: true,
                    url: "http://proxy.com",
                },
            } as any;

            (axios.get as jest.Mock).mockResolvedValue({ data: { timeLine: mockTimeline } });

            // Act
            const result = await gameCron.getVideoTimelineByVideoName(videoName);

            // Assert
            expect(axios.get).toHaveBeenCalledWith("http://example.com/test-video.json", { httpsAgent: expect.any(HttpsProxyAgent) });
            expect(result).toEqual(mockTimeline);
        });

        it("should fetch timeline without proxy when disabled", async () => {
            // Arrange
            const videoName = "test-video";
            const mockTimeline = [1, 2, 3];
            gameCron.appConfigs = {
                liveStreamServer: "http://example.com/",
                proxyServer: {
                    enabled: false,
                },
            } as any;

            (axios.get as jest.Mock).mockResolvedValue({ data: { timeLine: mockTimeline } });

            // Act
            const result = await gameCron.getVideoTimelineByVideoName(videoName);

            // Assert
            expect(axios.get).toHaveBeenCalledWith("http://example.com/test-video.json", { httpsAgent: undefined });
            expect(result).toEqual(mockTimeline);
        });

        it("should handle and log errors when the request fails", async () => {
            // Arrange
            const videoName = "test-video";
            const mockError = new Error("Network error");
            gameCron.appConfigs = {
                liveStreamServer: "http://example.com/",
                proxyServer: { enabled: false },
            } as any;
            gameCron.gameData.roundId = 123;

            (axios.get as jest.Mock).mockRejectedValue(mockError);

            // Act & Assert
            await expect(gameCron.getVideoTimelineByVideoName(videoName)).rejects.toThrow(mockError);
            expect(logService.logError).toHaveBeenCalledWith(
                "In match 123, failed to get video timeline http://example.com/test-video.json with error: Error: Network error"
            );
        });
    });

    describe("getVideoTimelineWithRetry", () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it("should correctly return timeline", async () => {
            // Arrange
            const mockFirstHalfTimeline = [
                { time: 0, event: "start" },
                { time: 10, event: "goal" },
            ];

            jest.spyOn(gameCron, "getVideoTimelineByVideoName").mockResolvedValueOnce(mockFirstHalfTimeline);

            // Act
            const timeline = await gameCron.getVideoTimelineWithRetry("first-half-video", "0", true);

            // Assert
            expect(timeline).toEqual(mockFirstHalfTimeline);
        });

        it("should retry getting video timeline and fallback to default on failure", async () => {
            // Arrange
            const videoName = "test-video";
            const mockError = new Error("Network error");
            gameCron.gameData.roundId = 123;

            jest.spyOn(gameCron, "getVideoTimelineByVideoName").mockRejectedValue(mockError);

            // Act
            const result = await gameCron.getVideoTimelineWithRetry(videoName, "AAAA", true);

            // Assert
            expect(logService.logError).toHaveBeenCalledWith("In match 123, failed to fetch first half timeline: Error: Network error");
            expect(result).toEqual([1.8, 19.033333333333335, 33.8, 42.43333333333333]);
        });
    });

    describe("getEventTimelineByVideoName", () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it("should fetch event timeline with proxy when enabled", async () => {
            // Arrange
            const videoName = "test-video";
            const mockEventTimeline = { 
                timeline: [1, 2, 3], 
                eventName: ["event1", "event2", "event3"] 
            };
            gameCron.appConfigs = {
                liveStreamServer: "http://example.com/",
                proxyServer: {
                    enabled: true,
                    url: "http://proxy.com",
                },
            } as any;

            (axios.get as jest.Mock).mockResolvedValue({ data: mockEventTimeline });

            // Act
            const result = await gameCron.getEventTimelineByVideoName(videoName);

            // Assert
            expect(axios.get).toHaveBeenCalledWith("http://example.com/event_test-video.json", { httpsAgent: expect.any(HttpsProxyAgent) });
            expect(result).toEqual(mockEventTimeline);
        });

        it("should fetch event timeline without proxy when disabled", async () => {
            // Arrange
            const videoName = "test-video";
            const mockEventTimeline = { 
                timeline: [1, 2, 3], 
                eventName: ["event1", "event2", "event3"] 
            };
            gameCron.appConfigs = {
                liveStreamServer: "http://example.com/",
                proxyServer: {
                    enabled: false,
                },
            } as any;

            (axios.get as jest.Mock).mockResolvedValue({ data: mockEventTimeline });

            // Act
            const result = await gameCron.getEventTimelineByVideoName(videoName);

            // Assert
            expect(axios.get).toHaveBeenCalledWith("http://example.com/event_test-video.json", { httpsAgent: undefined });
            expect(result).toEqual(mockEventTimeline);
        });

        it("should handle and log errors when the request fails", async () => {
            // Arrange
            const videoName = "test-video";
            const mockError = new Error("Network error");
            gameCron.appConfigs = {
                liveStreamServer: "http://example.com/",
                proxyServer: { enabled: false },
            } as any;
            gameCron.gameData.roundId = 123;

            (axios.get as jest.Mock).mockRejectedValue(mockError);

            // Act & Assert
            await expect(gameCron.getEventTimelineByVideoName(videoName)).rejects.toThrow(mockError);
            expect(logService.logError).toHaveBeenCalledWith(
                "In match 123, failed to get event timeline http://example.com/event_test-video.json with error: Error: Network error"
            );
        });
    });

    describe("getEventTimelineWithRetry", () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it("should correctly return event timeline", async () => {
            // Arrange
            const mockEventTimeline = {
                timeLine: [0, 10, 20],
                eventName: ["start", "goal", "end"]
            };

            jest.spyOn(gameCron, "getEventTimelineByVideoName").mockResolvedValueOnce(mockEventTimeline);

            // Act
            const result = await gameCron.getEventTimelineWithRetry("test-video", "AAA", true);

            // Assert
            expect(result).toEqual(mockEventTimeline);
        });

        it("should retry getting event timeline and fallback to default on failure", async () => {
            // Arrange
            const videoName = "test-video";
            const mockError = new Error("Network error");
            gameCron.gameData.roundId = 123;
            gameCron.gameData.result = { firstHalfVideo: "first-half-video" } as any;

            jest.spyOn(gameCron, "getEventTimelineByVideoName").mockRejectedValue(mockError);
            jest.spyOn(gameCron, "getDefaultEventTimeline").mockReturnValue({
                timeline: [1, 2, 3],
                eventName: ["event1", "event2", "event3"]
            });

            // Act
            const result = await gameCron.getEventTimelineWithRetry(videoName, "AAAA", true);

            // Assert
            expect(logService.logError).toHaveBeenCalledWith("In match 123, failed to fetch first half timeline: Error: Network error");
            expect(gameCron.getDefaultEventTimeline).toHaveBeenCalledWith("AAAA", true);
            expect(result).toEqual({
                timeline: [1, 2, 3],
                eventName: ["event1", "event2", "event3"]
            });
        });
    });

    describe("getVideoTimelineAndVoiceForFirstHalf", () => {
        it("should call getVideoTimelineWithRetry and getEventTimelineWithRetry with correct arguments and set up voice generation", async () => {
            // Arrange
            const videoName = "first-half-video";
            const isFirstHalf = true;
            const mockTimeline = [7, 8, 9];
            const mockEventTimeline = {
                timeLine: [7, 8, 9],
                eventName: ["goal_H", "goal_A", "goal_A"]
            };
            
            gameCron.gameData.result = {
                firstHalfVideo: videoName,
                firstHalf: "0",
            } as any;
            
            jest.spyOn(gameCron, "getVideoTimelineWithRetry").mockResolvedValueOnce(mockTimeline);
            jest.spyOn(gameCron, "getEventTimelineWithRetry").mockResolvedValueOnce(mockEventTimeline);
            jest.spyOn(require("../../../src/helpers/voices"), "generateVoiceWithEventTimeline").mockReturnValue(["voice1", "voice2"]);

            // Act
            await gameCron.getVideoTimelineAndVoiceForFirstHalf();

            // Assert
            expect(gameCron.getVideoTimelineWithRetry).toHaveBeenCalledWith(videoName, "0", isFirstHalf);
            expect(gameCron.getEventTimelineWithRetry).toHaveBeenCalledWith(videoName, "0", isFirstHalf);
            expect(gameCron.gameData.result.firstHalfTimeline).toEqual(mockTimeline);
            expect(gameCron.gameData.result.firstHalfEventTimeline).toEqual(mockEventTimeline);
            expect(require("../../../src/helpers/voices").generateVoiceWithEventTimeline).toHaveBeenCalledWith({
                timeline: mockEventTimeline.timeLine,
                eventName: mockEventTimeline.eventName,
            }, expect.anything());
            expect(gameCron.gameData.result.voices).toEqual(["voice1", "voice2"]);
        });

        it("should use custom voice config when available", async () => {
            // Arrange
            const videoName = "first-half-video";
            const mockTimeline = [7, 8, 9];
            const mockEventTimeline = {
                timeLine: [7, 8, 9],
                eventName: ["goal_H", "goal_A", "goal_A"]
            };
            const customVoiceConfig = {
                goal: { 1: 5, 2: 10, 3: 8 },
                save: { 1: 2, 2: 3, 3: 4 }
            };
            
            gameCron.gameData.result = {
                firstHalfVideo: videoName,
                firstHalf: "0",
            } as any;
            gameCron.gameData.voiceConfig = customVoiceConfig;
            
            jest.spyOn(gameCron, "getVideoTimelineWithRetry").mockResolvedValueOnce(mockTimeline);
            jest.spyOn(gameCron, "getEventTimelineWithRetry").mockResolvedValueOnce(mockEventTimeline);
            const generateVoiceSpy = jest.spyOn(require("../../../src/helpers/voices"), "generateVoiceWithEventTimeline").mockReturnValue(["voice1", "voice2"]);

            // Act
            await gameCron.getVideoTimelineAndVoiceForFirstHalf();

            // Assert
            expect(generateVoiceSpy.mock.calls[0][1]).toBe(customVoiceConfig);
        });
    });

    describe("getVideoTimelineAndVoiceForSecondHalf", () => {
        it("should call getVideoTimelineWithRetry and getEventTimelineWithRetry with correct arguments and set up voice generation", async () => {
            // Arrange
            const videoName = "second-half-video";
            const isFirstHalf = false;
            const mockTimeline = [7, 8, 9];
            const mockEventTimeline = {
                timeLine: [7, 8, 9],
                eventName: ["goal_H", "goal_A", "goal_A"]
            };
            
            gameCron.gameData.result = {
                secondHalfVideo: videoName,
                secondHalf: "0",
                firstHalf: "HAA"
            } as any;
            
            jest.spyOn(gameCron, "getVideoTimelineWithRetry").mockResolvedValueOnce(mockTimeline);
            jest.spyOn(gameCron, "getEventTimelineWithRetry").mockResolvedValueOnce(mockEventTimeline);
            jest.spyOn(require("../../../src/helpers/voices"), "generateVoiceWithEventTimeline").mockReturnValue(["voice3", "voice4"]);

            // Act
            await gameCron.getVideoTimelineAndVoiceForSecondHalf();

            // Assert
            expect(gameCron.getVideoTimelineWithRetry).toHaveBeenCalledWith(videoName, "0", isFirstHalf);
            expect(gameCron.getEventTimelineWithRetry).toHaveBeenCalledWith(videoName, "0", isFirstHalf);
            expect(gameCron.gameData.result.secondHalfTimeline).toEqual(mockTimeline);
            expect(gameCron.gameData.result.secondHalfEventTimeline).toEqual(mockEventTimeline);
            expect(require("../../../src/helpers/voices").generateVoiceWithEventTimeline).toHaveBeenCalledWith({
                timeline: mockEventTimeline.timeLine,
                eventName: mockEventTimeline.eventName,
                firstHalfScore: "HAA"
            }, expect.anything());
            expect(gameCron.gameData.result.voices).toEqual(["voice3", "voice4"]);
        });

        it("should use custom voice config when available", async () => {
            // Arrange
            const videoName = "second-half-video";
            const mockTimeline = [7, 8, 9];
            const mockEventTimeline = {
                timeLine: [7, 8, 9],
                eventName: ["goal_H", "goal_A", "goal_A"]
            };
            const customVoiceConfig = {
                goal: { 1: 5, 2: 10, 3: 8 },
                save: { 1: 2, 2: 3, 3: 4 }
            };
            
            gameCron.gameData.result = {
                secondHalfVideo: videoName,
                secondHalf: "0",
                firstHalf: "HAA"
            } as any;
            gameCron.gameData.voiceConfig = customVoiceConfig;
            
            jest.spyOn(gameCron, "getVideoTimelineWithRetry").mockResolvedValueOnce(mockTimeline);
            jest.spyOn(gameCron, "getEventTimelineWithRetry").mockResolvedValueOnce(mockEventTimeline);
            const generateVoiceSpy = jest.spyOn(require("../../../src/helpers/voices"), "generateVoiceWithEventTimeline").mockReturnValue(["voice3", "voice4"]);

            // Act
            await gameCron.getVideoTimelineAndVoiceForSecondHalf();

            // Assert
            expect(generateVoiceSpy.mock.calls[0][1]).toBe(customVoiceConfig);
        });
    });

    describe("publishVideoStreamAndVoiceFirstHalf", () => {
        it("should publish first half video result and voices", () => {
            // Arrange
            gameCron.gameData.result = {
                firstHalfVideo: "http://marble-football/watch?v=HH",
                firstHalfTimeline: [1, 2, 3],
                firstHalfEventTimeline: {
                    timeline: [1.5, 2.5, 3.5],
                    eventName: ["goal_H", "goal_H", "hit_glove_B"]
                },
                firstHalf: "HH",
                voices: ["voice1", "voice2"],
            } as any;
            
            // Act
            (gameCron as any).publishVideoStreamAndVoiceFirstHalf();
            
            // Assert
            expect(runningRoundInfoPublisher.publishToAllUsers).toHaveBeenCalledWith({
                videoResult: {
                    firstHalfVideo: "http://marble-football/watch?v=HH",
                    firstHalfTimeline: [1, 2, 3],
                    firstHalf: "HH",
                }
            });
            expect(runningRoundInfoPublisher.publishToAllUsers).toHaveBeenCalledWith({
                voices: ["voice1", "voice2"]
            });
        });
    });

    describe("publishVideoStreamAndVoiceSecondHalf", () => {
        it("should publish second half video result and voices", () => {
            // Arrange
            gameCron.gameData.result = {
                secondHalfVideo: "http://marble-football/watch?v=AA",
                secondHalfTimeline: [4, 5, 6],
                secondHalfEventTimeline: {
                    timeline: [4.5, 5.5, 6.5],
                    eventName: ["goal_A", "goal_A", "hit_glove_R"]
                },
                secondHalf: "AA",
                voices: ["voice1", "voice2"],
            } as any;
            
            // Act
            (gameCron as any).publishVideoStreamAndVoiceSecondHalf();
            
            // Assert
            expect(runningRoundInfoPublisher.publishToAllUsers).toHaveBeenCalledWith({
                videoResult: {
                    secondHalfVideo: "http://marble-football/watch?v=AA",
                    secondHalfTimeline: [4, 5, 6],
                    secondHalf: "AA",
                }
            });
            expect(runningRoundInfoPublisher.publishToAllUsers).toHaveBeenCalledWith({
                voices: ["voice1", "voice2"]
            });
        });
    });

    describe("queryLastResult", () => {
        let superQueryLastResultSpy: any;

        beforeEach(() => {
            superQueryLastResultSpy = jest.spyOn(Table.Crons.TableGameCron.prototype, "queryLastResult").mockImplementation();
        });

        it("should call super.queryLastResult", async () => {
            // Act
            await gameCron.queryLastResult();

            // Assert
            expect(superQueryLastResultSpy).toHaveBeenCalled();
        });

        it("should set publishedTournament", async () => {
            // Arrange
            (tournamentConsumer.getLastTournament as any).mockResolvedValue("fake tournament");

            // Act
            await gameCron.queryLastResult();

            // Assert
            expect(gameCron.gameData.publishedTournament).toEqual("fake tournament");
        });
    });

    describe("getDefaultVideoTimeline", () => {
        it("should return correct default timeline for first half", () => {
            // Arrange
            const videoName = crypto.createHash("sha256").update(`HAA-0`).digest("hex");

            // Act
            const videoTimeline = gameCron.getDefaultVideoTimeline("HAA", true);

            // Assert
            expect(gameCron.gameData.result.firstHalfVideo).toEqual(videoName);
            expect(videoTimeline).toEqual([10.133333333333333, 18.9, 41.4]);
        });

        it("should return correct default timeline for second half", () => {
            // Arrange
            const videoName = crypto.createHash("sha256").update(`AAH-0`).digest("hex");

            // Act
            const videoTimeline = gameCron.getDefaultVideoTimeline("AAH", false);

            // Assert
            expect(gameCron.gameData.result.secondHalfVideo).toEqual(videoName);
            expect(videoTimeline).toEqual([19.166666666666668, 26.9, 40.766666666666666]);
        });
    });

    describe("timing helper methods", () => {
        it("should correctly identify first half betting time", () => {
            // Create test cases with different remaining times
            const { placingBetsFirstHalf, lockingBetFirstHalf } = definition.durations;

            // Should be true during first half betting window
            expect((gameCron as any).isDuringFirstHalfBettingTime(placingBetsFirstHalf - 1)).toBe(true);
            expect((gameCron as any).isDuringFirstHalfBettingTime(lockingBetFirstHalf + 1)).toBe(true);
            expect((gameCron as any).isDuringFirstHalfBettingTime(lockingBetFirstHalf)).toBe(true);

            // Should be false outside first half betting window
            expect((gameCron as any).isDuringFirstHalfBettingTime(placingBetsFirstHalf)).toBe(false);
        });

        it("should correctly identify second half betting time", () => {
            // Create test cases with different remaining times
            const { placingBetsSecondHalf, lockingBetSecondHalf } = definition.durations;

            // Should be true during second half betting window
            expect((gameCron as any).isDuringSecondHalfBettingTime(placingBetsSecondHalf - 1)).toBe(true);
            expect((gameCron as any).isDuringSecondHalfBettingTime(lockingBetSecondHalf + 1)).toBe(true);
            expect((gameCron as any).isDuringSecondHalfBettingTime(lockingBetSecondHalf)).toBe(true);

            // Should be false outside second half betting window
            expect((gameCron as any).isDuringSecondHalfBettingTime(placingBetsSecondHalf)).toBe(false);
        });

        it("should correctly identify start placing bet first half time", () => {
            const { placingBetsFirstHalf } = definition.durations;

            expect((gameCron as any).isStartPlacingBetFirstHalf(placingBetsFirstHalf)).toBe(true);
            expect((gameCron as any).isStartPlacingBetFirstHalf(placingBetsFirstHalf - 1)).toBe(false);
        });

        it("should correctly identify locking bet first half time", () => {
            const { lockingBetFirstHalf } = definition.durations;

            expect((gameCron as any).isLockingBetFirstHalf(lockingBetFirstHalf - 1)).toBe(true);
            expect((gameCron as any).isLockingBetFirstHalf(lockingBetFirstHalf)).toBe(false);
        });

        it("should correctly identify streaming video first half time", () => {
            const { streamingVideoFirstHalf } = definition.durations;

            expect((gameCron as any).isStreamingVideoFirstHalf(streamingVideoFirstHalf)).toBe(true);
            expect((gameCron as any).isStreamingVideoFirstHalf(streamingVideoFirstHalf - 1)).toBe(false);
        });

        it("should correctly identify start placing bet second half time", () => {
            const { placingBetsSecondHalf } = definition.durations;

            expect((gameCron as any).isStartPlacingBetSecondHalf(placingBetsSecondHalf)).toBe(true);
            expect((gameCron as any).isStartPlacingBetSecondHalf(placingBetsSecondHalf - 1)).toBe(false);
        });

        it("should correctly identify locking bet second half time", () => {
            const { lockingBetSecondHalf } = definition.durations;

            expect((gameCron as any).isLockingBetSecondHalf(lockingBetSecondHalf - 1)).toBe(true);
            expect((gameCron as any).isLockingBetSecondHalf(lockingBetSecondHalf)).toBe(false);
        });

        it("should correctly identify streaming video second half time", () => {
            const { streamingVideoSecondHalf } = definition.durations;

            expect((gameCron as any).isStreamingVideoSecondHalf(streamingVideoSecondHalf)).toBe(true);
            expect((gameCron as any).isStreamingVideoSecondHalf(streamingVideoSecondHalf - 1)).toBe(false);
        });

        it("should correctly identify bot betting time", () => {
            // Create test cases with different remaining times
            const { placingBetsFirstHalf, lockingBetFirstHalf, placingBetsSecondHalf, lockingBetSecondHalf } = definition.durations;

            // Should be true during first half betting window with buffer
            expect((gameCron as any).isDuringBotBettingTime(placingBetsFirstHalf - 3)).toBe(true);
            expect((gameCron as any).isDuringBotBettingTime(lockingBetFirstHalf + 1)).toBe(true);

            // Should be true during second half betting window with buffer
            expect((gameCron as any).isDuringBotBettingTime(placingBetsSecondHalf - 3)).toBe(true);
            expect((gameCron as any).isDuringBotBettingTime(lockingBetSecondHalf + 1)).toBe(true);

            // Should be false at the end of betting windows
            expect((gameCron as any).isDuringBotBettingTime(placingBetsFirstHalf - 1)).toBe(false);
            expect((gameCron as any).isDuringBotBettingTime(placingBetsSecondHalf - 1)).toBe(false);

            // Should be false outside betting windows
            expect((gameCron as any).isDuringBotBettingTime(placingBetsFirstHalf)).toBe(false);
            expect((gameCron as any).isDuringBotBettingTime(lockingBetFirstHalf)).toBe(true);
            expect((gameCron as any).isDuringBotBettingTime(placingBetsSecondHalf)).toBe(false);
            expect((gameCron as any).isDuringBotBettingTime(lockingBetSecondHalf)).toBe(true);
        });
    });

    describe("updateNewMatchConfig", () => {
        it("should update match config with first half, random second half config, and voice config", async () => {
            // Arrange
            const mockVoiceConfig = { 
                intro: 1, 
                goal: 2, 
                halfTime: 3 
            };
            (cacheConsumer.get as jest.Mock).mockResolvedValue(mockVoiceConfig);
            
            // Act
            await gameCron.updateNewMatchConfig();

            // Assert
            expect(gameCron.gameData.matchConfig).toBeDefined();
            expect(gameCron.gameData.matchConfig.firstHalfConfig).toBeDefined();
            expect(gameCron.gameData.matchConfig.secondHalfConfig).toBeDefined();
            expect(gameCron.gameData.voiceConfig).toEqual(mockVoiceConfig);
            expect(cacheConsumer.get).toHaveBeenCalledWith('voice_config', expect.any(Function));
        });
    });

    describe("calculateAndPublishOddsPreMatch", () => {
        beforeEach(() => {
            jest.clearAllMocks();

            gameCron.gameData = {
                matchConfig: {
                    firstHalfConfig: {},
                    secondHalfConfig: {},
                },
                gameConfigs: {
                    margin: 0.05,
                },
            } as any;
        });

        it("should calculate pre-match odds and publish them", () => {
            // Arrange
            const mockOdds = {
                home: 2.0,
                away: 3.0,
                draw: 3.5,
                over: 1.9,
                under: 1.9,
                even: 1.95,
                odd: 1.95,
            };

            jest.spyOn(require("../../../src/helpers/odds-helper"), "calculatePreMatchOdds").mockReturnValue(mockOdds);

            // Act
            gameCron.calculateAndPublishOddsPreMatch();

            // Assert
            expect(gameStatusPublisher.publishOdds).toHaveBeenCalledWith({
                [PRE_MATCH_BET_CHOICES.home]: mockOdds.home,
                [PRE_MATCH_BET_CHOICES.away]: mockOdds.away,
                [PRE_MATCH_BET_CHOICES.draw]: mockOdds.draw,
                [PRE_MATCH_BET_CHOICES.over]: mockOdds.over,
                [PRE_MATCH_BET_CHOICES.under]: mockOdds.under,
                [PRE_MATCH_BET_CHOICES.even]: mockOdds.even,
                [PRE_MATCH_BET_CHOICES.odd]: mockOdds.odd,
            });
        });

        it("should pass correct parameters to calculatePreMatchOdds", () => {
            // Arrange
            const calculatePreMatchOddsSpy = jest.spyOn(require("../../../src/helpers/odds-helper"), "calculatePreMatchOdds");

            // Act
            gameCron.calculateAndPublishOddsPreMatch();

            // Assert
            expect(calculatePreMatchOddsSpy).toHaveBeenCalledWith(gameCron.gameData.matchConfig, gameCron.gameData.gameConfigs.margin);
        });
    });

    describe("calculateAndPublishOddsLive", () => {
        beforeEach(() => {
            // Reset mocks
            jest.clearAllMocks();

            // Setup test data
            gameCron.gameData = {
                matchConfig: {
                    secondHalfConfig: {},
                },
                gameConfigs: {
                    margin: 0.05,
                },
                result: {
                    firstHalf: "HH",
                },
            } as any;
        });

        it("should calculate live odds and publish them", () => {
            // Arrange
            const mockOdds = {
                [LIVE_BET_CHOICES.homeLive]: 2.5,
                [LIVE_BET_CHOICES.awayLive]: 2.8,
                [LIVE_BET_CHOICES.drawLive]: 3.2,
                [LIVE_BET_CHOICES.overLive]: 1.85,
                [LIVE_BET_CHOICES.underLive]: 1.95,
                [LIVE_BET_CHOICES.evenLive]: 1.92,
                [LIVE_BET_CHOICES.oddLive]: 1.92,
            };

            jest.spyOn(require("../../../src/helpers/odds-helper"), "calculateLiveOdds").mockReturnValue(mockOdds);

            // Act
            gameCron.calculateAndPublishOddsLive();

            // Assert
            expect(gameStatusPublisher.publishOdds).toHaveBeenCalledWith({
                [LIVE_BET_CHOICES.homeLive]: mockOdds[LIVE_BET_CHOICES.homeLive],
                [LIVE_BET_CHOICES.awayLive]: mockOdds[LIVE_BET_CHOICES.awayLive],
                [LIVE_BET_CHOICES.drawLive]: mockOdds[LIVE_BET_CHOICES.drawLive],
                [LIVE_BET_CHOICES.overLive]: mockOdds[LIVE_BET_CHOICES.overLive],
                [LIVE_BET_CHOICES.underLive]: mockOdds[LIVE_BET_CHOICES.underLive],
                [LIVE_BET_CHOICES.evenLive]: mockOdds[LIVE_BET_CHOICES.evenLive],
                [LIVE_BET_CHOICES.oddLive]: mockOdds[LIVE_BET_CHOICES.oddLive],
            });
        });

        it("should pass correct parameters to calculateLiveOdds", () => {
            // Arrange
            const calculateLiveOddsSpy = jest.spyOn(require("../../../src/helpers/odds-helper"), "calculateLiveOdds");

            // Act
            gameCron.calculateAndPublishOddsLive();

            // Assert
            expect(calculateLiveOddsSpy).toHaveBeenCalledWith(
                gameCron.gameData.matchConfig.secondHalfConfig,
                gameCron.gameData.result.firstHalf,
                gameCron.gameData.gameConfigs.margin
            );
        });
    });

    describe("publishVoices", () => {
        it("should publish voices to all users", () => {
            // Arrange
            gameCron.gameData.result = {
                voices: ["voice1", "voice2", "voice3"]
            } as any;
            
            // Act
            (gameCron as any).publishVoices();
            
            // Assert
            expect(runningRoundInfoPublisher.publishToAllUsers).toHaveBeenCalledWith({
                voices: ["voice1", "voice2", "voice3"]
            });
        });

        it("should handle case with no voices", () => {
            // Arrange
            gameCron.gameData.result = {} as any;
            
            // Act
            (gameCron as any).publishVoices();
            
            // Assert
            expect(runningRoundInfoPublisher.publishToAllUsers).toHaveBeenCalledWith({
                voices: {}
            });
        });
    });

    describe("getDefaultEventTimeline", () => {
        it("should return correct default event timeline for first half", () => {
            // Arrange
            gameCron.gameData.result = {
                firstHalfVideo: "test-video"
            } as any;
            
            // Mock the event timelines module
            const defaultEventTimelines = require("../../../src/timelines/event-timelines");
            defaultEventTimelines["test-video_HAA"] = {
                timeLine: [1, 2, 3],
                eventName: ["goal_H", "goal_A", "goal_A"]
            };
            
            // Act
            const eventTimeline = gameCron.getDefaultEventTimeline("HAA", true);
            
            // Assert
            expect(eventTimeline).toEqual({
                timeLine: [1, 2, 3],
                eventName: ["goal_H", "goal_A", "goal_A"]
            });
            expect(logService.logWarning).toHaveBeenCalledWith(expect.stringContaining("test-video_HAA"));
        });
        
        it("should return correct default event timeline for second half", () => {
            // Arrange
            gameCron.gameData.result = {
                secondHalfVideo: "test-video"
            } as any;
            
            // Mock the event timelines module
            const defaultEventTimelines = require("../../../src/timelines/event-timelines");
            defaultEventTimelines["test-video_AAH"] = {
                timeLine: [4, 5, 6],
                eventName: ["goal_A", "goal_A", "goal_H"]
            };
            
            // Act
            const eventTimeline = gameCron.getDefaultEventTimeline("AAH", false);
            
            // Assert
            expect(eventTimeline).toEqual({
                timeLine: [4, 5, 6],
                eventName: ["goal_A", "goal_A", "goal_H"]
            });
            expect(logService.logWarning).toHaveBeenCalledWith(expect.stringContaining("test-video_AAH"));
        });
    });

    describe("getVoiceConfigFromCache", () => {
        it("should return voice config from cache if available", async () => {
            // Arrange
            const mockVoiceConfig = { intro: 1, goal: 2 };
            (cacheConsumer.get as jest.Mock).mockResolvedValue(mockVoiceConfig);
            
            // Act
            const result = await (gameCron as any).getVoiceConfigFromCache();
            
            // Assert
            expect(result).toEqual(mockVoiceConfig);
            expect(cacheConsumer.get).toHaveBeenCalledWith('voice_config', expect.any(Function));
        });
    });

    describe("getVoiceConfigWithRetry", () => {
        it("should retry getting voice config and return result on success", async () => {
            // Arrange
            const mockVoiceConfig = { intro: 1, goal: 2 };
            jest.spyOn(gameCron as any, 'getVoiceConfigFromStreamServer').mockResolvedValue(mockVoiceConfig);
            
            // Act
            const result = await (gameCron as any).getVoiceConfigWithRetry();
            
            // Assert
            expect(result).toEqual(mockVoiceConfig);
        });

        it("should return default voice config on failure after retries", async () => {
            // Arrange
            const mockError = new Error("Network error");
            jest.spyOn(gameCron as any, 'getVoiceConfigFromStreamServer').mockRejectedValue(mockError);
            
            // Act
            const result = await (gameCron as any).getVoiceConfigWithRetry();
            
            // Assert
            expect(result).toEqual(DEFAULT_VOICE_DURATION_CONFIG);
            expect(logService.logError).toHaveBeenCalledWith(expect.stringContaining("failed to get voice config with error"));
        });
    });

    describe("getVoiceConfigFromStreamServer", () => {
        it("should fetch voice config with proxy when enabled", async () => {
            // Arrange
            const mockVoiceConfig = { intro: 1, goal: 2 };
            gameCron.appConfigs = {
                liveStreamServer: "http://example.com/",
                proxyServer: {
                    enabled: true,
                    url: "http://proxy.com",
                },
            } as any;

            (axios.get as jest.Mock).mockResolvedValue({ data: mockVoiceConfig });

            // Act
            const result = await (gameCron as any).getVoiceConfigFromStreamServer();

            // Assert
            expect(axios.get).toHaveBeenCalledWith("http://example.com/config_voice.json", { httpsAgent: expect.any(HttpsProxyAgent) });
            expect(result).toEqual(mockVoiceConfig);
        });

        it("should fetch voice config without proxy when disabled", async () => {
            // Arrange
            const mockVoiceConfig = { intro: 1, goal: 2 };
            gameCron.appConfigs = {
                liveStreamServer: "http://example.com/",
                proxyServer: {
                    enabled: false,
                },
            } as any;

            (axios.get as jest.Mock).mockResolvedValue({ data: mockVoiceConfig });

            // Act
            const result = await (gameCron as any).getVoiceConfigFromStreamServer();

            // Assert
            expect(axios.get).toHaveBeenCalledWith("http://example.com/config_voice.json", { httpsAgent: undefined });
            expect(result).toEqual(mockVoiceConfig);
        });

        it("should handle and log errors when the request fails", async () => {
            // Arrange
            const mockError = new Error("Network error");
            gameCron.appConfigs = {
                liveStreamServer: "http://example.com/",
                proxyServer: { enabled: false },
            } as any;

            (axios.get as jest.Mock).mockRejectedValue(mockError);

            // Act & Assert
            await expect((gameCron as any).getVoiceConfigFromStreamServer()).rejects.toThrow(mockError);
            expect(logService.logError).toHaveBeenCalledWith(
                "failed to get voice config with error: Error: Network error"
            );
        });
    });
});
