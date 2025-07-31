import { TableGameDefinition, TableGameData } from "sc-game-base/src/table";
import { TableUserSignInConsumer } from "sc-game-base/src/table/event-consumers";
import { TableUserSignInPublisher } from "sc-game-base/src/table/event-publishers";
import { Socket } from "socket.io";
import { isOddFeedAvailable } from "../helpers/game-timing";
import GameData from "../game-data";

export class UserSignInConsumer extends TableUserSignInConsumer {
    declare gameData: GameData;
    declare userSignInPublisher: TableUserSignInPublisher;

    constructor(definition: TableGameDefinition, gameData: TableGameData, userSignInPublisher: TableUserSignInPublisher, playGamePermissionValidator: any, appConfigs: any, gameManagementApiClientFactory: any) {
        super(definition, gameData, userSignInPublisher, playGamePermissionValidator, appConfigs, gameManagementApiClientFactory);
    }

    override async consume(socketClient: Socket, payload: any): Promise<void> {
        if (!isOddFeedAvailable(this.gameData)) {
            this.userSignInPublisher.publishUmNotice(socketClient, this.gameData.umMessages);
            return;
        }

        super.consume(socketClient, payload);
    }

}