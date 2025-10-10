import mongoose from "mongoose";
import { MODEL_NAME_PREFIX } from "../constants";

export type EventDetailSettlementResult = {
    [key: string]: boolean;
}

export type EventDetailResult = {
    finalScore: string;
    goalSequence: string;
    playlist: string;
    phase: number;
};

export type Result = Record<number, EventDetailResult>;
export type SettlementResult = Record<number, EventDetailSettlementResult>;

export type ResultAndSettlementResult = {
    result: Result;
    settlementResult: SettlementResult;
}

const eventDetailResultSchema = new mongoose.Schema<EventDetailResult>(
    {
        finalScore: { type: String },
        goalSequence: { type: String },
        playlist: { type: String },
        phase: { type: Number },
    },
    { _id: false },
);

export interface IRound {
    id: number;
    result: Result;
    settlementResult: SettlementResult;
    time: Date;
    exchangeRateId: number;
}

const RoundSchema = new mongoose.Schema<IRound>({
    id: { type: Number, required: true },
    result: { type: Map, of: eventDetailResultSchema },
    settlementResult: { type: Map, of: mongoose.Schema.Types.Mixed },
    time: { type: Date, default: () => new Date() },
    exchangeRateId: { type: Number, required: true },
});

const modelName = `${MODEL_NAME_PREFIX}_rounds`;
const Round = mongoose.model(modelName, RoundSchema);

export default Round;
