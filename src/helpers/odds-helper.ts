import { DEFAULT_MARGIN_BASE, LIVE_BET_CHOICES, OVER_UNDER_VALUE, PRE_MATCH_BET_CHOICES } from "../constants";
import { HalfConfigType, MatchConfigType } from "../match-configs";

export const parseScore = (score: string): [number, number] => {
    const [home, away] = score.split("-").map(Number);
    return [home, away];
};

export const roundToPrecision = (value: number, precision = 100000) => {
    return Math.round(value * precision) / precision;
};

export const calculateFullTimeScoreRates = (firstHalf: HalfConfigType, secondHalf: HalfConfigType): Record<string, number> => {
    const fulltimeScoreRates: Record<string, number> = {};

    for (const [fhScore, fhRate] of Object.entries(firstHalf.scoreRate)) {
        const [fhHome, fhAway] = parseScore(fhScore);

        for (const [shScore, shRate] of Object.entries(secondHalf.scoreRate)) {
            const [shHome, shAway] = parseScore(shScore);
            const finalScore = `${fhHome + shHome}-${fhAway + shAway}`;
            const combinedRate = fhRate * shRate;

            fulltimeScoreRates[finalScore] = (fulltimeScoreRates[finalScore] || 0) + combinedRate;
        }
    }

    return fulltimeScoreRates;
};

export const calculateProbabilitiesForBetChoices = (scoreRates: Record<string, number>, addingScore = "0-0") => {
    const totalRates = Object.values(scoreRates).reduce((sum, rate) => sum + rate, 0);
    const [addingHome, addingAway] = parseScore(addingScore);

    let home = 0,
        away = 0,
        draw = 0,
        over = 0,
        under = 0,
        odd = 0,
        even = 0;

    for (const [score, rate] of Object.entries(scoreRates)) {
        const [homeGoals, awayGoals] = parseScore(score);
        const totalGoals = homeGoals + awayGoals + addingHome + addingAway;

        if (homeGoals + addingHome > awayGoals + addingAway) {
            home += rate;
        } else if (homeGoals + addingHome < awayGoals + addingAway) {
            away += rate;
        } else {
            draw += rate;
        }

        if (totalGoals > OVER_UNDER_VALUE) {
            over += rate;
        } else if (totalGoals < OVER_UNDER_VALUE) {
            under += rate;
        }

        if (totalGoals % 2 === 0) {
            even += rate;
        } else {
            odd += rate;
        }
    }

    return {
        probabilities: {
            home: home / totalRates,
            away: away / totalRates,
            draw: draw / totalRates,
            over: over / totalRates,
            under: under / totalRates,
            even: even / totalRates,
            odd: odd / totalRates,
        },
    };
};

export const calculateMarginFromOdds = (odds: number, marginBase: number) => {
    if (odds === 0) {
        return 0;
    }

    const margin = Math.max(Math.log2(odds) * marginBase, marginBase);

    return Math.min(margin, 1);
};

export const calculateBetOdds = (probabilities: Record<string, number>, margins: Record<string, number>[] = []): Record<string, number> => {
    const sortedMargins = margins.toSorted((a, b) => a.max - b.max);

    return Object.keys(probabilities).reduce((result, betChoice) => {
        const prob = probabilities[betChoice];
        const originalOdds = probabilityToBetOdds(prob);
        const marginBase = sortedMargins.find((m) => originalOdds <= m.max)?.[betChoice] || DEFAULT_MARGIN_BASE;
        const margin = calculateMarginFromOdds(originalOdds, marginBase);
        result[betChoice] = probabilityToBetOdds(prob, margin);
        return result;
    }, {} as Record<string, number>);
};

export const probabilityToBetOdds = (prob: number, margin = 0): number => {
    if (prob <= 0 || prob >= 1) {
        return 0;
    }

    const odds = (1 - margin) / prob;
    return roundToPrecision(odds, 100);
};

export const calculatePreMatchOdds = (matchConfig: MatchConfigType, margins: Record<string, number>[] = []) => {
    const fullTimeScoreRates = calculateFullTimeScoreRates(matchConfig.firstHalfConfig, matchConfig.secondHalfConfig);
    const { probabilities } = calculateProbabilitiesForBetChoices(fullTimeScoreRates);

    const preMatchProbabilities = {
        [PRE_MATCH_BET_CHOICES.home]: probabilities.home,
        [PRE_MATCH_BET_CHOICES.away]: probabilities.away,
        [PRE_MATCH_BET_CHOICES.draw]: probabilities.draw,
        [PRE_MATCH_BET_CHOICES.over]: probabilities.over,
        [PRE_MATCH_BET_CHOICES.under]: probabilities.under,
        [PRE_MATCH_BET_CHOICES.even]: probabilities.even,
        [PRE_MATCH_BET_CHOICES.odd]: probabilities.odd,
    };

    return calculateBetOdds(preMatchProbabilities, margins);
};

export const calculateLiveOdds = (halfConfig: HalfConfigType, firstHalfResult = "0", margins: Record<string, number>[] = []) => {
    const firstHalfHomeGoals = firstHalfResult.split("H").length - 1;
    const firstHalfAwayGoals = firstHalfResult.split("A").length - 1;
    const addingScore = `${firstHalfHomeGoals}-${firstHalfAwayGoals}`;

    const { probabilities } = calculateProbabilitiesForBetChoices(halfConfig.scoreRate, addingScore);

    const liveProbabilities = {
        [LIVE_BET_CHOICES.homeLive]: probabilities.home,
        [LIVE_BET_CHOICES.awayLive]: probabilities.away,
        [LIVE_BET_CHOICES.drawLive]: probabilities.draw,
        [LIVE_BET_CHOICES.overLive]: probabilities.over,
        [LIVE_BET_CHOICES.underLive]: probabilities.under,
        [LIVE_BET_CHOICES.evenLive]: probabilities.even,
        [LIVE_BET_CHOICES.oddLive]: probabilities.odd,
    };

    return calculateBetOdds(liveProbabilities, margins);
};
