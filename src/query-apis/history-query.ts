import { Core } from "sc-game-base";

export default class HistoryQuery extends Core.QueryApis.HistoryQuery {
    declare getBetProjection: () => any;

    async queryHistory(player: any, page: number, pageSize: number) {
        if (page < 1 || !player) {
            return {};
        }

        const filter = { uid: player.UID, paid: true };
        const numberOfSkippedBets = (page - 1) * pageSize;
        const total = await this.betsRepository.countDocuments(filter).exec();

        const betProjection = this.getBetProjection();

        const bets = await this.betsRepository
            .find(filter, betProjection, { sort: { _id: -1 }, skip: numberOfSkippedBets, limit: pageSize })
            .lean()
            .exec();
        let betLogs = [];

        if (bets && bets.length > 0) {
            betLogs = await Promise.all(
                bets.map(async (bet: any) => {
                    const round = await this.roundQuery.getOne(bet.roundId, { _id: false });
                    const betLogDetails = this.betLogsRepository ? await this.getBetLogDetails(player, bet.roundId) : [];

                    return {
                        ...this.convertBet(bet),
                        phien: bet.roundId,
                        result: {
                            ...round.result,
                            teamName: round.match,
                        },
                        settlementResult: round.settlementResult,
                        betLogDetails: this.convertBetLogs(betLogDetails),
                    };
                }),
            );
        }

        return { history: { betLogs, page, pageSize, total } };
    }
}
