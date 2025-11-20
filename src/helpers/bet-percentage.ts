export const getUserBetPercentage = (playerBetCount: Record<string, string[]>, betChoices: Array<string>) => {
    const total = betChoices.reduce((t, choice) => t + (playerBetCount[choice]?.length || 0), 0);
    
    return betChoices.reduce((result, choice) => {
        result[choice] = total > 0 && playerBetCount[choice] ? Math.round((playerBetCount[choice].length * 100) / total) : 0;
        return result;
    }, {} as Record<string, number>);
};
