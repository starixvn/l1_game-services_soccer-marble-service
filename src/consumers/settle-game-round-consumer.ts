import { Table } from "sc-game-base";
import GameData from "../game-data";
import type TournamentConsumer from "./tournament-consumer";
import { SettlementResultType } from "../models/rounds";
import { OddsType } from "../match-configs";

export default class SettleGameRoundConsumer extends Table.EventConsumers.TableSettleGameRoundConsumer {
    declare gameData: GameData;
    tournamentConsumer: TournamentConsumer;

    constructor(container: any) {
        super(container);

        this.tournamentConsumer = container.tournamentConsumer;
    }

    override async settleRound() {
        await super.settleRound();
        await this.updateTournament();
    }

    async updateTournament() {
        const settlementResult = this.definition.settle(this.gameData.result);
        const homeWins = settlementResult.draw ? this.gameData.result.homeWinsOnDraw : settlementResult.home;

        await this.tournamentConsumer.updateMatchResult(homeWins);
    }

    override calculateBetResult(settlementResult: SettlementResultType, bet: any, odds: OddsType) {
        const betResult = Object.entries(settlementResult).reduce(
            (result, [choice, win]) => {
                const betAmount = bet[choice] ?? 0;
                const originalOdds = (odds as any)[choice] || 1;

                const effectiveOdds = bet.freeBet ? originalOdds - 1 : originalOdds;
                const winAmount = win ? betAmount * effectiveOdds : 0;

                result.totalBetAmount += betAmount;
                result.totalWin += winAmount;
                (result.winningByChoices as any)[choice] = winAmount;

                if (winAmount > 0) {
                    result.netWin += winAmount - betAmount;
                } else {
                    result.totalLost += betAmount;
                }

                return result;
            },
            {
                totalBetAmount: 0,
                totalWin: 0,
                netWin: 0,
                totalLost: 0,
                winningByChoices: {},
            },
        );

        betResult.totalWin = parseFloat(betResult.totalWin.toFixed(2));
        betResult.netWin = parseFloat(betResult.netWin.toFixed(2));

        return betResult;
    }
}
