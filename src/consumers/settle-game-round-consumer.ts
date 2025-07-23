import { Table } from "sc-game-base";
import GameData from "../game-data";
import { SettlementResultType } from "../models/rounds";
import { EventResponse } from "./odd-feed-consumer";

export default class SettleGameRoundConsumer extends Table.EventConsumers.TableSettleGameRoundConsumer {
    declare gameData: GameData;

    override async settleRound() {
        await super.settleRound();
    }

    async settleSpecificRound(roundId: number) {
        const gameId = this.gameData.gameId;
        if (!gameId) return;
        const round = this.gameData.oddFeedGames[gameId]?.rounds[roundId];
        const result = this.getResultFromRound(round);
        
        const settlementResult = this.definition.settle(round);
        const { exchangeRates } = this.gameData;


        const newRound = await 
            this.roundsRepository.create({
                id: roundId,
                result,
                settlementResult,
                time: new Date(),
                exchangeRateId: exchangeRates.exId
            });
        
        if (newRound) {
            this.roundResultPublisher.publishRoundResult({
                result,
                settlementResult,
                roundId
            });
            
            const finish = {
                settlementResult,
                result,
                roundId: newRound.id,
                time: newRound.time
            };

            await this.settleBets(finish);
            this.roundResultPublisher.publishWinners(roundId, this.gameData.winningPlayers);
            delete this.gameData.oddFeedGames[gameId].rounds[roundId];
        }
    }

    getResultFromRound(round: EventResponse) {
        let home = 0
        let away = 0
        round.eventDetails.forEach((eventDetail, index) => {
            const currentHome = eventDetail.result.split(":")[0]
            const currentAway = eventDetail.result.split(":")[1]
            home += parseInt(currentHome)
            away += parseInt(currentAway)
        })
        return { home, away }
    }

    override calculateBetResult(settlementResult: SettlementResultType, bet: any, odds: Record<string, number>) {

        const betData = bet._doc ?? bet;
        
        const betResult = Object.entries(settlementResult).reduce(
            (result, [choice, win]) => {
                const betAmount = betData[choice] ?? 0;
                const originalOdds = odds[choice] ?? 1;
                const effectiveOdds = betData.freeBet ? originalOdds - 1 : originalOdds;
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
