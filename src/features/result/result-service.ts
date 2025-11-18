import { Scheduler, OddsFeedEventSource, EventDetailNotification, OddsFeedEventName } from "odds-feed-client";
import SettleGameRoundConsumer from "../../consumers/settle-game-round-consumer";
import { DelayHandlingService } from "../delay/delay-handling-service";
import { EventDetailSettlementResult, ResultAndSettlementResult } from "../../models/rounds";
import { MarbleEvent, MarbleEventDetail, Market } from "../shared-types";


type ResultServiceContainer = {
    oddsFeedEventSource: OddsFeedEventSource<MarbleEvent>;
    settleGameRoundConsumer: SettleGameRoundConsumer;
    scheduler: Scheduler;
    delayHandlingService: DelayHandlingService;
}



export class ResultService {
    private readonly oddsFeedEventSource: OddsFeedEventSource<MarbleEvent>;
    private readonly settleGameRoundConsumer: SettleGameRoundConsumer;
    private readonly scheduler: Scheduler;
    private readonly delayHandlingService: DelayHandlingService;

    private readonly boundHandleEventResultAvailable: (notification: EventDetailNotification<MarbleEvent>) => void;
    
    constructor(container: ResultServiceContainer) {
        this.oddsFeedEventSource = container.oddsFeedEventSource;
        this.settleGameRoundConsumer = container.settleGameRoundConsumer;
        this.boundHandleEventResultAvailable = this.handleEventDetailResultsAvailable.bind(this);
        this.scheduler = container.scheduler;
        this.delayHandlingService = container.delayHandlingService;
    }

    public readonly resultByEventId: Record<number, ResultAndSettlementResult> = {};

    initEvent() {
        this.oddsFeedEventSource.eventDetailOn(OddsFeedEventName.EventDetailResultsAvailable, this.boundHandleEventResultAvailable);
    }

    dispose() {
        this.oddsFeedEventSource.eventDetailOff(OddsFeedEventName.EventDetailResultsAvailable, this.boundHandleEventResultAvailable);
    }

    handleEventDetailResultsAvailable({ event, index }: EventDetailNotification<MarbleEvent>) {
        if (index !== event.eventDetails.length - 1) {
            return;
        }
        
        const timeToSettle = this.delayHandlingService.getDelayedTime({ event, time: new Date(event.eventDetails[index].resultsAvailableTs) }, {
            oddFeedEventType: OddsFeedEventName.EventDetailResultsAvailable,
        });

        this.scheduler.schedule(timeToSettle, this.getResultAndSettle.bind(this, { event, index }), {
            overrideNow: event.now,
        });
    }

    getResultAndSettle({ event }: EventDetailNotification<MarbleEvent>) {
        const result: ResultAndSettlementResult = {
            result: {},
            settlementResult: {},
        };

        event.eventDetails.forEach((eventDetail, index) => {
            result.result[index] = {
                finalScore: eventDetail.result.finalScore,
                goalSequence: eventDetail.result.goalSequence,
                playlist: eventDetail.playlist,
                phase: eventDetail.phase,
            };
            result.settlementResult[index] = this.getSettlementResultFromEventDetail(eventDetail);
        });

        this.resultByEventId[event.eventID] = result;

        this.settleGameRoundConsumer.settleSpecificRound({
            roundId: event.eventID,
            result: result.result,
            settlementResult: result.settlementResult,
        });
    }

    private getSettlementResultFromEventDetail(eventDetail: MarbleEventDetail) {
        const settlementResult: EventDetailSettlementResult = {};
        eventDetail.markets.forEach((market: Market) => {
            market.selections.forEach((selection) => {
                settlementResult[selection.betChoice] = selection.settlementStatus === "W";
            });
        });
        return settlementResult;
    }
}