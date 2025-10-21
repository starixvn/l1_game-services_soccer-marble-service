import { TableProcessBetQueue } from "sc-game-base/src/table/crons";
import GameData from "../game-data";
import { helpers } from "sc-common";
import GameDefinition from "../game-definition";
import { BetStatusService } from "../features/bet-status/bet-status-service";
import { extractGameId } from "../helpers/eventid";

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

    constructor(container: any) {
        super(container);
        this.betStatusService = container.betStatusService;
    }

    adjustTotalBets(player: any, bet: BetPayload, rate: number) {
        super.adjustTotalBets(player, bet, rate);
        this.adjustPlayerBetCount(player, bet.betChoice);
    }

    adjustPlayerBetCount(player: any, betChoice: string) {
        if (this.definition.choices.includes(betChoice)) {
            if (!this.gameData.playerBetCount[betChoice]) {
                this.gameData.playerBetCount[betChoice] = [];
            }
            !this.gameData.playerBetCount[betChoice].includes(player.UID) && this.gameData.playerBetCount[betChoice].push(player.UID);
        }
    }

    composeBettingTimeValidationCriteria(roundId: number): { failure: boolean; notice: { errorCode: string } }[] {
        const gameId = extractGameId(roundId).toString();

        return [
            {
                failure: roundId !== this.gameData.roundId,
                notice: { errorCode: helpers.noticeHelper.placeBetNextRound },
            },
            {
                failure: !this.betStatusService.betStatusByGameId[gameId],
                notice: { errorCode: helpers.noticeHelper.placeBetNextRound },
            },
        ];
    }

    async upsertBet(player: any, roundId: number, bet: BetPayload, rate: number) {
        const gameId = extractGameId(roundId).toString();
        const newBet: Record<string, any> = {
            uid: player.UID,
            name: player.profile.name,
            time: new Date(),
            freeBet: bet.freeBet,
            roundId,
            clientSeed: bet.clientSeed,
            index: bet.index,
        };
        const existingBetFilter = { uid: player.UID, roundId, freeBet: bet.freeBet, index: bet.index };
        const existingBetIncrement = {
            [bet.betChoice]: bet.amount,
            totalAmount: bet.amount,
        };

        if (player.session) {
            newBet.siteId = player.session.siteId;
            newBet.currency = player.session.currencyName;
            newBet.rate = rate;

            newBet.operatorId = player.session.operatorId;
            newBet.playerId = player.session.playerId;
        }
        const odds = this.betStatusService.dynamicOddsByGameId[gameId];

        const oddsUpdate = odds ? 
            Object.entries(odds).reduce((acc, [key, value]) => {
                acc[`odds.${key}`] = value;
                return acc;
            }, {} as Record<string, any>) : {};

        await this.betsRepository.updateOne(
            existingBetFilter,
            {
                $inc: existingBetIncrement,
                $setOnInsert: newBet,
                $set: oddsUpdate,
            },
            { upsert: true, setDefaultsOnInsert: true },
        );

        return newBet.time;
    }
}
