function roundToPrecision(value: number, precision = 100000) {
   return Math.round(value * precision) / precision;
};


function marginFromOdds(odds: number, marginBase: number) 
{
    if (odds <= 0) {
        return 0;
    }
    const margin = Math.max(Math.log2(odds) * marginBase, marginBase);
    return Math.min(margin, 1);
}

function trueOddsToOdds(trueOdds: number, margin: number) {
    return roundToPrecision((1 - margin) * trueOdds, 100);
}

interface MarginConfig {
    max: number;
    [key: string]: number;
}

const DEFAULT_MARGIN_BASE = 0.02;

export type MarginConfigs = Array<MarginConfig>;

export function trueOddsToOddsWithMarginConfig(trueOdds: Record<string, number>, marginConfig: MarginConfigs) {
    const sortedMarginConfig = marginConfig.toSorted((a, b) => b.max - a.max);

    return Object.keys(trueOdds).reduce((acc, key) => {
        const marginBase = sortedMarginConfig.find((config) => trueOdds[key] <= config.max)?.margin ?? DEFAULT_MARGIN_BASE;
        const margin = marginFromOdds(trueOdds[key], marginBase);
        const odds = trueOddsToOdds(trueOdds[key], margin);
        acc[key] = odds;
        return acc;
    }, {} as Record<string, number>);

}
