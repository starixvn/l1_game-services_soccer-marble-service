import { ResultType, SettlementResultType } from "../models/rounds";
import { EventResponse } from "../consumers/odd-feed-consumer";


export const generateResult = (): ResultType => {
    return {
        home: 0,
        away: 0,
    }
};

export const generateResultFromAdminRawResult = (roundResult: ResultType): ResultType => {
    return {
        home: roundResult.home,
        away: roundResult.away,
    };
};

export const getSettlementResult = (round: EventResponse): SettlementResultType => {
    const settlementResult: Record<string, boolean> = {}
    round.eventDetails.forEach((eventDetail, index) => {
        for (const market of eventDetail.markets) {
            for (const selection of market.selections) {
                const selectionUniqueKey = `${index}:${selection.betChoice}`;
                settlementResult[selectionUniqueKey] = selection.settlementStatus === "W";
            }
        }
    })
    return settlementResult;
};

export const generateRawResultForHash = () => {};