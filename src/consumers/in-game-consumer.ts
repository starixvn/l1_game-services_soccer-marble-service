import { TableInGameConsumer } from "sc-game-base/src/table/event-consumers";
import GameData from "../game-data";
import { getUserBetPercentage } from "../helpers/bet-percentage";
import GameDefinition from "../game-definition";
import {
} from "../helpers/game-timing";

export default class InGameConsumer extends TableInGameConsumer {
    declare gameData: GameData;
    declare definition: GameDefinition;

    constructor(
        definition: GameDefinition,
        gameData: GameData,
        roundQuery: any,
        publisher: any,
        getBalance: any,
        gameManagementApiClientFactory: any
    ) {
        super(definition, gameData, roundQuery, publisher, getBalance, gameManagementApiClientFactory);
    }

    override async consume(realPlayer: any): Promise<void> {
        await super.consume(realPlayer);
        this.publishOddsToPlayer(realPlayer.UID);
        this.publishBetChoicePointsToPlayer(realPlayer.UID);
        this.publishMatchToPlayer(realPlayer.UID);
    }

    override async buildPayload(realPlayer: any) {
        const payload = await super.buildPayload(realPlayer);
        return {
            ...payload,
            userBetPercentage: getUserBetPercentage(this.gameData.playerBetCount),
            videoResult: this.gameData.videoResult,
        };
    }

    publishOddsToPlayer(UID: string): void {
        this.publisher.publishToUser(UID, { odds: this.gameData.dynamicOdds });
    }

    publishBetChoicePointsToPlayer(UID: string): void {
        this.publisher.publishToUser(UID, { points: this.gameData.betChoicePoints });
    }

    publishMatchToPlayer(UID: string): void {
        this.publisher.publishToUser(UID, { match: this.gameData.currentMatch });
    }
}
