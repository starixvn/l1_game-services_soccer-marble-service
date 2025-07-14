import { asClass, asValue, AwilixContainer } from "awilix";
import { Table } from "sc-game-base";
import {
    InGameConsumer,
    TournamentConsumer,
    UserDisconnectConsumer,
    RoundResultConsumer,
    UnsettledRoundConsumer,
    SettleGameRoundConsumer,
} from "./consumers";

import { Bot, GameCron, ProcessBetQueue } from "./crons";
import { betLogs, bets, results, rounds, tmpBets, tournaments } from "./models";
import { RunningRoundInfoPublisher } from "./publishers";
import { HistoryQuery } from "./query-apis";
import PlaceBetConsumer from "./consumers/place-bet-consumer";
import GameStatusPublisher from "./publishers/game-status-publisher";
import CacheConsumer from "./consumers/cache-consumer";

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
            tournamentRepository: asValue(tournaments),
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
            tournamentConsumer: asClass(TournamentConsumer).singleton().proxy(),
            roundResultConsumer: asClass(RoundResultConsumer).singleton().proxy(),
            unsettledRoundConsumer: asClass(UnsettledRoundConsumer).singleton().proxy(),
            settleGameRoundConsumer: asClass(SettleGameRoundConsumer).singleton().proxy(),
            placeBetConsumer: asClass(PlaceBetConsumer).singleton(),
            cacheConsumer: asClass(CacheConsumer).singleton().proxy(),
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
