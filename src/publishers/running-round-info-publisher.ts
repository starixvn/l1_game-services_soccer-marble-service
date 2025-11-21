import { RunningRoundInfoPublisher as RunningRoundInfoPublisherBase } from "sc-game-base/src/core/event-publishers";
import GameData from "../game-data";
import { getUserBetPercentage } from "../helpers/bet-percentage";
import { BetStatusService } from "../features/bet-status/bet-status-service";

export default class RunningRoundInfoPublisher extends RunningRoundInfoPublisherBase {
    declare gameData: GameData;
    betStatusService: BetStatusService;

    constructor(gameName: string,gameData: GameData, betStatusService: BetStatusService) {
        super(gameName, gameData);
        this.betStatusService = betStatusService;
    }

    publish() {
        super.publish();
        this.publishBetPercentage();
    }

    publishBetPercentage() {
        const { playerBetCount } = this.gameData;
        const betChoices = Object.keys(this.betStatusService.odds);

        const userBetPercentage = getUserBetPercentage(playerBetCount, betChoices);

        if (Object.values(userBetPercentage).some((percentage) => percentage > 0)) {
            this.publishToAllUsers({ userBetPercentage });
        }
    }
}
