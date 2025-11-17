import { Event, OddsFeedEventName } from "odds-feed-client";
import { MarbleEvent } from "../shared-types";

type DelayConfig = {
    globalDelayMs?: number;
    videoDelayMs?: number;
    eventScheduleStartDelayMs?: number;
    eventDetailScheduleStartDelayMs?: number;
    eventDetailResultAvailableMs?: number;
    eventDetailOddsAvailableMs?: number;
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
        const globalDelayInMillisecond = config.globalDelayMs ?? 0;
        const eventTypeDelayMilliseconds = this.getDelayConfigByEventType({ config }, { oddFeedEventType });
        return new Date(time.getTime() + globalDelayInMillisecond + eventTypeDelayMilliseconds);
    }

    public getDelayedTimeWithVideoDelay({ event, time }: { event: Event, time: Date }, { oddFeedEventType }: DelayOptions = {}): Date {
        const config = (event as MarbleEventWithDelayConfig).config?.delay;
        if (!config) {
            return time;
        }
        const videoDelayInMillisecond = config.videoDelayMs ?? 0;
        return new Date(this.getDelayedTime({ event, time }, { oddFeedEventType }).getTime() + videoDelayInMillisecond);
    }

    private getDelayConfigByEventType({ config }: { config: DelayConfig }, { oddFeedEventType }: DelayOptions): number {

        if (!oddFeedEventType) {
            return 0;
        }

        switch (oddFeedEventType) {
            case OddsFeedEventName.EventStart:
                return config.eventScheduleStartDelayMs ?? 0;
            case OddsFeedEventName.EventDetailStart:
                return config.eventDetailScheduleStartDelayMs ?? 0;
            case OddsFeedEventName.EventDetailResultsAvailable:
                return config.eventDetailResultAvailableMs ?? 0;
            case OddsFeedEventName.EventDetailOddsAvailable:
                return config.eventDetailOddsAvailableMs ?? 0;
            default:
                return 0;
        }
    }
}