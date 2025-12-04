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
    startRoundWaitingMs?: number;
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
    private _currentOddIndex = 0;
    private _betGroups: Record<string, string[]> = {};
    private _marginProcessedDynamicOdds: Record<string, number> = {};
    private _previousOdds: Record<string, number> = {};

    public get allowBets() {
        return this._betStatus && Object.keys(this._marginProcessedDynamicOdds ?? {}).length > 0; 
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
        console.log("odds available time ", event.eventDetails[index].oddsAvailableTs);
        console.log("now", event.now);

        this.schedulePlaceBet({ event, index });
    }

    private getTimeToPlaceBet({ event, index }: EventDetailNotification) {
        const eventWithBetConfig = event as MarbleEventWithBetConfig;
        const rawPlaceBetTime = index === 0
            ? eventWithBetConfig.scheduleStartTs
            : eventWithBetConfig.eventDetails[index].oddsAvailableTs;

        const firstBlockPlaceBetDelay = index === 0
            ? eventWithBetConfig.config?.bet?.startRoundWaitingMs ?? 0
            : 0;

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
            new Date(new Date(rawPlaceBetTime).getTime() + delayPlaceBet + firstBlockPlaceBetDelay);

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
        });
    }

    private scheduleLockBet({ event, index }: EventDetailNotification<MarbleEvent>) {
        const timeToLockBet = this.getTimeToLockBet({ event, index });

        this.scheduler.schedule(timeToLockBet, this.publishBetChoiceLocked.bind(this), {
            overrideNow: event.now
        });
    }

    private publishBetChoiceLocked() {
        this._betStatus = false;
        this.gameStatusPublisher.publishEndPlacingBetStatus();
    }

    private handleBetChoiceReady({ event, index }: EventDetailNotification<MarbleEvent>) {
        console.log("bet choice ready index", index);
        this._previousOdds = this._marginProcessedDynamicOdds;
        this._betStatus = true;
        this._currentOddIndex = index;

        const { odds, points, groups, markets } = this.getBetDataFromEventDetail({ event, index });

        const marginConfig = this.gameData.gameConfigs.margin as MarginConfigs ?? [];
        const processedOdds = trueOddsToOddsWithMarginConfig(odds ?? {}, marginConfig);

        const { odds: filteredOdds, points: filteredPoints, groups: filteredGroups } = 
            this.filterDisabledMarkets({ 
                markets, 
                odds: processedOdds, 
                points, 
                groups });

        this._marginProcessedDynamicOdds = filteredOdds;
        this._betChoicePoints = filteredPoints;
        this._betGroups = this.formatBetGroup(filteredGroups);

        this.hedgeBetService.resetHedgeBetRestriction();
        this.hedgeBetService.updateHedgeBetGroups(this.getHedgeBetGroups({ event, index }));
        this.publishBetChoiceReady();
    }
    
    private publishBetChoiceReady() {
        this.gameStatusPublisher.publishStartPlacingBetStatus();
        console.log("index", this.currentIndex);
        console.log("payload", this.payload);
        this.gameStatusPublisher.publishToAllUsers(this.payload);
    }

    private formatBetGroup(unformattedGroups: Record<string, string>): Record<string, string[]> {
        return Object.entries(unformattedGroups).reduce((acc, [choice, group]) => {
            acc[group] = [...(acc[group] ?? []), choice];
            return acc;
        }, {} as Record<string, string[]>);
    }

    private getBetDataFromEventDetail({ event, index }: EventDetailNotification<MarbleEvent>) {
        const eventDetail = event.eventDetails[index];
        if (!eventDetail) {
            return {
                points: {},
                odds: {},
                groups: {},
                markets: {},
            };
        }

        const points: Record<string, number> = {};
        let odds: Record<string, number> = {};
        const groups: Record<string, string> = {};
        const markets: Record<string, string[]> = {};
        for (const market of eventDetail.markets) {
            for (const selection of market.selections) {
                points[selection.betChoice] = selection.point ?? 0;
                odds[selection.betChoice] = selection.price ?? 0;
                groups[selection.betChoice] = selection.group ?? "side";
                markets[market.marketNameKey] = [...(markets[market.marketNameKey] ?? []), selection.betChoice];
            }
        }

        return { points, odds, groups, markets };
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

    private filterDisabledMarkets({
        markets,
        odds,
        points,
        groups,
    }: {
        markets: Record<string, string[]>;
        odds: Record<string, number>;
        points: Record<string, number>;
        groups: Record<string, string>;
    }) {
        const disabledBetChoices = this.getDisabledBetChoices(markets, odds);


        return Object.entries(odds).reduce((acc, [choice, _]) => {
            if (!disabledBetChoices[choice]) {
               acc.odds[choice] = odds[choice];
               acc.points[choice] = points[choice];
               acc.groups[choice] = groups[choice];
            }
            return acc;
        }, {
            points: {} as Record<string, number>,
            groups: {} as Record<string, string>,
            odds: {} as Record<string, number>,
        });
    }

    private getDisabledBetChoices(markets: Record<string, string[]>, odds: Record<string, number>) {
        const disabledOdds: Record<string, boolean> = {};
        console.log("init odds ", odds);
        Object.entries(markets).forEach(([market, choices]) => {
            if (choices.some((choice) => odds[choice] <= 1)) {
                console.log(`market ${market} has disabled choices ${choices.join(", ")}`);
                choices.forEach((choice) => {
                    disabledOdds[choice] = true;
                });
            }
        });
        return disabledOdds;
    }
}