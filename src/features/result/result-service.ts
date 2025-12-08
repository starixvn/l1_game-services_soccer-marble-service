import { Scheduler, OddsFeedEventSource, EventDetailNotification, OddsFeedEventName, EventNotification } from "odds-feed-client";
import SettleGameRoundConsumer from "../../consumers/settle-game-round-consumer";
import { DelayHandlingService } from "../delay/delay-handling-service";
import { EventDetailSettlementResult, ResultAndSettlementResult } from "../../models/rounds";
import { MarbleEvent, MarbleEventDetail, Market } from "../shared-types";

const SCORE_SPLITTER = ":";

type ResultServiceContainer = {
    oddsFeedEventSource: OddsFeedEventSource<MarbleEvent>;
    settleGameRoundConsumer: SettleGameRoundConsumer;
    scheduler: Scheduler;
    delayHandlingService: DelayHandlingService;
};

export class ResultService {
    private readonly oddsFeedEventSource: OddsFeedEventSource<MarbleEvent>;
    private readonly settleGameRoundConsumer: SettleGameRoundConsumer;
    private readonly scheduler: Scheduler;
    private readonly delayHandlingService: DelayHandlingService;
    
    private readonly boundHandleEventResultAvailable: (notification: EventDetailNotification<MarbleEvent>) => void;
    private readonly boundHandleEventStart: (notification: EventNotification<MarbleEvent>) => void;

    constructor(container: ResultServiceContainer) {
        this.oddsFeedEventSource = container.oddsFeedEventSource;
        this.settleGameRoundConsumer = container.settleGameRoundConsumer;
        this.boundHandleEventResultAvailable = this.handleEventDetailResultsAvailable.bind(this);
        this.scheduler = container.scheduler;
        this.delayHandlingService = container.delayHandlingService;
        this.boundHandleEventStart = this.handleEventStart.bind(this);
    }
    
    public currentLiveScore: { home: number; away: number } = { home: 0, away: 0 };

    public readonly resultByEventId: Record<number, ResultAndSettlementResult> = {};

    initEvent() {
        this.oddsFeedEventSource.eventOn(OddsFeedEventName.EventStart, this.boundHandleEventStart);
        this.oddsFeedEventSource.eventDetailOn(OddsFeedEventName.EventDetailResultsAvailable, this.boundHandleEventResultAvailable);
    }

    dispose() {
        this.oddsFeedEventSource.eventOff(OddsFeedEventName.EventStart, this.boundHandleEventStart);
        this.oddsFeedEventSource.eventDetailOff(OddsFeedEventName.EventDetailResultsAvailable, this.boundHandleEventResultAvailable);
    }

    handleEventStart({ event }: EventNotification<MarbleEvent>) {
        const timeToResetLiveScore = this.delayHandlingService.getDelayedTime(
            { event, time: new Date(event.scheduleStartTs) },
            {
                oddFeedEventType: OddsFeedEventName.EventStart,
            }
        );
        this.scheduler.schedule(timeToResetLiveScore, this.resetLiveScore.bind(this), {
            overrideNow: event.now,
        });
    }

    handleEventDetailResultsAvailable({ event, index }: EventDetailNotification<MarbleEvent>) {
        
        const timeToUpdateLiveScore = this.delayHandlingService.getDelayedTime(
            { event, time: new Date(event.eventDetails[index].resultsAvailableTs) },
            {
                oddFeedEventType: OddsFeedEventName.EventDetailResultsAvailable,
            }
        );

        this.scheduler.schedule(timeToUpdateLiveScore, this.updateLiveScore.bind(this, { event, index }), {
            overrideNow: event.now,
        });

        if (index !== event.eventDetails.length - 1) {
            return;
        }
        
        const timeToSettle = this.delayHandlingService.getDelayedTime(
            { event, time: new Date(event.eventDetails[index].resultsAvailableTs) },
            {
                oddFeedEventType: OddsFeedEventName.EventDetailResultsAvailable,
            }
        );

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
                phase: eventDetail.phase,
                result: eventDetail.result,
            };
            result.settlementResult[index] = this.getSettlementResultFromEventDetail(eventDetail);
        });

        this.resultByEventId[event.eventID] = result;

        this.settleGameRoundConsumer.settleSpecificRound({
            roundId: event.eventID,
            result: result.result,
            settlementResult: result.settlementResult,
            match: { home: event.eventNameAKey, away: event.eventNameBKey },
        });
    }

    resetLiveScore() {
        this.currentLiveScore = { home: 0, away: 0 };
    }

    updateLiveScore({ event, index }: EventDetailNotification<MarbleEvent>) {
        let home = this.currentLiveScore.home;
        let away = this.currentLiveScore.away;

        const result = event.eventDetails[index].result;
        const splitResult = result.split(SCORE_SPLITTER);
        home += Number(splitResult[0]);
        away += Number(splitResult[1]);

        this.currentLiveScore = { home, away };
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
