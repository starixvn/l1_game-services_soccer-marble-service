import { Event, EventDetailNotification, EventNotification, OddsFeedEventName, OddsFeedEventSource, Scheduler } from "odds-feed-client";
import { MarbleEvent } from "../shared-types";
import { DelayHandlingService } from "../delay/delay-handling-service";
import { extractGameId } from "../../helpers/eventid";
import GameStatusPublisher from "../../publishers/game-status-publisher";
import { BetStatusService } from "../bet-status/bet-status-service";

export enum GameFlow {
    Start = "Start",
    Result = "Result",
}

type GameFlowPayload = {
    gameFlow: GameFlow;
}


interface GameFlowServiceContainer {
    oddsFeedEventSource: OddsFeedEventSource<MarbleEvent>;
    scheduler: Scheduler;
    delayHandlingService: DelayHandlingService;
    gameStatusPublisher: GameStatusPublisher;
    betStatusService: BetStatusService;
}

export class GameFlowService {
    private readonly oddsFeedEventSource: OddsFeedEventSource<MarbleEvent>;
    private readonly scheduler: Scheduler;
    private readonly delayHandlingService: DelayHandlingService;
    private readonly gameStatusPublisher: GameStatusPublisher;

    private readonly _currentGameFlowByGameId: Record<string, GameFlowPayload> = {};
    private readonly boundHandleEventStart: (notification: EventNotification) => void;
    private readonly boundHandleEventDetailResultAvailable: (notification: EventDetailNotification) => void;
    
    constructor(container: GameFlowServiceContainer) {
        this.oddsFeedEventSource = container.oddsFeedEventSource;
        this.scheduler = container.scheduler;
        this.delayHandlingService = container.delayHandlingService;
        this.gameStatusPublisher = container.gameStatusPublisher;
        this.boundHandleEventStart = this.handleEventStart.bind(this);
        this.boundHandleEventDetailResultAvailable = this.handleEventDetailResultAvailable.bind(this);
    }

    init() {
        this.oddsFeedEventSource.eventOn(OddsFeedEventName.EventStart, this.boundHandleEventStart);
        this.oddsFeedEventSource.eventDetailOn(OddsFeedEventName.EventDetailResultsAvailable, this.boundHandleEventDetailResultAvailable);
    }

    dispose() {
        this.oddsFeedEventSource.eventOff(OddsFeedEventName.EventStart, this.boundHandleEventStart);
        this.oddsFeedEventSource.eventDetailOff(OddsFeedEventName.EventDetailResultsAvailable, this.boundHandleEventDetailResultAvailable);
    }

    handleEventStart({ event }: EventNotification) {
        const timeStart = 
            this.delayHandlingService.getDelayedTime({ event, time: new Date(event.scheduleStartTs) }, {
                oddFeedEventType: OddsFeedEventName.EventStart,
            });
        this.scheduler.schedule(timeStart, this.handleStartGame.bind(this, { event }), {
            overrideNow: event.scheduleStartTs,
        });
    }
    
    handleEventDetailResultAvailable({ event, index }: EventDetailNotification) {
        if (index !== event.eventDetails.length - 1) {
            return;
        }
        const timeResult = 
            this.delayHandlingService.getDelayedTime({ event, time: new Date(event.eventDetails[index].resultsAvailableTs) }, {
                oddFeedEventType: OddsFeedEventName.EventDetailResultsAvailable,
            });
        this.scheduler.schedule(timeResult, this.handleResult.bind(this, { event, index }), {
            overrideNow: event.eventDetails[index].resultsAvailableTs,
        });
    }

    handleResult({ event }: EventDetailNotification ) {
        this.switchGameFlow({ event, gameFlow: GameFlow.Result });
    }

    handleStartGame({ event }: EventNotification) {
        this.switchGameFlow({ event, gameFlow: GameFlow.Start });
    }

    getCurrentGameFlow(gameId: string): GameFlowPayload {
        return this._currentGameFlowByGameId[gameId];
    }

    private switchGameFlow({ event, gameFlow }: { event: Event, gameFlow: GameFlow }) {
        const gameId = extractGameId(event.eventID).toString();
        const payload = { gameFlow };
        this._currentGameFlowByGameId[gameId] = payload;
        this.gameStatusPublisher.publishToAllUsers(payload);
    }
}