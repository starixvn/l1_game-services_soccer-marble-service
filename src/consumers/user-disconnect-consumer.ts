import { Socket } from "socket.io";
import GameData from "../game-data";
import { Core } from "sc-game-base";

export default class UserDisconnectConsumer extends Core.BaseEventConsumers.UserDisconnectConsumer {
    declare gameData: GameData;

    consume(socketClient: Socket) {
        const realPlayer = this.gameData.realPlayers[socketClient.id];

        if (realPlayer) {
            delete this.gameData.players[realPlayer.UID];
        }

        super.consume(socketClient);
    }
}
