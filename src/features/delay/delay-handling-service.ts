import { Event, OddsFeedEventName } from "odds-feed-client";
import { MarbleEvent } from "../shared-types";

type DelayConfig = {
    globalDelayInMillisecond?: number;
    videoDelayInMillisecond?: number;
    eventScheduleStartDelayInMillisecond?: number;
    eventDetailScheduleStartDelayInMillisecond?: number;
    eventDetailResultAvailableDelayInMillisecond?: number;
}

export interface MarbleEventWithDelayConfig extends MarbleEvent {
    config?: {
        delay?: DelayConfig;
    }
}

interface DelayOptions {
    oddFeedEventType?: OddsFeedEventName;
}

export class DelayHandlingService {

    public getDelayedTime({ event, time }: { event: Event, time: Date }, { oddFeedEventType }: DelayOptions = {}): Date {
        const config = (event as MarbleEventWithDelayConfig).config?.delay;
        if (!config) {
            return time;
        }
        const globalDelayInMillisecond = config.globalDelayInMillisecond ?? 0;
        const eventTypeDelayMilliseconds = this.getDelayConfigByEventType({ config }, { oddFeedEventType });
        return new Date(time.getTime() + globalDelayInMillisecond + eventTypeDelayMilliseconds);
    }

    public getDelayedTimeWithVideoDelay({ event, time }: { event: Event, time: Date }, { oddFeedEventType }: DelayOptions = {}): Date {
        const config = (event as MarbleEventWithDelayConfig).config?.delay;
        if (!config) {
            return time;
        }
        const videoDelayInMillisecond = config.videoDelayInMillisecond ?? 0;
        return new Date(this.getDelayedTime({ event, time }, { oddFeedEventType }).getTime() + videoDelayInMillisecond);
    }

    private getDelayConfigByEventType({ config }: { config: DelayConfig }, { oddFeedEventType }: DelayOptions): number {

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