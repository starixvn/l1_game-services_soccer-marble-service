import { TableGameDefinition, TableGameData } from "sc-game-base/src/table";
import { TableUserSignInConsumer } from "sc-game-base/src/table/event-consumers";
import { TableUserSignInPublisher } from "sc-game-base/src/table/event-publishers";
import { Socket } from "socket.io";
import GameData from "../game-data";
import { CurrentEventService } from "../features/current-event/current-event-service";

export class UserSignInConsumer extends TableUserSignInConsumer {
    declare gameData: GameData;
    declare userSignInPublisher: TableUserSignInPublisher;
    currentEventService: CurrentEventService;

    constructor(definition: TableGameDefinition, gameData: TableGameData, userSignInPublisher: TableUserSignInPublisher, playGamePermissionValidator: any, appConfigs: any, gameManagementApiClientFactory: any, currentEventService: CurrentEventService) {
        super(definition, gameData, userSignInPublisher, playGamePermissionValidator, appConfigs, gameManagementApiClientFactory);
        this.currentEventService = currentEventService;
    }

    override async consume(socketClient: Socket, payload: any): Promise<void> {
        if (this.oddFeedNotAvailable()) {
            this.userSignInPublisher.publishUmNotice(socketClient, this.gameData.umMessages);
            return;
        }

        super.consume(socketClient, payload);
    }

    private oddFeedNotAvailable() {
        const currentEventId = this.gameData.roundId;

        if (!currentEventId) {
            return true;
        }

        const currentEvent = this.currentEventService.eventByEventId[currentEventId];
        if (!currentEvent) {
            return true;
        }

        const timeNow = Date.now();
        const currEventEndTime = new Date(currentEvent?.eventDetails[currentEvent.eventDetails.length - 1].resultsAvailableTs).getTime();
        return timeNow > currEventEndTime;
    }
}