import { Table } from "sc-game-base";
import GameData from "../game-data";
import GameDefinition from "../game-definition";
import AppConfigs from "../app-configs";
import GameStatusPublisher from "../publishers/game-status-publisher";
import RunningRoundInfoPublisher from "../publishers/running-round-info-publisher";
import CacheConsumer from "../consumers/cache-consumer";
import { EventProcessConsumer } from "../consumers/event-process-consumer";

const COUNTER_INTERVAL = 60;

export default class GameCron extends Table.Crons.TableGameCron {
    declare gameData: GameData;
    declare definition: GameDefinition;
    declare appConfigs: typeof AppConfigs;
    declare gameStatusPublisher: GameStatusPublisher;
    declare runningRoundInfoPublisher: RunningRoundInfoPublisher;
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
        this.startCron();
    }

    async proceed() {
        if (this.eventPullCounter === COUNTER_INTERVAL) {
            await this.checkGameStatus()
            this.gameData.gameId = this.appConfigs.oddFeed.gameId;
            await this.eventProcessConsumer.proceed();
            this.eventPullCounter = 0;
        }
        this.eventProcessConsumer.updateAndGetRemainingTime();
        this.eventPullCounter++;
    }
}