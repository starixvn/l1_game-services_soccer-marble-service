import { Core } from "sc-game-base";
import { IRound } from "../models/rounds";
import { combineFinalResult, getLastSettlementResult } from "../helpers/result-helper";

export default class RoundQuery extends Core.QueryApis.RoundQuery {
    async getList(limit: number, projections: any) {
        const rounds = await this.roundsRepository
            .find({}, projections, { sort: { _id: -1 }, limit: limit })
            .lean()
            .exec();

        return rounds.map((round: IRound) => {
            const result = round.result;
            const settlementResult = round.settlementResult ?? this.convertSettlementResult(result);

            return {
                roundId: round.id,
                result: combineFinalResult(result),
                settlementResult: getLastSettlementResult(settlementResult),
            };
        });
    }
}
