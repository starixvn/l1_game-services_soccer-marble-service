import { EventNotification, OddsFeedEventName, OddsFeedEventSource } from "odds-feed-client";

type DelayConfig = {
    globalDelayInMillisecond?: number;
    videoDelayInMillisecond?: number;
    eventScheduleStartDelayInMillisecond?: number;
    eventDetailScheduleStartDelayInMillisecond?: number;
    eventDetailResultAvailableDelayInMillisecond?: number;
}

export interface DelayHandlingServiceContainer {
    oddsFeedEventSource: OddsFeedEventSource;
}

interface DelayOptions {
    oddFeedEventType?: OddsFeedEventName;
}
export class DelayHandlingService {

    private readonly _delayConfigByEventId: Record<number, DelayConfig> = {};
    private readonly oddsFeedEventSource: OddsFeedEventSource;
    private readonly boundHandleEventUpcoming: (notification: EventNotification) => void;

    constructor(container: DelayHandlingServiceContainer) {
        this.oddsFeedEventSource = container.oddsFeedEventSource;
        this.boundHandleEventUpcoming = this.handleEventUpcoming.bind(this);
    }

    public initEvent() {
        this.oddsFeedEventSource.eventOn(
            OddsFeedEventName.EventUpcoming,
            this.boundHandleEventUpcoming
        )
    }

    public getDelayConfig(eventId: number): DelayConfig | undefined {
        return this._delayConfigByEventId[eventId];
    }

    public getDelayedTime({ eventId, time }: { eventId: number, time: Date }, { oddFeedEventType }: DelayOptions = {}): Date {
        const config = this._delayConfigByEventId[eventId];
        if (!config) {
            return time;
        }
        const globalDelayInMillisecond = config.globalDelayInMillisecond ?? 0;
        const eventTypeDelayMilliseconds = this.getDelayConfigByEventType({ config, eventId }, { oddFeedEventType });
        return new Date(time.getTime() + globalDelayInMillisecond + eventTypeDelayMilliseconds);
    }

    public getDelayedTimeWithVideoDelay({ eventId, time }: { eventId: number, time: Date }, { oddFeedEventType }: DelayOptions = {}): Date {
        const config = this._delayConfigByEventId[eventId];
        if (!config) {
            return time;
        }
        const videoDelayInMillisecond = config.videoDelayInMillisecond ?? 0;
        return new Date(this.getDelayedTime({ eventId, time }, { oddFeedEventType }).getTime() + videoDelayInMillisecond);
    }

    public handleEventUpcoming({ event }: EventNotification) {
        const config = (event as any).config?.delay as DelayConfig;
        if (config) {
            this._delayConfigByEventId[event.eventID] = config;
        }
    }

    public dispose() {
        this.oddsFeedEventSource.eventOff(
            OddsFeedEventName.EventUpcoming,
            this.boundHandleEventUpcoming
        )
    }

    private getDelayConfigByEventType({ config, eventId }: { config: DelayConfig, eventId: number }, { oddFeedEventType }: DelayOptions): number {

        if (!oddFeedEventType) {
            return 0;
        }

        switch (oddFeedEventType) {
            case OddsFeedEventName.EventStart:
                return config.eventScheduleStartDelayInMillisecond ?? 0;
            case OddsFeedEventName.EventDetailStart:
                return config.eventDetailScheduleStartDelayInMillisecond ?? 0;
            case OddsFeedEventName.EventDetailResultsAvailable:
                return config.eventDetailResultAvailableDelayInMillisecond ?? 0;
            default:
                return 0;
        }
    }
}