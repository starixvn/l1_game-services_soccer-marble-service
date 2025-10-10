import { BET_CHOICE_MAPPER, BET_CHOICES } from "./constants";

export default {
    id: 158,
    name: "SoccerMarble",
    configName: "soccermarble",
    choicesMapper: BET_CHOICE_MAPPER,
    hedgeBetGroups: [
        ["ft_hdp_home", "ft_hdp_away"],
        ["h1_hdp_home", "h1_hdp_away"],
        ["ft_ou_over", "ft_ou_under"],
        ["h1_ou_over", "h1_ou_under"],
        ["ft_oe_even", "ft_oe_odd"],
        ["h1_oe_even", "h1_oe_odd"],
        ["ft_1x2_home", "ft_1x2_away"],
        ["h1_1x2_home", "h1_1x2_away"]
    ],
    provablyFair: false,
    historyPageSize: 8,
    defaultBetTracks: {},
    botSettings: {
        ratio: { mainPreOpts: 40, mainLiveOpts: 40, subPreOpts: 10, subLiveOpts: 10 },
        mainPreOpts: [BET_CHOICES.home, BET_CHOICES.away],
        mainLiveOpts: [BET_CHOICES.homeLive, BET_CHOICES.awayLive],
        subPreOpts: [BET_CHOICES.over, BET_CHOICES.under, BET_CHOICES.odd, BET_CHOICES.even, BET_CHOICES.draw],
        subLiveOpts: [BET_CHOICES.overLive, BET_CHOICES.underLive, BET_CHOICES.oddLive, BET_CHOICES.evenLive, BET_CHOICES.drawLive],
    },
};
