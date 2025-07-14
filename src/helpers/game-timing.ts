import { Duration } from "../game-definition";

export function isFirstHalfOddsActive(remainingTime: number, durations: Duration) {
    const { placingBetsSecondHalf } = durations;

    return remainingTime > placingBetsSecondHalf;
}

export function isWithinBettingTime(remainingTime: number, durations: Duration) {
    return isWithinFirstHalfBettingTime(remainingTime, durations) || isWithinSecondHalfBettingTime(remainingTime, durations);
}

export function isWithinFirstHalfBettingTime(remainingTime: number, durations: Duration) {
    const { placingBetsFirstHalf, lockingBetFirstHalf } = durations;
    return isRemainingTimeWithinWindow(remainingTime, placingBetsFirstHalf, lockingBetFirstHalf);
}

export function isWithinSecondHalfBettingTime(remainingTime: number, durations: Duration) {
    const { placingBetsSecondHalf, lockingBetSecondHalf } = durations;

    return isRemainingTimeWithinWindow(remainingTime, placingBetsSecondHalf, lockingBetSecondHalf);
}

function isRemainingTimeWithinWindow(remainingTime: number, placingBets: number, lockingBet: number) {
    return remainingTime < placingBets && remainingTime >= lockingBet;
}

export function isDuringFirstHalf(remainingTime: number, durations: Duration): boolean {
    return remainingTime <= durations.placingBetsFirstHalf && remainingTime > durations.placingBetsSecondHalf;
}

export function isDuringSecondHalf(remainingTime: number, durations: Duration): boolean {
    return remainingTime <= durations.placingBetsSecondHalf && remainingTime > 0;
}

export function isStreamingVideoFirstHalf(remainingTime: number, durations: Duration): boolean {
    return remainingTime <= durations.streamingVideoFirstHalf && remainingTime > durations.placingBetsSecondHalf;
}

export function isStreamingVideoSecondHalf(remainingTime: number, durations: Duration): boolean {
    return remainingTime <= durations.streamingVideoSecondHalf && remainingTime >= 0;
}

export function isShowingResultFirstHalf(remainingTime: number, durations: Duration): boolean {
    return remainingTime <= durations.placingBetsSecondHalf && remainingTime > durations.lockingBetSecondHalf;
}

export function isShowingResultSecondHalf(remainingTime: number, durations: Duration): boolean {
    return remainingTime <= durations.wholeRound && remainingTime > durations.startingRound;
}
