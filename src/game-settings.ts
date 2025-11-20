import appConfigs from "./app-configs";

export default {
    id: appConfigs.gameId,
    name: `SoccerMarble${appConfigs.gameId}`,
    configName: `soccermarble${appConfigs.gameId}`,
    hedgeBetGroups: [
        ["ft_hdp_home", "ft_hdp_away"],
        ["h1_hdp_home", "h1_hdp_away"],
        ["ft_ou_over", "ft_ou_under"],
        ["h1_ou_over", "h1_ou_under"],
        ["ft_oe_even", "ft_oe_odd"],
        ["h1_oe_even", "h1_oe_odd"],
        ["ft_1x2_home", "ft_1x2_away"],
        ["h1_1x2_home", "h1_1x2_away"],
    ],
    provablyFair: false,
    historyPageSize: 8,
    defaultBetTracks: {},
    botSettings: {
        ratio: { mainPreOpts: 40, mainLiveOpts: 40, subPreOpts: 10, subLiveOpts: 10 },
    },
};
