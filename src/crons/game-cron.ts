import { Table } from "sc-game-base";
import GameData from "../game-data";
import GameDefinition from "../game-definition";
import AppConfigs from "../app-configs";
import GameStatusPublisher from "../publishers/game-status-publisher";
import RunningRoundInfoPublisher from "../publishers/running-round-info-publisher";
import CacheConsumer from "../consumers/cache-consumer";
import { EventProcessConsumer } from "../consumers/event-process-consumer";
import RoundIdConsumer from "../consumers/round-id-consumer";
import { isOddFeedAvailable, isWithinBettingTimeInCurrentEventDetail } from "../helpers/game-timing";
import { getOrDefault, post } from "sc-game-base/src/core/game-management-api";

const COUNTER_INTERVAL = 60;

export default class GameCron extends Table.Crons.TableGameCron {
    declare gameData: GameData;
    declare definition: GameDefinition;
    declare appConfigs: typeof AppConfigs;
    declare gameStatusPublisher: GameStatusPublisher;
    declare runningRoundInfoPublisher: RunningRoundInfoPublisher;
    declare roundIdConsumer: RoundIdConsumer;
    eventPullCounter = COUNTER_INTERVAL;
    eventProcessConsumer: EventProcessConsumer;

    cacheConsumer: CacheConsumer;

    constructor(container: any) {
        super(container);

        this.gameData.liveStreamServer = this.appConfigs.liveStreamServer;
        this.cacheConsumer = container.cacheConsumer;
        this.eventProcessConsumer = container.eventProcessConsumer;
    }

    public override async start() {
        this.eventProcessConsumer.init();
        await this.roundIdConsumer.queryLastRound();
        await this.updateExchangeRates();
        await this.unsettledRoundConsumer.proceed();
        this.gameData.proceedEvent = true;
        this.startCron();
    }

    async proceed() {
        if (this.gameData.proceedEvent) {
            this.gameData.proceedEvent = false;
            await this.checkGameStatus();
            await this.eventProcessConsumer.proceed();
        }
        const remainingTime = this.eventProcessConsumer.updateRemainingTime();
        console.log('remainingTime ', remainingTime);
        if (isWithinBettingTimeInCurrentEventDetail(this.gameData)) {
            this.bot && (await this.bot.run())
        }
        this.eventPullCounter++;
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

    private oddFeedNotAvailable() {
        return !isOddFeedAvailable(this.gameData);
    }
}