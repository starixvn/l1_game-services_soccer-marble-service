import { asClass, asValue, AwilixContainer } from "awilix";
import { Table } from "sc-game-base";
import {
    InGameConsumer,
    UserDisconnectConsumer,
    SettleGameRoundConsumer,
} from "./consumers";

import { Bot, GameCron, ProcessBetQueue } from "./crons";
import { betLogs, bets, results, rounds, tmpBets } from "./models";
import { RunningRoundInfoPublisher } from "./publishers";
import { HistoryQuery } from "./query-apis";
import PlaceBetConsumer from "./consumers/place-bet-consumer";
import GameStatusPublisher from "./publishers/game-status-publisher";
import RoundIdConsumer from "./consumers/round-id-consumer";
import { UserSignInConsumer } from "./consumers/user-sign-in-consumer";
import { DiContainer } from "odds-feed-client/container";
import { AwilixDIContainer } from "odds-feed-client/awilix";
import { initFeatures, registerFeatures } from "./features/container-registry";

export default class ContainerRegistry extends Table.TableContainerRegistry {

    private readonly oddFeedDiContainer: DiContainer;
    constructor() {
        super();
        this.oddFeedDiContainer = new AwilixDIContainer(this.container);
    }

    register(appConfigs: any, definition: any, gameData: any): AwilixContainer<any> {
        super.register(appConfigs, definition, gameData);
        registerFeatures(this.oddFeedDiContainer);
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
            settleGameRoundConsumer: asClass(SettleGameRoundConsumer).singleton().proxy(),
            placeBetConsumer: asClass(PlaceBetConsumer).singleton(),
            roundIdConsumer: asClass(RoundIdConsumer).singleton(),
            userSignInConsumer: asClass(UserSignInConsumer).singleton().proxy(),
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

    init() {
        initFeatures(this.oddFeedDiContainer);
    }
}
