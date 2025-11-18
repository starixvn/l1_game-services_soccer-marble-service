import { Table } from "sc-game-base";
import GameData from "../game-data";
import { Result, SettlementResult } from "../models/rounds";


type SettleArg = {
    roundId: number;
    result: Result;
    settlementResult: SettlementResult;
}


export default class SettleGameRoundConsumer extends Table.EventConsumers.TableSettleGameRoundConsumer {
    declare gameData: GameData;

    async settleSpecificRound({ roundId, result, settlementResult }: SettleArg) {
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
        }
    }

    override calculateBetResult(settlementResult: SettlementResult, bet: any, odds: Record<string, any>) {
        const betData = bet._doc ?? bet;
        const betResult = Object.entries(settlementResult).reduce(
            (result, [index, isWinByChoices]) => {
                Object.entries(isWinByChoices).forEach(([choice, win]) => {
                    const betAmount = betData[`${index}`]?.[choice] ?? 0;
                    const originalOdds = odds[`${index}`]?.[choice]?.price ?? 1;
                    const effectiveOdds = betData.freeBet ? originalOdds - 1 : originalOdds;
                    const winAmount = win ? betAmount * effectiveOdds : 0;
                    result.totalBetAmount += betAmount;
                    result.totalWin += winAmount;
                    if (!(result.winningByChoices as any)[`${index}`]) {
                        (result.winningByChoices as any)[`${index}`] = {};
                    }
                    (result.winningByChoices as any)[`${index}`][choice] = winAmount;
                });

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
