import { Core } from "sc-game-base";
import GameDefinition from "../game-definition";
import { helpers } from "sc-common";
import GameData from "../game-data";
import { isWithinBettingTimeInCurrentEventDetail } from "../helpers/game-timing";

export default class PlaceBetConsumer extends Core.BaseEventConsumers.PlaceBetConsumer {
    declare definition: GameDefinition;
    declare gameData: GameData;

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
        const { betTracks } = this.gameData.ingame[player.profile.name] || { betTracks: {} };
        const totalAmount = this.definition.choices.reduce((total, choice) => total + (betTracks[choice] || 0), 0) + amount;
        const minBet = Math.max(player.profile.minBet, settings.minBet);
        const maxBet = Math.min(player.profile.maxBet, settings.maxBet);
        const maxBetPerChoice = this.getMaxBetPerChoice(player, betChoice, settings);

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

        return [
            {
                failure: !configs.enabled,
                notice: this.getNoticeObj(helpers.noticeHelper.invalidBet),
            },
            {
                failure: roundId !== this.gameData.roundId,
                notice: this.getNoticeObj(helpers.noticeHelper.invalidBet, { gameRoundId: roundId }),
            },
            {
                failure: !isWithinBettingTimeInCurrentEventDetail(this.gameData),
                notice: this.getNoticeObj(helpers.noticeHelper.placeBetNextRound),
            },
        ];
    }

    composeHedgeBetValidationCriteria(betChoice: string, player: any): { failure: boolean; notice: string }[] {
        const { betTracks } = this.gameData.ingame[player.profile.name] || { betTracks: {} };
        const hedgeBetGroups = this.gameData.dynamicHedgeBetGroups?.filter((group) => group.has(betChoice)) ?? [];
        const invalidGroup = hedgeBetGroups.find((group) =>
            Object.keys(betTracks).some((betKey) => betTracks[betKey] && group.has(betKey) && betKey !== betChoice)
        );

        return [
            {
                failure: !!invalidGroup,
                notice: this.getNoticeObj(helpers.noticeHelper.disallowHedgeBet, { hedgeBetGroup: Array.from(invalidGroup?.values() ?? []) }),
            },
        ];
    }


    private getMaxBetPerChoice(player: any, betChoice: string, settings?: any) {
        const maxBet = Math.min(player.profile.maxBet, settings.maxBet);
        const maxBetByOdds = this.getMaxBetByOdds(betChoice, maxBet);
        return Math.min(maxBet, maxBetByOdds);
    }

    private getMaxBetByOdds(betChoice: string, maxBet: number) {
        const odds = this.gameData?.dynamicOdds;
        const betChoiceOdds = odds?.[betChoice] ?? 1;
        return Math.round(maxBet / Math.abs(betChoiceOdds - 1));
    }

    private isBetChoiceOddZero(betChoice: string) {
        const odds = this.gameData?.dynamicOdds?.[betChoice] ?? 0;
        return odds === 0;
    }
}
