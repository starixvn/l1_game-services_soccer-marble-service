import { TableUserSignInConsumer } from "sc-game-base/src/table/event-consumers";
import { TableUserSignInPublisher } from "sc-game-base/src/table/event-publishers";
import GameData from "../game-data";
import { CurrentEventService } from "../features/current-event/current-event-service";
import { ServerTimeDiffService } from "../features/server-time-diff/server-time-diff-service";
import { isEventEnded } from "../helpers/timing-helper";

export class UserSignInConsumer extends TableUserSignInConsumer {
    declare gameData: GameData;
    declare userSignInPublisher: TableUserSignInPublisher;
    currentEventService: CurrentEventService;
    serverTimeDiffService: ServerTimeDiffService;

    constructor(container: any)
    {
        super(container);
        this.currentEventService = container.currentEventService;
        this.serverTimeDiffService = container.serverTimeDiffService;
    }

    override async consume(socketClient: any, payload: any): Promise<void> {
        if (this.eventNoLongerRunning()) {
            this.userSignInPublisher.publishUmNotice(socketClient, this.gameData.umMessages);
            return;
        }

        super.consume(socketClient, payload);
    }

    private eventNoLongerRunning() {
        const currentEventId = this.gameData.roundId;

        if (!currentEventId) {
            return true;
        }

        const currentEvent = this.currentEventService.eventByEventId[currentEventId];
        if (!currentEvent) {
            return true;
        }

        const now = this.serverTimeDiffService.now;
        return isEventEnded({ event: currentEvent, now });
    }
}