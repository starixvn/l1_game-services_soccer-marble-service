import { TableProcessBetQueue } from "sc-game-base/src/table/crons";
import GameData from "../game-data";
import { helpers } from "sc-common";
import GameDefinition from "../game-definition";
import { BetStatusService } from "../features/bet-status/bet-status-service";
import { ResultService } from "../features/result/result-service";

type BetPayload = {
    amount: number;
    betChoice: string;
    roundId: number;
    clientSeed: Date;
    freeBet?: boolean;
    mode?: string;
    index: number;
};

export default class ProcessBetQueue extends TableProcessBetQueue {
    declare gameData: GameData;
    declare definition: GameDefinition;
    betStatusService: BetStatusService;
    resultService: ResultService;

    constructor(container: any) {
        super(container);
        this.betStatusService = container.betStatusService;
        this.resultService = container.resultService;
    }

    override async proceedBet(player: any, payload: BetPayload): Promise<void> {
        console.time("proceedBet");
        await super.proceedBet(player, payload).catch((reason) => {
            return Promise.reject(reason);
        });
        console.timeEnd("proceedBet");
    }

    adjustTotalBets(player: any, bet: BetPayload, rate: number) {
        super.adjustTotalBets(player, bet, rate);
        this.adjustPlayerBetCount(player, bet.betChoice);
    }

    adjustPlayerBetCount(player: any, betChoice: string) {
        if (!this.gameData.playerBetCount[betChoice]) {
            this.gameData.playerBetCount[betChoice] = [];
        }
        !this.gameData.playerBetCount[betChoice].includes(player.UID) && this.gameData.playerBetCount[betChoice].push(player.UID);
    }

    composeBettingTimeValidationCriteria(roundId: number): { failure: boolean; notice: { errorCode: string } }[] {
        return [
            {
                failure: roundId !== this.gameData.roundId,
                notice: { errorCode: helpers.noticeHelper.placeBetNextRound },
            },
            {
                failure: !this.betStatusService.allowBets,
                notice: { errorCode: helpers.noticeHelper.placeBetNextRound },
            },
        ];
    }

    async upsertBet(player: any, roundId: number, bet: BetPayload, rate: number) {
        const newBet: Record<string, any> = {
            uid: player.UID,
            name: player.profile.name,
            time: new Date(),
            freeBet: bet.freeBet,
            roundId,
            clientSeed: bet.clientSeed,
        };
        const existingBetFilter = { uid: player.UID, roundId, freeBet: bet.freeBet };
        const existingBetIncrement = {
            [`betAmount.${bet.index}.${bet.betChoice}`]: bet.amount,
            totalAmount: bet.amount,
        };

        if (player.session) {
            newBet.siteId = player.session.siteId;
            newBet.currency = player.session.currencyName;
            newBet.rate = rate;
            newBet.operatorId = player.session.operatorId;
            newBet.playerId = player.session.playerId;
        }
        const odds = this.betStatusService.odds;
        const points = this.betStatusService.points;

        const oddsUpdate = odds
            ? Object.entries(odds).reduce((acc, [key, value]) => {
                  acc[`marbleOdds.${bet.index}.${key}`] = {
                      price: value,
                      point: points[key] ?? 0,
                  };
                  return acc;
              }, {} as Record<string, any>)
            : {};

        await this.betsRepository.updateOne(
            existingBetFilter,
            {
                $inc: existingBetIncrement,
                $setOnInsert: newBet,
                $set: oddsUpdate,
            },
            { upsert: true, setDefaultsOnInsert: true }
        );

        return newBet.time;
    }

    override async insertBetLog(player: any, roundId: number, bet: any, rate: number): Promise<void> {
        const liveScore = this.resultService.currentLiveScore ?? { home: 0, away: 0 };

        const formattedLiveScore = `${liveScore.home}:${liveScore.away}`;

        const newBetLog: Record<string, any> = {
            uid: player.UID,
            name: player.profile.name,
            time: new Date(),
            choice: bet.betChoice,
            amount: bet.amount,
            clientSentTime: bet.clientSentTime,
            receivedTime: bet.receivedTime,
            roundId,
            index: bet.index,
            liveScore: formattedLiveScore,
        };

        if (player.session) {
            newBetLog.siteId = player.session.siteId;
            newBetLog.currency = player.session.currencyName;
            newBetLog.rate = rate;
            newBetLog.operatorId = player.session.operatorId;
            newBetLog.playerId = player.session.playerId;
            newBetLog.appType = player.session.system;
            newBetLog.siteName = player.session.siteName;
        }

        await this.betLogsRepository.create(newBetLog);
    }
}
