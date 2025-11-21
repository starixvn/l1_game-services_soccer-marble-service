import { Table } from "sc-game-base";
import GameData from "../game-data";
import GameDefinition from "../game-definition";
import AppConfigs from "../app-configs";
import GameStatusPublisher from "../publishers/game-status-publisher";
import RunningRoundInfoPublisher from "../publishers/running-round-info-publisher";
import { getOrDefault, post } from "sc-game-base/src/core/game-management-api";
import { CurrentEventService } from "../features/current-event/current-event-service";
import { BetStatusService } from "../features/bet-status/bet-status-service";
import { CatchAllEventListener, EventNotification, Notification, OddsFeedEventName, OddsFeedEventSource, EventListener } from "odds-feed-client";
import { MarbleEvent } from "../features/shared-types";


export default class GameCron extends Table.Crons.TableGameCron {
    declare gameData: GameData;
    declare definition: GameDefinition;
    declare appConfigs: typeof AppConfigs;
    declare gameStatusPublisher: GameStatusPublisher;
    declare runningRoundInfoPublisher: RunningRoundInfoPublisher;
    
    oddsFeedEventSource: OddsFeedEventSource<MarbleEvent>;
    currentEventService: CurrentEventService;
    betStatusService: BetStatusService;
    catchAllListener: CatchAllEventListener<MarbleEvent>;
    eventStartListener: EventListener<MarbleEvent>;

    differenceBetweenServerTime = 0;
    currentEventEndTime: Date = new Date();

    count = 0;

    constructor(container: any) {
        super(container);
        this.currentEventService = container.currentEventService;
        this.betStatusService = container.betStatusService;
        this.oddsFeedEventSource = container.oddsFeedEventSource;
        this.catchAllListener = this.handleOddsFeedWilcard.bind(this);
        this.eventStartListener = this.handleEventStart.bind(this);
    }

    handleOddsFeedWilcard(_: OddsFeedEventName, notification: Notification<MarbleEvent>) : void {
        const event = (notification as EventNotification<MarbleEvent>).event;
        if (event) {
            const serviceNow = new Date().getTime();
            const serverNow = event.now ? new Date(event.now).getTime() : serviceNow;
            this.differenceBetweenServerTime = (serverNow - serviceNow) / 1000;
        }
    }

    handleEventStart({event}: EventNotification<MarbleEvent>) : void {
        this.currentEventEndTime = new Date(event.scheduleEndTs);
    }

    public override async start() {
        this.oddsFeedEventSource.on(this.catchAllListener);
        this.oddsFeedEventSource.eventOn(OddsFeedEventName.EventStart, this.eventStartListener);
        await this.updateExchangeRates();
        await this.unsettledRoundConsumer.proceed();
        this.gameData.proceedEvent = true;
        this.startCron();
    }

    async proceed() {
        // respect remaining time since bot bet depends on it for bet calculation
        this.gameData.remainingTime = Math.floor((this.currentEventEndTime.getTime() - new Date().getTime()) / 1000 - this.differenceBetweenServerTime);
        
        if (this.gameData.proceedEvent) {
            this.gameData.proceedEvent = false;
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

        this.gameData.disabled = configuredlyDisabled || this.gameData.delayStartTime > 0 || this.oddFeedNotAvailable();

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

            this.gameData.remainingTime = durations.wholeRound;
            this.gameStatusPublisher.publishDisableGameStatus();
        } else if (previouslyDisabled) {
            await this.enableGame();
        } else {
            this.gameStatusPublisher.publishStartGame();
            this.resetForNewRound();
            this.bot?.reset();
        }
    }

    override resetForNewRound() {
        super.resetForNewRound();
        this.gameData.playerBetCount = {};
    }


    private oddFeedNotAvailable() {
        const currentEventId = this.gameData.roundId;

        if (!currentEventId) {
            return true;
        }

        const currentEvent = this.currentEventService.eventByEventId[currentEventId];
        if (!currentEvent) {
            return true;
        }

        const timeNow = Date.now();
        const currEventEndTime = new Date(currentEvent?.eventDetails[currentEvent.eventDetails.length - 1].resultsAvailableTs).getTime();
        return timeNow > currEventEndTime;
    }

    private isBetTime() {
        const roundId = this.gameData.roundId;
        if (roundId === undefined || roundId === null) {
            return false;
        }

        return this.betStatusService.allowBets;
    }
}