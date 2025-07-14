import gameSettings from "../../../build/game-settings";

export default Object.assign(gameSettings, {
    durations: {
        wholeRound: 12,
        startingRound: 11,
        placingBetsFirstHalf: 10,
        lockingBetFirstHalf: 7,
        streamingVideoFirstHalf: 6,
        placingBetsSecondHalf: 5,
        lockingBetSecondHalf: 2,
        streamingVideoSecondHalf: 1,
    },
});
