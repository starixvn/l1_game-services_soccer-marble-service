import { EventNotification, OddsFeedEventName, OddsFeedEventSource } from "odds-feed-client";
import { GameCron } from "../../crons";

interface CheckStatusServiceContainer {
    oddsFeedEventSource: OddsFeedEventSource;
    gameCron: GameCron;
}

export class CheckStatusService {

    private readonly oddsFeedEventSource: OddsFeedEventSource;
    private readonly gameCron: GameCron;
    private readonly boundHandleEventStart: (notification: EventNotification) => void;

    constructor(container: CheckStatusServiceContainer) {
        this.oddsFeedEventSource = container.oddsFeedEventSource;
        this.gameCron = container.gameCron;
        this.boundHandleEventStart = this.handleEventStart.bind(this);
    }


    public initEvent() {
        this.oddsFeedEventSource.eventOn(OddsFeedEventName.EventStart, this.boundHandleEventStart);
    }

    public dispose() {
        this.oddsFeedEventSource.eventOff(OddsFeedEventName.EventStart, this.boundHandleEventStart);
    }

    handleEventStart() {
        this.checkStatus();
    }

    private checkStatus() {
        this.gameCron.checkGameStatus();
    }
}