import { Event, OddsFeedEventName } from "odds-feed-client";
import { MarbleEvent } from "../shared-types";

type DelayConfig = {
    globalDelayMs?: number;
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
        const totalDelay = globalDelayInMillisecond + eventTypeDelayMilliseconds;
        return new Date(time.getTime() + totalDelay);
    }

    private getDelayConfigByEventType({ config }: { config: DelayConfig }, { oddFeedEventType }: DelayOptions): number {
        if (!oddFeedEventType) {
            return 0;
        }

        let delay: number;
        switch (oddFeedEventType) {
            case OddsFeedEventName.EventStart:
                delay = config.eventScheduleStartDelayMs ?? 0;
                break;
            case OddsFeedEventName.EventDetailStart:
                delay = config.eventDetailScheduleStartDelayMs ?? 0;
                break;
            case OddsFeedEventName.EventDetailResultsAvailable:
                delay = config.eventDetailResultAvailableMs ?? 0;
                break;
            case OddsFeedEventName.EventDetailOddsAvailable:
                delay = config.eventDetailOddsAvailableMs ?? 0;
                break;
            default:
                delay = 0;
        }
        
        return delay;
    }
}