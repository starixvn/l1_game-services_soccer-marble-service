import { Core } from "sc-game-base";
import GameData from "../game-data";

export default class RoundIdConsumer extends Core.BaseEventConsumers.RoundIdConsumer {
    declare gameData: GameData;

    async queryLastRound() {
        const lastRound = await this.roundsRepository
            .findOne({}, "id", { sort: { id: -1 } })
            .lean()
            .exec();
        if (lastRound) {
            this.gameData.lastRoundId = lastRound.id;
        }
    }
}