import { OddsFeedEventSource, Notification, EventNotification } from "odds-feed-client";

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
        this.oddsFeedEventSource.on(this.handleAllEvent);
    }

    dispose() {
        this.oddsFeedEventSource.off(this.handleAllEvent);
    }

    handleAllEvent = (_: any, notification: Notification) => {
        const { event } = notification as EventNotification;
        if (!event) {
            return;
        }

        const serviceNow = Date.now();
        const serverNow = event.now ? new Date(event.now).getTime() : serviceNow;
        this.delay = serverNow - serviceNow;
    }

    get now() {
        return Date.now() + this.delay;
    }
}