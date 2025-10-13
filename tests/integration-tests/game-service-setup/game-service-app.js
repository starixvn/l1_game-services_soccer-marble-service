import GameData from "../../../build/game-data";
import mongoose from "mongoose";
import GameDefinition from "../../../build/game-definition";
import { Core } from "sc-game-base";
import { initAPIStub, stubUserService, subGameManagementService, initDB } from "sc-game-service-integration-utils";
import ContainerRegistry from "../../../build/container-registry";
import { resultHelper } from "../../../build/helpers";
import gameSettings from "../_stubs/game-settings";
import appConfigs from "../../../build/app-configs.IGT";

export const run = async () => {
    await initDB(appConfigs.database);
    initAPIStub(appConfigs.apiSettings.apiUrl);

    const definition = new GameDefinition(
        gameSettings,
        resultHelper.generateResult,
        resultHelper.getSettlementResult,
        resultHelper.generateRawResultForHash,
    );

    const gameData = new GameData(gameSettings.durations.wholeRound);
    await stubUserService(appConfigs);
    await subGameManagementService(appConfigs, definition);
    const containerRegistry = new ContainerRegistry();
    const container = containerRegistry.register(appConfigs, definition, gameData);
    containerRegistry.init();
    const app = new Core.BaseGameApp(gameSettings.name, appConfigs);
    await mongoose.disconnect();
    await app.run();
    await app.startGame(container);
};

run();
