import { UnsettledRoundConsumer as UnsettledRoundConsumerBase } from "sc-game-base/src/core/event-consumers";
import GameData from "../game-data";
import { decrypt } from "sc-game-base/src/core/helpers/crypto-helper";
export default class UnsettledRoundConsumer extends UnsettledRoundConsumerBase {
    declare gameData: GameData;

    override async generateResult(_unsettledBets: any) {
        const { lastResultRecord } = this.gameData;

        if (lastResultRecord && lastResultRecord.roundId === this.gameData.roundId) {
            this.gameData.result = JSON.parse(decrypt(lastResultRecord.encryptedResult));
        }
    }
}
