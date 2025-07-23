import mongoose from "mongoose";
import { MODEL_NAME_PREFIX } from "../constants";

export type ResultType = {
    home: number;
    away: number;
};

const resultSchema = new mongoose.Schema<ResultType>(
    {
        home: { type: Number },
        away: { type: Number },
    },
    { _id: false },
);

export type MatchType = {
    home: string;
    away: string;
};

const matchSchema = new mongoose.Schema<MatchType>(
    {
        home: { type: String },
        away: { type: String },
    },
    { _id: false },
);

export type SettlementResultType = {
    [key: string]: boolean;
};

export interface IRound {
    id: number;
    result: ResultType;
    settlementResult: SettlementResultType;
    match: MatchType;
    time: Date;
    exchangeRateId: number;
}

const RoundSchema = new mongoose.Schema<IRound>({
    id: { type: Number, required: true },
    result: resultSchema,
    settlementResult: {
        type: Map,
        of: Boolean
    },
    time: { type: Date, default: () => new Date() },
    exchangeRateId: { type: Number, required: true },
});

const modelName = `${MODEL_NAME_PREFIX}_rounds`;
const Round = mongoose.model(modelName, RoundSchema);

export default Round;
