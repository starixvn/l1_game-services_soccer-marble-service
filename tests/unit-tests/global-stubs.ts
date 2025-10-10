import { mock as stub } from "jest-mock-extended";
import mongoose from "mongoose";
import { logger } from "sc-common";
import { Core } from "sc-game-base";
import BaseMetrics from "sc-game-base/src/core/base-metrics";
import { GameStatusPublisher } from "../../src/publishers";
import {
    ProvablyFairConsumer,
    RoundIdConsumer,
    SettleGameRoundConsumer,
    UnsettledRoundConsumer,
} from "sc-game-base/src/core/event-consumers";
import {
    BaseEventPublisher,
    PlaceBetPublisher,
    RoundResultPublisher,
    RunningRoundInfoPublisher,
    UserBetResultPublisher,
} from "sc-game-base/src/core/event-publishers";
import GameManagementApiClientFactory from "sc-game-base/src/core/game-management-api";
import Bot from "../../src/crons/bot";
import { IRound } from "../../src/models/rounds";
import CacheConsumer from "../../src/consumers/cache-consumer";
jest.mock("sc-game-management-client");

const roundsRepository = {
    create: jest.fn(),
    findOneAndUpdate: jest.fn().mockReturnThis(),
    exec: jest.fn(),
} as unknown as mongoose.Model<IRound>;

const betsRepository = {
    create: jest.fn(),
    findOneAndUpdate: jest.fn().mockReturnThis(),
    exec: jest.fn(),
} as unknown as mongoose.Model<any>;

const tempBetsRepository = {
    create: jest.fn(),
    findOneAndUpdate: jest.fn().mockReturnThis(),
    exec: jest.fn(),
} as unknown as mongoose.Model<any>;

const betLogsRepository = {
    create: jest.fn(),
    findOneAndUpdate: jest.fn().mockReturnThis(),
    exec: jest.fn(),
} as unknown as mongoose.Model<any>;

const resultsRepository = {
    create: jest.fn(),
    findOneAndUpdate: jest.fn().mockReturnThis(),
    exec: jest.fn(),
} as unknown as mongoose.Model<any>;

const endGame = jest.fn();
const placeBet = jest.fn();
const gameManagementApiClientFactory = new GameManagementApiClientFactory({});

const roundQuery = stub<Core.QueryApis.RoundQuery>();
const publisher = stub<BaseEventPublisher>();

const bot = stub<Bot>();
const cacheConsumer: CacheConsumer = stub<CacheConsumer>();
const settleGameConsumer: SettleGameRoundConsumer = stub<SettleGameRoundConsumer>();
const gameStatusPublisher: GameStatusPublisher = stub<GameStatusPublisher>();
const runningRoundInfoPublisher: RunningRoundInfoPublisher = stub<RunningRoundInfoPublisher>();
const roundIdConsumer: RoundIdConsumer = stub<RoundIdConsumer>();
const provablyFairConsumer: ProvablyFairConsumer = stub<ProvablyFairConsumer>();
const unsettledRoundConsumer: UnsettledRoundConsumer = stub<UnsettledRoundConsumer>();
const roundResultPublisher: RoundResultPublisher = stub<RoundResultPublisher>();
const userBetResultPublisher: UserBetResultPublisher = stub<UserBetResultPublisher>();
const placeBetPublisher: PlaceBetPublisher = stub<PlaceBetPublisher>();
const baseMetrics: BaseMetrics = stub<BaseMetrics>();

const logService: typeof logger = {
    logError: jest.fn(),
    logInfo: jest.fn(),
    logWarning: jest.fn(),
} as unknown as typeof logger;

export {
    baseMetrics,
    betLogsRepository,
    betsRepository,
    bot,
    cacheConsumer,
    endGame,
    gameManagementApiClientFactory,
    gameStatusPublisher,
    logService,
    placeBet,
    placeBetPublisher,
    provablyFairConsumer,
    publisher,
    resultsRepository,
    roundIdConsumer,
    roundQuery,
    roundResultPublisher,
    roundsRepository,
    runningRoundInfoPublisher,
    settleGameConsumer,
    tempBetsRepository,
    unsettledRoundConsumer,
    userBetResultPublisher,
};
