import { EventDetailNotification, EventNotification, OddsFeedEventName, OddsFeedEventSource, Scheduler } from "odds-feed-client";
import { GameStatusPublisher } from "../../publishers";
import { DelayHandlingService } from "../delay/delay-handling-service";
import { HedgeBetService } from "./hedge-bet-service";
import GameData from "../../game-data";
import { MarbleEvent, Market } from "../shared-types";
import { MarginConfigs, trueOddsToOddsWithMarginConfig } from "../../helpers/odds-helper";

export interface BetConfig {
    delayPlaceBetMs?: number;
    soonLockBetMs?: number;
}

interface BetStatusServiceContainer {
    oddsFeedEventSource: OddsFeedEventSource<MarbleEvent>;
    gameStatusPublisher: GameStatusPublisher;
    delayHandlingService: DelayHandlingService;
    scheduler: Scheduler;
    hedgeBetService: HedgeBetService;
    gameData: GameData;
}

export interface MarbleEventWithBetConfig extends MarbleEvent {
    config?: {
        bet?: BetConfig;
    }
}

export class BetStatusService {

    private readonly oddsFeedEventSource: OddsFeedEventSource<MarbleEvent>;
    private readonly gameStatusPublisher: GameStatusPublisher;
    private readonly delayHandlingService: DelayHandlingService;
    private readonly scheduler: Scheduler;
    private readonly hedgeBetService: HedgeBetService;
    private readonly gameData: GameData;

 
    private readonly boundHandleEventStart: (notification: EventNotification<MarbleEvent>) => void;
    private readonly boundHandleEventDetailOddAvailable: (notification: EventDetailNotification<MarbleEvent>) => void;
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
        this.boundHandleEventDetailUpcoming = this.handleEventDetailUpcoming.bind(this);
    }

    private _betStatus = false;
    private _betChoicePoints: Record<string, number> = {};
    private _dynamicOdds: Record<string, number> = {};
    private _currentOddIndex = 0;
    private _betGroups: Record<string, string[]> = {};
    private _marginProcessedDynamicOdds: Record<string, number> = {};
    private _previousOdds: Record<string, number> = {};

    public get allowBets() {
        return this._betStatus && Object.keys(this._dynamicOdds ?? {}).length > 0; 
    }

    public get currentIndex() {
        return this._currentOddIndex;
    }

    public get points() {
        return this._betChoicePoints;
    }

    public get odds() {
        return this._marginProcessedDynamicOdds;
    }

    public get betGroups() {
        return this._betGroups;
    }

    public get previousOdds() {
        return this._previousOdds;
    }

    public get payload() {
        let additional = {};
        if (this.currentIndex > 0) {
            additional = { previousOdds: this.previousOdds };
        }
        return { odds: this.odds, points: this.points, index: this.currentIndex, ...additional };
    }

    public initEvent() {
        this.oddsFeedEventSource.eventOn(OddsFeedEventName.EventStart, this.boundHandleEventStart);
        this.oddsFeedEventSource.eventDetailOn(OddsFeedEventName.EventDetailOddsAvailable, this.boundHandleEventDetailOddAvailable);
        this.oddsFeedEventSource.eventDetailOn(OddsFeedEventName.EventDetailUpComing, this.boundHandleEventDetailUpcoming);
    }

    public dispose() {
        this.oddsFeedEventSource.eventOff(OddsFeedEventName.EventStart, this.boundHandleEventStart);
        this.oddsFeedEventSource.eventDetailOff(OddsFeedEventName.EventDetailOddsAvailable, this.boundHandleEventDetailOddAvailable);
        this.oddsFeedEventSource.eventDetailOff(OddsFeedEventName.EventDetailUpComing, this.boundHandleEventDetailUpcoming);
    }

    public handleEventDetailUpcoming({ event, index }: EventDetailNotification<MarbleEvent>) {
        this.scheduleLockBet({ event, index });
    }

    public handleEventStart({ event }: EventNotification<MarbleEventWithBetConfig>) {
        this._betStatus = false;
        this.schedulePlaceBet({ event, index: 0 });
    }

    public handleEventDetailOddAvailable({ event, index }: EventDetailNotification<MarbleEvent>) {
        if (index === 0) {
            return;
        }

        this.schedulePlaceBet({ event, index });
    }

    private getTimeToPlaceBet({ event, index }: EventDetailNotification) {
        const eventWithBetConfig = event as MarbleEventWithBetConfig;
        const rawPlaceBetTime = index === 0
            ? eventWithBetConfig.scheduleStartTs
            : eventWithBetConfig.eventDetails[index].oddsAvailableTs;

        const oddFeedEventType = index === 0 
            ? OddsFeedEventName.EventStart 
            : OddsFeedEventName.EventDetailOddsAvailable;

        const delayPlaceBet = 
            eventWithBetConfig
            .config
            ?.bet
            ?.delayPlaceBetMs 
            ?? 0;

        const timePlaceBet = 
            new Date(rawPlaceBetTime + delayPlaceBet);

        return this.delayHandlingService.getDelayedTime({ event, time: timePlaceBet }, {
            oddFeedEventType,
        });
    }

    private getTimeToLockBet({ event, index }: EventDetailNotification) {
        const rawLockBetTime = event.eventDetails[index].scheduleStartTs;
        const eventWithBetConfig = event as MarbleEventWithBetConfig;
        const lockBetDelay = 
            eventWithBetConfig
            .config
            ?.bet
            ?.soonLockBetMs 
            ?? 0;
        const configuredLockBetTime =
            new Date(rawLockBetTime).getTime() -
            lockBetDelay;
            
        return this.delayHandlingService.getDelayedTime({ event, time: new Date(configuredLockBetTime) }, {
            oddFeedEventType: OddsFeedEventName.EventDetailStart,
        });
    }

    private schedulePlaceBet({ event, index }: EventDetailNotification<MarbleEvent>) {
        const timeToPlaceBet = this.getTimeToPlaceBet({ event, index });

        this.scheduler.schedule(timeToPlaceBet, this.handleBetChoiceReady.bind(this, { event, index }), {
            overrideNow: event.now,
            ignorePast: true
        });
    }

    private scheduleLockBet({ event, index }: EventDetailNotification<MarbleEvent>) {
        const timeToLockBet = this.getTimeToLockBet({ event, index });

        this.scheduler.schedule(timeToLockBet, this.publishBetChoiceLocked.bind(this), {
            ignorePast: true,
            overrideNow: event.now
        });
    }

    private publishBetChoiceLocked() {
        this._betStatus = false;
        this.gameStatusPublisher.publishEndPlacingBetStatus();
    }

    private handleBetChoiceReady({ event, index }: EventDetailNotification<MarbleEvent>) {
        this._betStatus = true;
        this._currentOddIndex = index;

        const { odds, points, groups } = this.getBetDataFromEventDetail({ event, index });

        const marginConfig = this.gameData.gameConfigs.margin as MarginConfigs ?? [];
        const processedOdds = trueOddsToOddsWithMarginConfig(odds ?? {}, marginConfig);
        this._dynamicOdds = odds ?? {};
        this._previousOdds = { ...this._marginProcessedDynamicOdds };
        this._marginProcessedDynamicOdds = processedOdds ?? {};
        this._betChoicePoints = points ?? {};
        this._betGroups = this.formatBetGroup(groups ?? {});


        this.hedgeBetService.resetHedgeBetRestriction();
        this.hedgeBetService.updateHedgeBetGroups(this.getHedgeBetGroups({ event, index }));
        this.publishBetChoiceReady();
    }
    
    private publishBetChoiceReady() {
        this.gameStatusPublisher.publishStartPlacingBetStatus();
        this.gameStatusPublisher.publishToAllUsers(this.payload);
    }

    // f: <string, string> -> <string, array<string>>
    // example { "home": "side", "away": "side" } -> { "side": ["home", "away"] }
    private formatBetGroup(unformattedGroups: Record<string, string>): Record<string, string[]> {
        return Object.entries(unformattedGroups).reduce((acc, [choice, group]) => {
            acc[group] = [...(acc[group] ?? []), choice];
            return acc;
        }, {} as Record<string, string[]>);
    }

    private getBetDataFromEventDetail({ event, index }: EventDetailNotification<MarbleEvent>) {
        const eventDetail = event.eventDetails[index];
        if (!eventDetail) {
            return {};
        }

        const points: Record<string, number> = {};
        const odds: Record<string, number> = {};
        const groups: Record<string, string> = {};

        for (const market of eventDetail.markets) {
            for (const selection of market.selections) {
                points[selection.betChoice] = selection.point ?? 0;
                odds[selection.betChoice] = selection.price ?? 0;
                groups[selection.betChoice] = selection.group ?? "side";
            }
        }
        return { points, odds, groups };
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