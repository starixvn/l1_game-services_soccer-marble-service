import { Table } from "sc-game-base";
import GameData from "../game-data";
import GameDefinition from "../game-definition";
import AppConfigs from "../app-configs";
import GameStatusPublisher from "../publishers/game-status-publisher";
import RunningRoundInfoPublisher from "../publishers/running-round-info-publisher";
import { getOrDefault, post } from "sc-game-base/src/core/game-management-api";
import { CurrentEventService } from "../features/current-event/current-event-service";
import { BetStatusService } from "../features/bet-status/bet-status-service";
import { OddsFeedEventName, OddsFeedEventSource, OddsFeedCron, Scheduler } from "odds-feed-client";
import { MarbleEvent } from "../features/shared-types";
import Bot from "./bot";
import { ServerTimeDiffService } from "../features/server-time-diff/server-time-diff-service";
import { isEventEnded } from "../helpers/timing-helper";
import { DelayHandlingService } from "../features/delay/delay-handling-service";
import { UpcomingEventService } from "../features/upcoming-event/upcoming-event-service";


export default class GameCron extends Table.Crons.TableGameCron {
    declare gameData: GameData;
    declare definition: GameDefinition;
    declare appConfigs: typeof AppConfigs;
    declare gameStatusPublisher: GameStatusPublisher;
    declare runningRoundInfoPublisher: RunningRoundInfoPublisher;
    declare bot: Bot;

    declare oddsFeedCron: OddsFeedCron;
    oddsFeedEventSource: OddsFeedEventSource<MarbleEvent>;
    currentEventService: CurrentEventService;
    betStatusService: BetStatusService;
    delayHandlingService: DelayHandlingService;

    serverTimeDiffService: ServerTimeDiffService;
    scheduler: Scheduler;
    upcomingEventService: UpcomingEventService;
    currentEventEndTime: Date = new Date();

    count = 0;

    constructor(container: any) {
        super(container);
        this.currentEventService = container.currentEventService;
        this.betStatusService = container.betStatusService;
        this.oddsFeedEventSource = container.oddsFeedEventSource;
        this.oddsFeedCron = container.oddsFeedCron;
        this.serverTimeDiffService = container.serverTimeDiffService;
        this.delayHandlingService = container.delayHandlingService;
        this.scheduler = container.scheduler;
        this.upcomingEventService = container.upcomingEventService;
    }


    public override async start() {
        await this.updateExchangeRates();
        await this.unsettledRoundConsumer.proceed();
        this.startCron();
    }

    get timeToEventEnd() {
        return this.delayHandlingService.getDelayedTime({ event: this.upcomingEventService.nextEvent, time: new Date(this.upcomingEventService.nextEvent.scheduleStartTs) }, {
            oddFeedEventType: OddsFeedEventName.EventStart,
        });

    }
    async proceed() {

        this.gameData.remainingTime = 
            Math.floor((this.timeToEventEnd.getTime() - this.serverTimeDiffService.now) / 1000);
        if (this.gameData.remainingTime <= 0 || this.gameData.disabled) {
            await this.checkGameStatus();
        }

        if (this.isBetTime()) {
            await this.bot?.run();
            this.runningRoundInfoPublisher.publish();
        }
    }

    override async checkGameStatus() {
        const { configName } = this.definition;

        const newGameConfigs = await getOrDefault(
            this.gameManagementApiClient.gameConfigs.getGameConfigs(configName),
            this.gameData.gameConfigs
        );

        if (!newGameConfigs) {
            this.logService.logError(`Cannot get game configs of ${this.definition.name}.`);
        }

        const previouslyDisabled = this.gameData.disabled;
        const configuredlyDisabled = !newGameConfigs?.enabled;

        if (previouslyDisabled) {
            this.gameData.delayStartTime = this.getDelayStartTime(configuredlyDisabled, newGameConfigs);
        }

        this.assignNewGameConfigs(newGameConfigs);

        const shouldDisableGame = configuredlyDisabled || this.gameData.delayStartTime > 0 || !this.oddFeedAvailable();

        console.log("shouldDisableGame", shouldDisableGame);

        this.gameData.disabled = shouldDisableGame;

        await this.getSettingForNewRound();


        if (this.gameData.gameConfigs.exchangeReload) {
            await this.updateExchangeRates();

            await post(this.gameManagementApiClient.gameConfigs.updateExchangeReload(false, configName));
        }

        this.handleGameStatus(previouslyDisabled);
    }
    
    async handleGameStatus(previouslyDisabled: boolean) {
        const { configName } = this.definition;

        if (this.gameData.disabled) {
            const { durations } = this.definition;

            const notification = await getOrDefault(this.gameManagementApiClient.notification.getUmMessages(configName), {});

            this.gameData.umMessages = notification;
            this.oddsFeedCron.stop();
            this.gameData.remainingTime = durations.wholeRound;
            this.gameStatusPublisher.publishDisableGameStatus();
        } else if (previouslyDisabled) {
            await this.oddsFeedCron.start();
            await this.enableGame();
        } else {
            this.resetForNewRound();
            this.bot?.reset();
        }
    }

    override resetForNewRound() {
        super.resetForNewRound();
        this.gameData.playerBetCount = {};
    }


    private oddFeedAvailable() {
        const currentEvent = this.currentEventService.getCurrentEvent();
        if (!currentEvent) {
            return false;
        }

        return !isEventEnded({
            event: currentEvent,
            now: this.serverTimeDiffService.now,
        })
    }

    private isBetTime() {
        const roundId = this.gameData.roundId;
        if (roundId === undefined || roundId === null) {
            return false;
        }

        return this.betStatusService.allowBets;
    }
}