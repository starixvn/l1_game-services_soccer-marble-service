import { RunningRoundInfoPublisher as RunningRoundInfoPublisherBase } from "sc-game-base/src/core/event-publishers";

import GameData from "../game-data";
import { getUserBetPercentage } from "../helpers/bet-percentage";

export default class RunningRoundInfoPublisher extends RunningRoundInfoPublisherBase {
    declare gameData: GameData;

    publish() {
        super.publish();

        this.publishBetPercentage();
    }

    publishBetPercentage() {
        const { playerBetCount } = this.gameData;

        const userBetPercentage = getUserBetPercentage(playerBetCount);

        if (Object.values(userBetPercentage).some((percentage) => percentage > 0)) {
            this.publishToAllUsers({ userBetPercentage });
        }
    }
}
