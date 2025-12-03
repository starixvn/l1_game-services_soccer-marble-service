import { EventDetailSettlementResult, Result, SettlementResult } from "../models/rounds";
import { MarbleEventDetail } from "../features/shared-types";

export const generateResult = (): Result => {
    return {};
};

export const generateResultFromAdminRawResult = (roundResult: Result): Result => {
    return {};
};

export const getSettlementResult = (round: MarbleEventDetail): SettlementResult => {
    return {};
};

export const generateRawResultForHash = () => {};

export const getLastSettlementResult = (settlementResult: SettlementResult): EventDetailSettlementResult => {
    return Object.values(settlementResult).pop() ?? {};
};

export const combineFinalResult = (result: Result): string => {
    const { homeScore, awayScore } = Object.values(result).reduce(
        (acc, eventDetailResult) => {
            const [homeScorePart, awayScorePart] = eventDetailResult.result.split(":");
            return {
                homeScore: acc.homeScore + Number(homeScorePart),
                awayScore: acc.awayScore + Number(awayScorePart),
            };
        },
        { homeScore: 0, awayScore: 0 }
    );

    return `${homeScore}:${awayScore}`;
};
