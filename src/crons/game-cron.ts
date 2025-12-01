import { Table } from "sc-game-base";
import GameData from "../game-data";
import GameDefinition from "../game-definition";
import AppConfigs from "../app-configs";
import GameStatusPublisher from "../publishers/game-status-publisher";
import RunningRoundInfoPublisher from "../publishers/running-round-info-publisher";
import { getOrDefault, post } from "sc-game-base/src/core/game-management-api";
import { CurrentEventService } from "../features/current-event/current-event-service";
import { BetStatusService } from "../features/bet-status/bet-status-service";
import { EventNotification, OddsFeedEventName, OddsFeedEventSource, EventListener, OddsFeedCron } from "odds-feed-client";
import { MarbleEvent } from "../features/shared-types";
import Bot from "./bot";
import { ServerTimeDiffService } from "../features/server-time-diff/server-time-diff-service";
import { isEventEnded } from "../helpers/timing-helper";


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

    serverTimeDiffService: ServerTimeDiffService;
    eventStartListener: EventListener<MarbleEvent>;

    currentEventEndTime: Date = new Date();

    count = 0;

    constructor(container: any) {
        super(container);
        this.currentEventService = container.currentEventService;
        this.betStatusService = container.betStatusService;
        this.oddsFeedEventSource = container.oddsFeedEventSource;
        this.oddsFeedCron = container.oddsFeedCron;
        this.eventStartListener = this.handleEventStart.bind(this);
        this.serverTimeDiffService = container.serverTimeDiffService;
    }

    handleEventStart({event}: EventNotification<MarbleEvent>) : void {
        this.currentEventEndTime = new Date(event.scheduleEndTs);
    }

    public override async start() {
        this.oddsFeedEventSource.eventOn(OddsFeedEventName.EventStart, this.eventStartListener);
        await this.updateExchangeRates();
        await this.unsettledRoundConsumer.proceed();
        this.gameData.proceedEvent = true;
        this.startCron();
    }

    async proceed() {
        const now = this.serverTimeDiffService.now;
        // respect remaining time since bot bet depends on it for bet calculation
        this.gameData.remainingTime = 
            Math.floor((this.currentEventEndTime.getTime() - now) / 1000);
        
        if (this.gameData.remainingTime <= 0) {
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
        console.log("configuredlyDisabled", configuredlyDisabled);
        console.log("odds feed available", this.oddFeedAvailable());
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

        const currentEventId = this.gameData.roundId;

        if (!currentEventId) {
            return false;
        }

        const currentEvent = this.currentEventService.eventByEventId[currentEventId];
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