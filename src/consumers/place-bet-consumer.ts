import { Core } from "sc-game-base";
import GameDefinition from "../game-definition";
import { helpers } from "sc-common";
import GameData from "../game-data";
import { BetStatusService } from "../features/bet-status/bet-status-service";
import { HedgeBetService } from "../features/bet-status/hedge-bet-service";
import { BaseEventPublisher } from "sc-game-base/src/core/event-publishers";
import { extractGameId } from "../helpers/eventid";

export default class PlaceBetConsumer extends Core.BaseEventConsumers.PlaceBetConsumer {
    declare definition: GameDefinition;
    declare gameData: GameData;

    private readonly hedgeBetService: HedgeBetService;
    private readonly betStatusService: BetStatusService;

    constructor(
        definition: GameDefinition,
        gameData: GameData,
        publisher: BaseEventPublisher,
        hedgeBetService: HedgeBetService,
        betStatusService: BetStatusService
    ) {
        super(definition, gameData, publisher);
        this.hedgeBetService = hedgeBetService;
        this.betStatusService = betStatusService;
    }

    composeBetChoiceValidationCriteria(betChoice: string) {

        return [
            {
                failure: this.isBetChoiceOddZero(betChoice),
                notice: this.getNoticeObj(helpers.noticeHelper.invalidBet),
            },
        ];
    }

    composeBetAmountValidationCriteria(
        player: any,
        betChoice: string,
        amount: number,
        freeBet: boolean
    ): { failure: boolean; notice: string }[] {
        const settings = this.gameData.currencyGroupGames.find((x) => x.groupId.toString() === player.session.currencyGroupId) as any;
        const configs = this.gameData.gameConfigs;
        const { betTracks } = this.gameData.ingame[player.profile.name] ?? { betTracks: {} };
        const totalAmount = Object.values(betTracks as Record<string, number>).reduce((total, amount) => total + (amount ?? 0), 0) + amount;
        const minBet = Math.max(player.profile.minBet, settings.minBet);
        const maxBet = Math.min(player.profile.maxBet, settings.maxBet);
        const maxBetPerChoice = maxBet;

        return [
            {
                failure: freeBet && !configs.enableFreeBet,
                notice: this.getNoticeObj(helpers.noticeHelper.invalidBet),
            },
            {
                failure: amount > maxBetPerChoice || betTracks[betChoice] + amount > maxBetPerChoice,
                notice: this.getNoticeObj(helpers.noticeHelper.maxBetForChoice, { maxBet: maxBetPerChoice }),
            },
            {
                failure: amount < minBet,
                notice: this.getNoticeObj(helpers.noticeHelper.minBet, { minBet }),
            },
            {
                failure: amount > maxBet,
                notice: this.getNoticeObj(helpers.noticeHelper.maxBet, { maxBet }),
            },
            {
                failure: totalAmount > maxBet,
                notice: this.getNoticeObj(helpers.noticeHelper.maxBet, { maxBet }),
            },
        ];
    }

    composeBettingTimeValidationCriteria(roundId: number): { failure: boolean; notice: string }[] {
        const configs = this.gameData.gameConfigs;
        const gameId = extractGameId(roundId).toString();

        return [
            {
                failure: !configs.enabled,
                notice: this.getNoticeObj(helpers.noticeHelper.invalidBet),
            },
            {
                failure: roundId !== this.betStatusService.currentRoundId,
                notice: this.getNoticeObj(helpers.noticeHelper.invalidBet, { gameRoundId: roundId }),
            },
            {
                failure: !this.betStatusService.betStatusByGameId[gameId],
                notice: this.getNoticeObj(helpers.noticeHelper.placeBetNextRound),
            },
        ];
    }

    composeHedgeBetValidationCriteria(betChoice: string, player: any): { failure: boolean; notice: string }[] {
        const gameId = extractGameId(this.gameData.roundId).toString();
        
        const invalidGroup = this.hedgeBetService.verifyHedgeBetRestriction({
            gameId,
            player: player.profile.name,
            betChoice,
        });


        return [
            {
                failure: invalidGroup.size > 0,
                notice: this.getNoticeObj(helpers.noticeHelper.disallowHedgeBet, { hedgeBetGroup: Array.from(invalidGroup?.values() ?? []) }),
            },
        ];
    }

    override consume(player: any, payload: any): void {
        const index = this.betStatusService.getBetStatus().currentIndex;
        Object.assign(payload, {
            amount: payload.amount >> 0,
            freeBet: payload.freeBet ?? false,
            roundId: payload.roundId ?? this.gameData.roundId,
            mode: payload.m ?? this.DisplayMode.Landscape,
            receivedTime: new Date(),
            index,
        });

        const { amount, betChoice, freeBet, roundId } = payload;
        const name = player.profile.name;
        if (!this.validateRequestParams(payload, player) || !this.validateBetRequest(player, betChoice, amount, freeBet, roundId)) {
            console.log("bet invalid, skipping");
            return;
        }

        if (!this.gameData.ingame[name]) {
            const newPlayer = {
                name: player.profile.name,
                currency: player.session.currencyName,
                system: player.session.system,
                betTracks: {},
                betQueue: [],
                clientSeed: payload.clientSeed,
                operatorId: player.session.operatorId,
            };

            this.gameData.ingame[name] = newPlayer;
        }

        this.adjustBetTracks(player.profile.name, payload);
        this.gameData.ingame[name].betQueue.push({ player, payload })
        console.log("bet placed", payload);
    }

    override adjustBetTracks(playerName: string, bet: any): void {
        super.adjustBetTracks(playerName, bet);
        const gameId = extractGameId(bet.roundId).toString();
        this.hedgeBetService.trackHedgeBetRestriction({
            gameId,
            player: playerName,
            betChoice: bet.betChoice,
        });
    }

    private isBetChoiceOddZero(betChoice: string) {
        const gameId = extractGameId(this.gameData.roundId).toString();
        const odds = this.betStatusService.dynamicOddsByGameId[gameId]?.[betChoice] ?? 0;
        return odds === 0;
    }
}
