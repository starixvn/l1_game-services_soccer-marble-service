import { BET_CHOICE_ENUM, BET_CHOICES } from "./constants";

export default {
    id: 114,
    name: "MarbleFootball2",
    configName: "marblefootball2",
    durations: {
        wholeRound: 126,
        startingRound: 116,
        placingBetsFirstHalf: 110,
        lockingBetFirstHalf: 93,
        streamingVideoFirstHalf: 92,
        placingBetsSecondHalf: 52,
        lockingBetSecondHalf: 35,
        streamingVideoSecondHalf: 34,
    },
    choices: Object.values(BET_CHOICES),
    choicesMapper: BET_CHOICE_ENUM,
    hedgeBetGroups: [
        [BET_CHOICES.home, BET_CHOICES.away],
        [BET_CHOICES.over, BET_CHOICES.under],
        [BET_CHOICES.odd, BET_CHOICES.even],
        [BET_CHOICES.homeLive, BET_CHOICES.awayLive],
        [BET_CHOICES.overLive, BET_CHOICES.underLive],
        [BET_CHOICES.oddLive, BET_CHOICES.evenLive],
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
