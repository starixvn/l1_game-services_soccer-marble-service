import { UnsettledRoundConsumer as UnsettledRoundConsumerBase } from "sc-game-base/src/core/event-consumers";
import GameData from "../game-data";
import SettleGameRoundConsumer from "./settle-game-round-consumer";
import { EventProcessConsumer } from "./event-process-consumer";
import { createEventId } from "../helpers/eventid";

export default class UnsettledRoundConsumer extends UnsettledRoundConsumerBase {
    declare settleGameRoundConsumer: SettleGameRoundConsumer;
    declare gameData: GameData;
    declare eventProcessConsumer: EventProcessConsumer;

    constructor(container: any) {
        super(container);
        this.eventProcessConsumer = container.eventProcessConsumer;
    }

    async proceed(): Promise<void> {
        if (!this.gameData.gameId) {
            return;
        }
        if (this.gameData.lastRoundId) {
            const lastEventId = createEventId(this.gameData.gameId, this.gameData.lastRoundId);
            const lastEvent = await this.eventProcessConsumer.syncEventDetailForcingResultAvailable(lastEventId);
            if (lastEvent) {
                await this.settleGameRoundConsumer.settleSpecificRound(this.gameData.lastRoundId);
            }
        }
    }
}
