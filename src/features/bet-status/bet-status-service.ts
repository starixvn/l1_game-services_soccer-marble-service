import { EventDetailNotification, EventNotification, OddsFeedEventName, OddsFeedEventSource, Scheduler, SystemNotification } from "odds-feed-client";
import { GameStatusPublisher } from "../../publishers";
import { extractGameId } from "../../helpers/eventid";
import { DelayHandlingService } from "../delay/delay-handling-service";
import { HedgeBetService } from "./hedge-bet-service";
import GameData from "../../game-data";
import { BetConfig, MarbleEvent, Market } from "../shared-types";

interface BetStatusServiceContainer {
    oddsFeedEventSource: OddsFeedEventSource<MarbleEvent>;
    gameStatusPublisher: GameStatusPublisher;
    delayHandlingService: DelayHandlingService;
    scheduler: Scheduler;
    hedgeBetService: HedgeBetService;
    gameData: GameData;
}



export class BetStatusService {

    private readonly oddsFeedEventSource: OddsFeedEventSource<MarbleEvent>;
    private readonly gameStatusPublisher: GameStatusPublisher;
    private readonly delayHandlingService: DelayHandlingService;
    private readonly scheduler: Scheduler;
    private readonly hedgeBetService: HedgeBetService;
    private readonly gameData: GameData;

    private readonly betConfigByEventId: Record<number, BetConfig> = {};
    private readonly currentOddIndexByGameId: Record<string, number> = {};
 
    private readonly boundHandleEventStart: (notification: EventNotification<MarbleEvent>) => void;
    private readonly boundHandleEventDetailOddAvailable: (notification: EventDetailNotification<MarbleEvent>) => void;
    private readonly boundHandleEventUpcoming: (notification: EventNotification<MarbleEvent>) => void;
    private readonly boundHandleEventCleanup: (notification: SystemNotification) => void;
    private readonly boundHandleEventDetailUpcoming: (notification: EventDetailNotification<MarbleEvent>) => void;

    constructor(container: BetStatusServiceContainer) {
        this.oddsFeedEventSource = container.oddsFeedEventSource;
        this.gameStatusPublisher = container.gameStatusPublisher;
        this.delayHandlingService = container.delayHandlingService;
        this.scheduler = container.scheduler;
        this.hedgeBetService = container.hedgeBetService;
        this.gameData = container.gameData;

        this.boundHandleEventStart = this.handleEventStart.bind(this);
        this.boundHandleEventDetailOddAvailable = this.handleEventDetailOddAvailable.bind(this);
        this.boundHandleEventUpcoming = this.handleEventUpcoming.bind(this);
        this.boundHandleEventCleanup = this.handleCleanupEventUpcoming.bind(this);
        this.boundHandleEventDetailUpcoming = this.handleEventDetailUpcoming.bind(this);
    }
    public readonly betStatusByGameId: Record<string, boolean> = {};
    public readonly betEventDetailIndexByGameId: Record<string, number> = {};
    public readonly betChoicePointsByGameId: Record<string, Record<string, number>> = {};
    public readonly dynamicOddsByGameId: Record<string, Record<string, number>> = {};
    public currentRoundId?: number;


    public initEvent() {
        this.oddsFeedEventSource.eventOn(OddsFeedEventName.EventStart, this.boundHandleEventStart);
        this.oddsFeedEventSource.eventDetailOn(OddsFeedEventName.EventDetailOddsAvailable, this.boundHandleEventDetailOddAvailable);
        this.oddsFeedEventSource.eventOn(OddsFeedEventName.EventUpcoming, this.boundHandleEventUpcoming);
        this.oddsFeedEventSource.cleanupOn(this.boundHandleEventCleanup);
        this.oddsFeedEventSource.eventDetailOn(OddsFeedEventName.EventDetailUpComing, this.boundHandleEventDetailUpcoming);
    }

    public dispose() {
        this.oddsFeedEventSource.eventOff(OddsFeedEventName.EventStart, this.boundHandleEventStart);
        this.oddsFeedEventSource.eventDetailOff(OddsFeedEventName.EventDetailOddsAvailable, this.boundHandleEventDetailOddAvailable);
        this.oddsFeedEventSource.eventOff(OddsFeedEventName.EventUpcoming, this.boundHandleEventUpcoming);
        this.oddsFeedEventSource.cleanupOff(this.boundHandleEventCleanup);
        this.oddsFeedEventSource.eventDetailOff(OddsFeedEventName.EventDetailUpComing, this.boundHandleEventDetailUpcoming);
    }

    public handleEventUpcoming({ event }: EventNotification<MarbleEvent>) {
        this.betConfigByEventId[event.eventID] = {
            delayPlaceBetByOddsAvailableByMilliseconds: event.config?.bet?.delayPlaceBetByOddsAvailableByMilliseconds,
            lockBetTimeBeforeScheduleStartByMilliseconds: event.config?.bet?.lockBetTimeBeforeScheduleStartByMilliseconds,
        };
    }

    public handleEventDetailUpcoming({ event, index }: EventDetailNotification<MarbleEvent>) {
        // ALL schedule that is happen BEFORE the timestamp in the odd feed response should schedule on upcoming
        this.scheduleLockBet({ event, index });
    }

    public handleCleanupEventUpcoming({ eventID }: SystemNotification) {
        delete this.betConfigByEventId[eventID];
    }

