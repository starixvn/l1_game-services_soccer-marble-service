import { UnsettledRoundConsumer as UnsettledRoundConsumerBase } from "sc-game-base/src/core/event-consumers";
import GameData from "../game-data";
import SettleGameRoundConsumer from "./settle-game-round-consumer";
import { extractGameId } from "../helpers/eventid";

export default class UnsettledRoundConsumer extends UnsettledRoundConsumerBase {
    declare settleGameRoundConsumer: SettleGameRoundConsumer;
    declare gameData: GameData;

    constructor(container: any) {
        super(container);
    }

    async proceed(): Promise<void> {
        const gameId = extractGameId(this.gameData.roundId).toString();
        if (!gameId) {
            return;
        }
        await this.settleUnsettledRounds(gameId);
    }

    private async settleUnsettledRounds(gameId: string): Promise<any> {
        const unsettledBets = await this.getUnsettledBets();
        const unsettledRounds = [...new Set(unsettledBets.map((bet: any) => bet.roundId))];
        return Promise.all(unsettledRounds.map(async (roundId) => {
            return Promise.resolve();
        }));
    }

    override async getUnsettledBets(): Promise<any> {
        const playerBets = await this.betsRepository.find({ paid: false }).lean().exec();
        const botBets = this.tempBetsRepository
            ? await this.tempBetsRepository.find({ paid: false }).lean().exec()
            : [];

        return playerBets.concat(botBets);
    }
}
