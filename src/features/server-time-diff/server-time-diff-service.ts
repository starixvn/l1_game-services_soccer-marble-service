import { OddsFeedEventSource, Notification, EventNotification, OddsFeedEventName } from "odds-feed-client";

interface ServerTimeDiffServiceContainer {
    oddsFeedEventSource: OddsFeedEventSource;
}

export class ServerTimeDiffService {
    private readonly oddsFeedEventSource: OddsFeedEventSource;

    private delay = 0;

    constructor(container: ServerTimeDiffServiceContainer) {
        this.oddsFeedEventSource = container.oddsFeedEventSource;
    }
    
    init() {
        this.oddsFeedEventSource.eventOn(OddsFeedEventName.EventUpcoming, this.handleEventUpcoming);
    }

    dispose() {
        this.oddsFeedEventSource.eventOff(OddsFeedEventName.EventUpcoming, this.handleEventUpcoming);
    }

    handleEventUpcoming = ({ event }: EventNotification) => {
        const serviceNow = Date.now();
        const serverNow = event.now ? new Date(event.now).getTime() : serviceNow;
        this.delay = serverNow - serviceNow;
    }

    get now() {
        console.log("delay", this.delay);
        return Date.now() + this.delay;
    }
}