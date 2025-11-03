import GameData from "../../game-data";
import { extractGameId } from "../../helpers/eventid";
import { GameStatusPublisher } from "../../publishers";
import { DelayHandlingService } from "../delay/delay-handling-service";
import { EventDetailNotification, EventNotification, OddsFeedEventName, OddsFeedEventSource, SystemNotification, Scheduler, Event } from "odds-feed-client";

interface CurrentEventServiceContainer {
    oddsFeedEventSource: OddsFeedEventSource;
    delayHandlingService: DelayHandlingService;
    scheduler: Scheduler;
    gameData: GameData;
    gameStatusPublisher: GameStatusPublisher;
}

export class CurrentEventService {
    private readonly oddsFeedEventSource: OddsFeedEventSource;
    private readonly delayHandlingService: DelayHandlingService;
    private readonly scheduler: Scheduler;
    private readonly _currentEventByGameId: Record<string, number> = {};
    private readonly _currentEventDetailIndexByGameId: Record<string, number> = {};
    private readonly gameData: GameData;
    private readonly gameStatusPublisher: GameStatusPublisher;

    private readonly boundHandleEventStart: (notification: EventNotification) => void;
    private readonly boundHandleEventCleanup: (notification: SystemNotification) => void;
    private readonly boundHandleEventDetailOddAvailable: (notification: EventDetailNotification) => void;
    
    public readonly eventByEventId: Record<number, Event> = {};

    constructor(container: CurrentEventServiceContainer) {
        this.oddsFeedEventSource = container.oddsFeedEventSource;
        this.delayHandlingService = container.delayHandlingService;
        this.scheduler = container.scheduler;
        this.gameData = container.gameData;
        this.gameStatusPublisher = container.gameStatusPublisher;
        this.boundHandleEventStart = this.handleEventStart.bind(this);
        this.boundHandleEventDetailOddAvailable = this.handleEventDetailOddAvailable.bind(this);
        this.boundHandleEventCleanup = this.cleanup.bind(this);
    }

    public readonly eventName = "currentEvent";

    public getCurrentEventByGameId(gameId: string) {
        return this._currentEventByGameId[gameId];
    }

    public getCurrentEvent() {
        const gameId = extractGameId(this.gameData.roundId).toString();
        return this.eventByEventId[this._currentEventByGameId[gameId]];
    }

    public getCurrentEventDetailIndexByGameId(gameId: string) {
        return this._currentEventDetailIndexByGameId[gameId];
    }

    public getCurrentPhaseByGameId(gameId: string) {
        const currentEvent = this.getCurrentEventByGameId(gameId);
        const currentEventDetailIndex = this.getCurrentEventDetailIndexByGameId(gameId);
        const currentEventDetail = this.eventByEventId[currentEvent]?.eventDetails[currentEventDetailIndex];
        return currentEventDetail?.phase;
    }

    public getCurrentByGameId(gameId: string) {
        return {
            event: this.getCurrentEventByGameId(gameId),
            eventDetailIndex: this.getCurrentEventDetailIndexByGameId(gameId),
            phase: this.getCurrentPhaseByGameId(gameId),
        }
    }

    public initEvent() {
        this.oddsFeedEventSource.eventOn(
            OddsFeedEventName.EventStart,
            this.boundHandleEventStart
        );
        this.oddsFeedEventSource.eventDetailOn(
            OddsFeedEventName.EventDetailOddsAvailable,
            this.boundHandleEventDetailOddAvailable
        );
        this.oddsFeedEventSource.cleanupOn(this.boundHandleEventCleanup);
    }

    public dispose() {
        this.oddsFeedEventSource.eventOff(OddsFeedEventName.EventStart, this.boundHandleEventStart);
        this.oddsFeedEventSource.eventDetailOff(
            OddsFeedEventName.EventDetailOddsAvailable, 
            this.boundHandleEventDetailOddAvailable);
        this.oddsFeedEventSource.cleanupOff(this.boundHandleEventCleanup);
    }

    public cleanup({ eventID }: SystemNotification) {
        delete this.eventByEventId[eventID];
    }

    public handleEventStart({ event }: EventNotification) {
        const whenToSetCurrentEvent = this.delayHandlingService.getDelayedTime({ event, time: new Date(event.scheduleStartTs) }, {
            oddFeedEventType: OddsFeedEventName.EventStart,
        });
        this.scheduler.schedule(whenToSetCurrentEvent, this.handleEventIndexReset.bind(this, { event }));
    }

    public handleEventDetailOddAvailable({ event, index }: EventDetailNotification) {
        if (index === 0) {
            return;
        }

        const delayedTime = this.delayHandlingService.getDelayedTime({ event, time: new Date(event.eventDetails[index].oddsAvailableTs) }, {
            oddFeedEventType: OddsFeedEventName.EventDetailOddsAvailable,
        });
        this.scheduler.schedule(delayedTime, this.handleEventIndexChange.bind(this, { event, index }));
    }

    public handleEventIndexReset({ event }: EventNotification) {
        const gameId = extractGameId(event.eventID).toString();
        this._currentEventDetailIndexByGameId[gameId] = 0;
        this.eventByEventId[event.eventID] = event;
        this._currentEventByGameId[gameId] = event.eventID;
        this.gameData.roundId = event.eventID;
        this.gameStatusPublisher.publishMatch(event);
    }

    public handleEventIndexChange({ event, index }: EventDetailNotification) {
        const gameId = extractGameId(event.eventID).toString();
        this._currentEventDetailIndexByGameId[gameId] = index;
    }
}