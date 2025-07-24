import { Table } from "sc-game-base";
import GameData from "../game-data";
import GameDefinition from "../game-definition";
import AppConfigs from "../app-configs";
import GameStatusPublisher from "../publishers/game-status-publisher";
import RunningRoundInfoPublisher from "../publishers/running-round-info-publisher";
import CacheConsumer from "../consumers/cache-consumer";
import { EventProcessConsumer } from "../consumers/event-process-consumer";
import RoundIdConsumer from "../consumers/round-id-consumer";
import { isWithinBettingTimeInCurrentEventDetail } from "../helpers/game-timing";

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
        await this.getSettingForNewRound();
        await this.updateExchangeRates();
        void this.unsettledRoundConsumer.proceed();
        this.startCron();
    }

    async proceed() {
        if (this.eventPullCounter === COUNTER_INTERVAL) {
            await this.checkGameStatus()
            await this.eventProcessConsumer.proceed();
            this.eventPullCounter = 0;
        }

        this.eventProcessConsumer.updateAndGetRemainingTime();
        if (isWithinBettingTimeInCurrentEventDetail(this.gameData)) {
            this.bot && (await this.bot.run())
        }
        this.eventPullCounter++;
    }
}