    public handleEventStart({ event }: EventNotification<MarbleEvent>) {
        const gameId = extractGameId(event.eventID).toString();
        this.betStatusByGameId[gameId] = false;
        this.currentRoundId = event.eventID;
        this.schedulePlaceBet({ event, index: 0 });
    }

    public handleEventDetailOddAvailable({ event, index }: EventDetailNotification<MarbleEvent>) {
        if (index === 0) {
            return;
        }

        this.schedulePlaceBet({ event, index });
    }

    public getBetStatus() {
        const gameId = extractGameId(this.gameData.roundId).toString();
        return {
            points: this.betChoicePointsByGameId[gameId],
            odds: this.dynamicOddsByGameId[gameId],
            currentIndex: this.currentOddIndexByGameId[gameId],
        }
    }

    private schedulePlaceBet({ event, index }: EventDetailNotification<MarbleEvent>) {
        const rawPlaceBetTime = index === 0
            ? event.scheduleStartTs
            : event.eventDetails[index].oddsAvailableTs;
        const oddFeedEventType = index === 0 ? OddsFeedEventName.EventStart : OddsFeedEventName.EventDetailOddsAvailable;

        const configuredPlaceBetTime =
            new Date(rawPlaceBetTime).getTime() +
            (this.betConfigByEventId[event.eventID]?.delayPlaceBetByOddsAvailableByMilliseconds ?? 0);

        const timeToPlaceBet = this.delayHandlingService.getDelayedTime({ eventId: event.eventID, time: new Date(configuredPlaceBetTime) }, {
            oddFeedEventType,
        });

        this.scheduler.schedule(timeToPlaceBet, this.handleBetChoiceReady.bind(this, { event, index }));
    }

    private scheduleLockBet({ event, index }: EventDetailNotification<MarbleEvent>) {

        if (index === 0) {
            return;
        }

        const rawLockBetTime = event.eventDetails[index].scheduleStartTs;
        const configuredLockBetTime =
            new Date(rawLockBetTime).getTime() -
            (this.betConfigByEventId[event.eventID]?.lockBetTimeBeforeScheduleStartByMilliseconds ?? 0);
            
        const timeToLockBet = this.delayHandlingService.getDelayedTime({ eventId: event.eventID, time: new Date(configuredLockBetTime) }, {
            oddFeedEventType: OddsFeedEventName.EventDetailStart,
        });

        this.scheduler.schedule(timeToLockBet, this.publishBetChoiceLocked.bind(this, { event, index }), {
            ignorePast: true
        });
    }

    private publishBetChoiceLocked({ event, index }: EventDetailNotification<MarbleEvent>) {
        const gameId = extractGameId(event.eventID).toString();
        this.betStatusByGameId[gameId] = false;
        this.gameStatusPublisher.publishEndPlacingBetStatus();
    }

    private handleBetChoiceReady({ event, index }: EventDetailNotification<MarbleEvent>) {
        const gameId = extractGameId(event.eventID).toString();
        this.betEventDetailIndexByGameId[gameId] = index;
        this.betStatusByGameId[gameId] = true;
        this.currentOddIndexByGameId[gameId] = index;
        this.dynamicOddsByGameId[gameId] = this.getOddFromEventDetail({ event, index });
        this.betChoicePointsByGameId[gameId] = this.getPointFromEventDetail({ event, index });
        this.hedgeBetService.resetHedgeBetRestriction(gameId);
        this.hedgeBetService.updateHedgeBetGroups(gameId, this.getHedgeBetGroups({ event, index }));
        this.publishBetChoiceReady({ gameId });
    }
    
    private publishBetChoiceReady({ gameId }: { gameId: string }) {
        this.gameStatusPublisher.publishStartPlacingBetStatus();
        this.gameStatusPublisher.publishOdds(this.dynamicOddsByGameId[gameId]);
        this.gameStatusPublisher.publishBetChoicePoints(this.betChoicePointsByGameId[gameId]);
        this.gameStatusPublisher.publishCurrentIndex(this.currentOddIndexByGameId[gameId]);
    }

    private getOddFromEventDetail({ event, index }: EventDetailNotification<MarbleEvent>) {
        const eventDetail = event.eventDetails[index];
        if (!eventDetail) {
            return {};
        }
        
        const odds: Record<string, number> = {};
        for (const market of eventDetail.markets) {
            for (const selection of market.selections) {
                odds[selection.betChoice] = selection.price ?? 0;
            }
        }
        return odds;
    }

    private getPointFromEventDetail({ event, index }: EventDetailNotification<MarbleEvent>) {
        const eventDetail = event.eventDetails[index];
        if (!eventDetail) {
            return {};
        }
        
        const points: Record<string, number> = {};
        for (const market of eventDetail.markets) {
            for (const selection of market.selections) {
                points[selection.betChoice] = selection.point ?? 0;
            }
        }
        return points;
    }

    private getHedgeBetGroups({ event, index }: EventDetailNotification<MarbleEvent>): Set<string>[] {
        const eventDetail = event.eventDetails[index];
        if (!eventDetail) {
            return [];
        }
        
        return eventDetail.markets.map(
            (market: Market) => new Set(
                market.selections.map((selection) => selection.betChoice).filter((choice) => !market.hedgeBetExclusion?.includes(choice))
            )
        );
    }
}