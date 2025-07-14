import { UnsettledRoundConsumer } from "../../../src/consumers";
import { stub } from "jest-auto-stub";
import GameData from "../../../src/game-data";
import { decrypt } from "sc-game-base/src/core/helpers/crypto-helper";
import { gameManagementApiClientFactory } from "../global-stubs";

jest.mock("sc-game-base/src/core/helpers/crypto-helper", () => ({
    decrypt: jest.fn().mockReturnValue('{"result":"result"}'),
}));

describe("UnSettleRoundConsumer", () => {
    let unSettleRoundConsumer: UnsettledRoundConsumer;
    const gameData = stub<GameData>({
        roundId: 1,
        result: undefined,
    });

    beforeEach(() => {
        unSettleRoundConsumer = new UnsettledRoundConsumer({
            gameData,
            gameManagementApiClientFactory,
        } as any);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("generateResult", () => {
        describe("when lastResultRecord is not defined", () => {
            it("should not set result", async () => {
                // act
                await unSettleRoundConsumer.generateResult({});

                // assert
                expect(decrypt).not.toHaveBeenCalled();
                expect(gameData.result).toBeUndefined();
            });
        });

        describe("when lastResultRecord is different roundId with current roundId", () => {
            it("should not set result", async () => {
                // arrange
                gameData.roundId = 1;
                gameData.lastResultRecord = {
                    roundId: 2,
                    encryptedResult: "encrypted",
                };
                // act
                await unSettleRoundConsumer.generateResult({});

                // assert
                expect(decrypt).not.toHaveBeenCalled();
                expect(gameData.result).toBeUndefined();
            });
        });

        describe("when lastResultRecord is valid", () => {
            it("should set result with correct value", async () => {
                // arrange
                gameData.roundId = 1;

                gameData.lastResultRecord = {
                    roundId: 1,
                    encryptedResult: "encrypted",
                };

                // act
                await unSettleRoundConsumer.generateResult({});

                // assert
                expect(decrypt).toHaveBeenCalledWith("encrypted");
                expect(gameData.result).toStrictEqual({ result: "result" });
            });
        });
    });
});
