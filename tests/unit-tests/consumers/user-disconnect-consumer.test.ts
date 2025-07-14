import UserDisconnectConsumer from "../../../src/consumers/user-disconnect-consumer";
import { Socket } from "socket.io";
import { Core } from "sc-game-base";
import { stub } from "jest-auto-stub";
import GameData from "../../../src/game-data";

describe("UserDisconnectConsumer", () => {
    let userDisconnectConsumer: UserDisconnectConsumer;
    let mockSocketClient: Socket;
    const gameData = stub<GameData>();

    beforeEach(() => {
        userDisconnectConsumer = new UserDisconnectConsumer(gameData);

        mockSocketClient = {
            id: "socket-id",
        } as Socket;
    });

    it("should delete the player from gameData if realPlayer exists", () => {
        const mockRealPlayer = { UID: "player-uid" } as any;
        gameData.realPlayers[mockSocketClient.id] = mockRealPlayer;
        gameData.players[mockRealPlayer.UID] = mockRealPlayer;

        userDisconnectConsumer.consume(mockSocketClient);

        expect(gameData.players[mockRealPlayer.UID]).toBeUndefined();
    });

    it("should call the super consume method", () => {
        const superConsumeSpy = jest.spyOn(Core.BaseEventConsumers.UserDisconnectConsumer.prototype, "consume");

        userDisconnectConsumer.consume(mockSocketClient);

        expect(superConsumeSpy).toHaveBeenCalledWith(mockSocketClient);
    });
});
