import { Table } from "sc-game-base";
import GameData from "../game-data";
import { Result, SettlementResult } from "../models/rounds";
import { combineFinalResult, getLastSettlementResult } from "../helpers/result-helper";

type SettleArg = {
    roundId: number;
    result: Result;
    settlementResult: SettlementResult;
};

export default class SettleGameRoundConsumer extends Table.EventConsumers.TableSettleGameRoundConsumer {
    declare gameData: GameData;

    async settleSpecificRound({ roundId, result, settlementResult }: SettleArg) {
        const { exchangeRates } = this.gameData;

        const newRound = await this.roundsRepository.create({
            id: roundId,
            result,
            settlementResult,
            time: new Date(),
            exchangeRateId: exchangeRates.exId,
        });

        if (newRound) {
            this.roundResultPublisher.publishRoundResult({
                result: combineFinalResult(result),
                settlementResult: getLastSettlementResult(settlementResult),
                roundId,
            });

            const finish = {
                settlementResult,
                result,
                roundId: newRound.id,
                time: newRound.time,
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
            }
        );
        betResult.totalWin = parseFloat(betResult.totalWin.toFixed(2));
        betResult.netWin = parseFloat(betResult.netWin.toFixed(2));
        return betResult;
    }

    override async settleBets({ settlementResult, roundId, time }: { settlementResult: any; roundId: number; time: Date }): Promise<void> {
        const bets = await this.queryBets(roundId);

        if (bets && bets.length) {
            await Promise.all(
                bets.map(async (bet: any) => {
                    const odds = bet.odds ?? {};

                    const betResult = this.calculateBetResult(settlementResult, bet, odds);

                    bet.betWin = betResult.totalWin;
                    bet.paid = true;

                    await bet.save();
                    const metaData = this.createMetadata({ bet, settlementResult });
                    await this.callEndGame(bet, roundId, time, betResult, metaData);

                    this.captureBetResult(bet.uid, betResult, bet.rate);
                    await this.userBetResultPublisher.publish(bet.uid, betResult);
                })
            );
        }
    }
}
