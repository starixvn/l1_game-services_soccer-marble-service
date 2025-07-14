import {
    provablyFairConsumer,
    resultsRepository,
    roundResultPublisher,
    tournamentConsumer,
    roundResultConsumer as roundResultConsumerStub,
} from "../global-stubs";

import { stub } from "jest-auto-stub";
import RoundResultConsumer from "../../../src/consumers/round-result-consumer";
import GameData from "../../../src/game-data";
import GameDefinition from "../../../src/game-definition";
import * as ResultHelper from "../../../src/helpers/result-helper";

jest.mock("sc-game-base/src/core/event-consumers", () => {
    class RoundResultConsumer {
        constructor(
            public readonly gameData: object,
            public readonly definition: object,
            public readonly roundResultPublisher: object,
            public readonly resultsRepository: object,
            public readonly provablyFairConsumer: object,
        ) {}

        generateResult() {
            return roundResultConsumerStub.generateResult();
        }
    }

    return { RoundResultConsumer };
});

jest.mock("../../../src/helpers/result-helper", () => ({
    generateResultFromAdminRawResult: jest.fn(),
}));

jest.mock("sc-game-base/src/core/helpers/crypto-helper", () => ({
    encrypt: jest.fn().mockReturnValue("encrypted"),
}));

describe("RoundResultConsumer", () => {
    let roundResultConsumer: RoundResultConsumer;

    const gameData = stub<GameData>({
        result: {},
    });
    const definition = stub<GameDefinition>();

    beforeEach(() => {
        roundResultConsumer = new RoundResultConsumer({
            gameData,
            definition,
            roundResultPublisher,
            resultsRepository,
            provablyFairConsumer,
            tournamentConsumer,
        });

        tournamentConsumer.getCurrentTournament = jest.fn().mockResolvedValue({
            _id: "fake_id",
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("getDataForGenerateResult", () => {
        it("should return matchConfig from gameData", () => {
            // arrange
            gameData.gameConfigs.randomMode = 1;
            gameData.matchConfig = {
                firstHalfConfig: {
                    scoreRate: {
                        "1-0": 1,
                    },
                },
                secondHalfConfig: {
                    scoreRate: {
                        "1-0": 1,
                    },
                },
            };
            gameData.gameConfigs.videoStreamConfig = {
                videoInfos: [
                    { videoName: "HAA", numberOfVideos: 1 },
                    { videoName: "AHH", numberOfVideos: 2 },
                ],
            };

            // act
            const data = roundResultConsumer.getDataForGenerateResult();

            // assert
            expect(data).toEqual({ numberOfVideos: { HAA: 1, AHH: 2 }, matchConfig: gameData.matchConfig });
        });
    });

    describe("generateResult", () => {
        it("should call super.generateResult", async () => {
            // Act
            await roundResultConsumer.generateResult();

            // Assert
            expect(roundResultConsumerStub.generateResult).toHaveBeenCalled();
        });

        it("should generate the round result", async () => {
            // Act
            await roundResultConsumer.generateResult();

            // Assert
            expect(gameData.result).toStrictEqual({
                tournamentId: "fake_id",
            });
        });

        it("should call createResultRecord", async () => {
            // Arrange
            jest.spyOn(roundResultConsumer, "createResultRecord").mockResolvedValue();

            // Act
            await roundResultConsumer.generateResult();

            // Assert
            expect(roundResultConsumer.createResultRecord).toHaveBeenCalled();
        });
    });

    describe("generateResultFromAdmin", () => {
        describe("when roundId is the same", () => {
            beforeEach(() => {
                // Arrange
                gameData.roundId = 1;
                gameData.settlementResultFromAdmin = {
                    roundId: 1,
                    result: {
                        firstHalf: "H",
                        secondHalf: "A",
                        homeWinsOnDraw: false,
                    },
                };
            });
            it("should generate result from admin", () => {
                // Act
                const result = roundResultConsumer.generateResultFromAdmin();

                // Assert
                expect(result).toBe(true);
            });

            it("should call generateResultFromAdminRawResult", () => {
                // Arrange
                gameData.gameConfigs.videoStreamConfig = {
                    videoInfos: [
                        { videoName: "HAA", numberOfVideos: 1 },
                        { videoName: "AHH", numberOfVideos: 2 },
                    ],
                };

                // Act
                roundResultConsumer.generateResultFromAdmin();

                // Assert
                expect(ResultHelper.generateResultFromAdminRawResult).toHaveBeenCalledWith(gameData.settlementResultFromAdmin.result, {
                    HAA: 1,
                    AHH: 2,
                });
            });
        });

        describe("when roundId is different", () => {
            it("should not generate result from admin", () => {
                // Arrange
                gameData.roundId = 1;
                gameData.settlementResultFromAdmin = {
                    roundId: 2,
                    result: {
                        firstHalf: "H",
                        secondHalf: "A",
                        overUnderValue: 2.5,
                        firstHalfOverUnderValue: 1.5,
                        firstHalfVideo: "http://marble-football/watch?v=H",
                        secondHalfVideo: "http://marble-football/watch?v=A",
                        firstHalfTimeline: [],
                        secondHalfTimeline: [],
                        homeWinsOnDraw: false,
                    },
                };

                // Act
                const result = roundResultConsumer.generateResultFromAdmin();

                // Assert
                expect(result).toBe(false);
            });
        });
    });

    describe("createResultRecord", () => {
        it("should create a result record", async () => {
            // Arrange
            gameData.roundId = 1;

            // Act
            await roundResultConsumer.createResultRecord();

            // Assert
            expect(resultsRepository.create).toHaveBeenCalledWith({
                roundId: 1,
                encryptedResult: "encrypted",
            });
        });
    });
});
