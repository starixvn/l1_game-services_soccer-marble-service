import { Event, EventNotification, OddsFeedEventName, OddsFeedEventSource, Scheduler, SystemNotification } from "odds-feed-client";
import { MarbleEvent } from "../shared-types";
import { DelayHandlingService } from "../delay/delay-handling-service";
import GameStatusPublisher from "../../publishers/game-status-publisher";
import { ServerTimeDiffService } from "../server-time-diff/server-time-diff-service";

interface UpcomingEventServiceContainer {
    oddsFeedEventSource: OddsFeedEventSource<MarbleEvent>;
    scheduler: Scheduler;
    delayHandlingService: DelayHandlingService;
    gameStatusPublisher: GameStatusPublisher;
    serverTimeDiffService: ServerTimeDiffService;
}

export class UpcomingEventService {
    private readonly oddsFeedEventSource: OddsFeedEventSource<MarbleEvent>;
    private readonly delayHandlingService: DelayHandlingService;
    private readonly scheduler: Scheduler;
    private readonly serverTimeDiffService: ServerTimeDiffService;

    private readonly upcomingEventQueue: Array<Event> = [];
    
    
    constructor(container: UpcomingEventServiceContainer) {
        this.oddsFeedEventSource = container.oddsFeedEventSource;
        this.delayHandlingService = container.delayHandlingService;
        this.scheduler = container.scheduler;
        this.serverTimeDiffService = container.serverTimeDiffService;
    }

    get isEventUpcoming() {
        return this.upcomingEventQueue.length > 0;
    }

    get untilNextEvent() {
        const nextEvent = this.upcomingEventQueue[0];
        if (!nextEvent) {
            return undefined;
        }
        
        return this.getTimeToStartEvent({ event: nextEvent }).getTime() - this.serverTimeDiffService.now;
    }
    
    handleEventUpcoming = ({ event }: EventNotification) => {
        console.log("handleEventUpcoming", event.eventID);
        this.upcomingEventQueue.push(event);
    };

    handleEventStart = ({ event }: EventNotification) => {
        const timeToStartEvent = this.getTimeToStartEvent({ event });
        this.scheduler.schedule(timeToStartEvent, this.dequeueEvent.bind(this, { eventID: event.eventID }), {
            overrideNow: event.now,
        });
    };

    init() {
        this.oddsFeedEventSource.eventOn(OddsFeedEventName.EventUpcoming, this.handleEventUpcoming);
    }

    dispose() {
        this.oddsFeedEventSource.eventOff(OddsFeedEventName.EventUpcoming, this.handleEventUpcoming);
    }

    private getTimeToStartEvent({ event }: EventNotification) {
        return this.delayHandlingService.getDelayedTime({ event, time: new Date(event.scheduleStartTs) }, {
            oddFeedEventType: OddsFeedEventName.EventStart,
        });
    }

    private dequeueEvent(_: SystemNotification) {
        this.upcomingEventQueue.shift();
    }
}