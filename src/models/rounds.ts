import mongoose from "mongoose";
import { MODEL_NAME_PREFIX, ODDS_TYPE } from "../constants";
import { MatchType } from "./tournaments";
import { VoiceGenerationResult } from "../helpers/voices";

export type ResultType = {
    tournamentId?: mongoose.Types.ObjectId;
    firstHalf: string;
    secondHalf: string;
    firstHalfVideo: string;
    secondHalfVideo: string;
    overUnderValue: number;
    homeWinsOnDraw: boolean;
    penalty: { home: number; away: number };
    firstHalfTimeline?: number[];
    secondHalfTimeline?: number[];
    firstHalfEventTimeline?: {
        timeLine: number[];
        eventName: string[];
        frame: number[];
    }
    secondHalfEventTimeline?: {
        timeLine: number[];
        eventName: string[];
        frame: number[];
    }
    voices?: VoiceGenerationResult;
};

const resultSchema = new mongoose.Schema<ResultType>(
    {
        tournamentId: { type: mongoose.Schema.Types.ObjectId },
        firstHalf: { type: String },
        secondHalf: { type: String },
        firstHalfVideo: { type: String },
        secondHalfVideo: { type: String },
        overUnderValue: { type: Number },
        homeWinsOnDraw: { type: Boolean },
        penalty: { type: Object },
    },
    { _id: false },
);

const matchSchema = new mongoose.Schema<MatchType>(
    {
        home: { type: String },
        away: { type: String },
    },
    { _id: false },
);

export type SettlementResultType = {
    [key in keyof typeof ODDS_TYPE]: boolean;
};

const dynamicResultSchema = Object.values(ODDS_TYPE).reduce(
    (schema, item) => ({
        ...schema,
        [item]: { type: Boolean },
    }),
    {},
);

const settlementResultSchema = new mongoose.Schema<SettlementResultType>(dynamicResultSchema, { _id: false });

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
    settlementResult: settlementResultSchema,
    match: matchSchema,
    time: { type: Date, default: () => new Date() },
    exchangeRateId: { type: Number, required: true },
});

const modelName = `${MODEL_NAME_PREFIX}_rounds`;
const Round = mongoose.model(modelName, RoundSchema);

export default Round;
