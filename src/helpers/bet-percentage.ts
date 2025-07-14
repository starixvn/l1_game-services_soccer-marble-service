import { BET_CHOICES } from "../constants";

export const calculatePlayerBetPercentage = (playerBetCount: Record<string, string[]>, betChoices: string[]): Record<string, number> => {
    const total = betChoices.reduce((t, choice) => t + (playerBetCount[choice]?.length || 0), 0);

    return betChoices.reduce((result, choice) => {
        result[choice] = total > 0 && playerBetCount[choice] ? Math.round((playerBetCount[choice].length * 100) / total) : 0;
        return result;
    }, {} as Record<string, number>);
};

export const calculateFinalPlayerBetPercentage = (
    playerBetCount: Record<string, string[]>,
    prevBetChoices: string[],
    liveBetChoices: string[]
): Record<string, number> => {
    const betChoices = [...prevBetChoices, ...liveBetChoices];
    const finalBetChoices = ["homeFinal", "awayFinal", "drawFinal"];
    const total = betChoices.reduce((t, choice) => t + (playerBetCount[choice]?.length || 0), 0);

    return finalBetChoices.reduce((result, choice, index) => {
        const finalCount = (playerBetCount[prevBetChoices[index]]?.length || 0) + (playerBetCount[liveBetChoices[index]]?.length || 0);
        result[choice] = total > 0 && finalCount ? Math.round((finalCount * 100) / total) : 0;
        return result;
    }, {} as Record<string, number>);
};

export const getUserBetPercentage = (playerBetCount: Record<string, string[]>) => {
    const prevBetChoices = [BET_CHOICES.home, BET_CHOICES.away, BET_CHOICES.draw];
    const liveBetChoices = [BET_CHOICES.homeLive, BET_CHOICES.awayLive, BET_CHOICES.drawLive];
    const prevUserBetPercentage = calculatePlayerBetPercentage(playerBetCount, prevBetChoices);
    const liveUserBetPercentage = calculatePlayerBetPercentage(playerBetCount, liveBetChoices);
    const finalUserBetPercentage = calculateFinalPlayerBetPercentage(playerBetCount, prevBetChoices, liveBetChoices);

    return { ...prevUserBetPercentage, ...liveUserBetPercentage, ...finalUserBetPercentage };
};
