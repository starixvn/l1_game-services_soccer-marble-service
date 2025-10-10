import { UnsettledRoundConsumer as UnsettledRoundConsumerBase } from "sc-game-base/src/core/event-consumers";
import GameData from "../game-data";
import SettleGameRoundConsumer from "./settle-game-round-consumer";
import { createEventId } from "../helpers/eventid";

export default class UnsettledRoundConsumer extends UnsettledRoundConsumerBase {
    declare settleGameRoundConsumer: SettleGameRoundConsumer;
    declare gameData: GameData;

    constructor(container: any) {
        super(container);
    }

    async proceed(): Promise<void> {
        if (!this.gameData.gameId) {
            return;
        }
        await this.settleUnsettledRounds(this.gameData.gameId);
    }

    private async settleUnsettledRounds(gameId: number): Promise<any> {
        const unsettledBets = await this.getUnsettledBets();
        const unsettledRounds = [...new Set(unsettledBets.map((bet: any) => bet.roundId))];
        return Promise.all(unsettledRounds.map(async (roundId) => {
            const eventId = createEventId(gameId, Number(roundId));
            // TODO: Replace with appropriate settlement logic
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
