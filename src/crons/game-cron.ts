import { Table } from "sc-game-base";
import GameData from "../game-data";
import GameDefinition from "../game-definition";
import AppConfigs from "../app-configs";
import { TournamentConsumer } from "../consumers";
import GameStatusPublisher from "../publishers/game-status-publisher";
import RunningRoundInfoPublisher from "../publishers/running-round-info-publisher";
import CacheConsumer from "../consumers/cache-consumer";
import cron from "cron";
import { EventProcessConsumer } from "../consumers/event-process-consumer";

const CRON = "*/1 * * * *";

export default class GameCron extends Table.Crons.TableGameCron {
    declare gameData: GameData;
    declare definition: GameDefinition;
    declare appConfigs: typeof AppConfigs;
    declare gameStatusPublisher: GameStatusPublisher;
    declare runningRoundInfoPublisher: RunningRoundInfoPublisher;
    eventProcessConsumer: EventProcessConsumer;

    tournamentConsumer: TournamentConsumer;
    cacheConsumer: CacheConsumer;

    constructor(container: any) {
        super(container);

        this.gameData.liveStreamServer = this.appConfigs.liveStreamServer;
        this.tournamentConsumer = container.tournamentConsumer;
        this.cacheConsumer = container.cacheConsumer;
        this.eventProcessConsumer = container.eventProcessConsumer;
    }

    public override async start() {
        this.startCron();
    }

    public override startCron() {
        const job = new cron.CronJob(
            CRON,
            () => this.proceed().catch(this.logService.logError),
            () => {
                this.logService.logError(
                    `${this.definition.name} unexpectedly stopped at round #${this.gameData.roundId} because some other tasks halt it.`
                );
                job.start();
            }
        );

        job.start();
    }

    async proceed() {
        await this.eventProcessConsumer.proceed();
    }
}