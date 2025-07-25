import { asClass, asValue, AwilixContainer } from "awilix";
import { Table } from "sc-game-base";
import {
    InGameConsumer,
    UserDisconnectConsumer,
    RoundResultConsumer,
    UnsettledRoundConsumer,
    SettleGameRoundConsumer,
} from "./consumers";

import { Bot, GameCron, ProcessBetQueue } from "./crons";
import { betLogs, bets, results, rounds, tmpBets } from "./models";
import { RunningRoundInfoPublisher } from "./publishers";
import { HistoryQuery } from "./query-apis";
import PlaceBetConsumer from "./consumers/place-bet-consumer";
import GameStatusPublisher from "./publishers/game-status-publisher";
import CacheConsumer from "./consumers/cache-consumer";
import { EventProcessConsumer } from "./consumers/event-process-consumer";
import { OddFeedConsumer } from "./consumers/odd-feed-consumer";
import { SchedulerConsumer } from "./consumers/scheduler-consumer";
import RoundIdConsumer from "./consumers/round-id-consumer";
import { UserSignInConsumer } from "./consumers/user-sign-in-cosumer";

export default class ContainerRegistry extends Table.TableContainerRegistry {
    register(appConfigs: any, definition: any, gameData: any): AwilixContainer<any> {
        super.register(appConfigs, definition, gameData);

        return this.container;
    }

    registerModels() {
        super.registerModels();

        this.container.register({
            roundsRepository: asValue(rounds),
            betsRepository: asValue(bets),
            tempBetsRepository: asValue(tmpBets),
            betLogsRepository: asValue(betLogs),
            resultsRepository: asValue(results),
        });
    }

    registerCrons() {
        super.registerCrons();

        this.container.register({
            bot: asClass(Bot).singleton(),
            gameCron: asClass(GameCron).singleton().proxy(),
            processBetQueue: asClass(ProcessBetQueue).singleton().proxy(),
        });
    }

    registerConsumers() {
        super.registerConsumers();

        this.container.register({
            userDisconnectConsumer: asClass(UserDisconnectConsumer).singleton(),
            inGameConsumer: asClass(InGameConsumer).singleton(),
            roundResultConsumer: asClass(RoundResultConsumer).singleton().proxy(),
            unsettledRoundConsumer: asClass(UnsettledRoundConsumer).singleton().proxy(),
            settleGameRoundConsumer: asClass(SettleGameRoundConsumer).singleton().proxy(),
            placeBetConsumer: asClass(PlaceBetConsumer).singleton(),
            cacheConsumer: asClass(CacheConsumer).singleton().proxy(),
            eventProcessConsumer: asClass(EventProcessConsumer).singleton().proxy(),
            oddFeedConsumer: asClass(OddFeedConsumer).singleton().proxy(),
            schedulerConsumer: asClass(SchedulerConsumer).singleton().proxy(),
            roundIdConsumer: asClass(RoundIdConsumer).singleton(),
            userSignInConsumer: asClass(UserSignInConsumer).singleton(),
        });
    }

    registerPublishers() {
        super.registerPublishers();

        this.container.register({
            runningRoundInfoPublisher: asClass(RunningRoundInfoPublisher).singleton(),
            gameStatusPublisher: asClass(GameStatusPublisher).singleton(),
        });
    }

    registerApis() {
        super.registerApis();

        this.container.register({
            historyQuery: asClass(HistoryQuery).singleton(),
        });
    }
}
