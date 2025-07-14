import GameData from "../../../build/game-data";
import GameDefinition from "../../../build/game-definition";
import { Core } from "sc-game-base";
import { initAPIStub, stubUserService, subGameManagementService } from "sc-game-service-integration-utils";
import ContainerRegistry from "../../../build/container-registry";
import { resultHelper } from "../../../build/helpers";
import gameSettings from "../_stubs/game-settings";
import appConfigs from "../../../build/app-configs.IGT";

export const run = async () => {
    initAPIStub(appConfigs.apiSettings.apiUrl);

    const definition = new GameDefinition(
        gameSettings,
        resultHelper.generateResult,
        resultHelper.getSettlementResult,
        resultHelper.generateRawResultForHash,
    );

    const gameData = new GameData(gameSettings.durations.wholeRound);
    stubUserService(appConfigs);
    subGameManagementService(appConfigs, definition);
    const container = new ContainerRegistry().register(appConfigs, definition, gameData);
    const app = new Core.BaseGameApp(gameSettings.name, appConfigs);
    await app.run();
    await app.startGame(container);
};

run();
