import mongoose, { ObjectId } from "mongoose";
import { MODEL_NAME_PREFIX } from "../constants";

export type MatchType = {
    id?: number;
    home: string;
    away: string;
    homeWins?: boolean;
};

export interface ITournament {
    _id: ObjectId;
    code: string;
    matches: MatchType[];
    currentMatch: number;
    ended: boolean;
    time: Date;
}

const Schema = new mongoose.Schema<ITournament>({
    code: { type: String, required: true },
    matches: { type: [Object], required: true },
    currentMatch: { type: Number, default: 0 },
    ended: { type: Boolean, default: false },
    time: { type: Date, default: () => new Date() },
});

const modelName = `${MODEL_NAME_PREFIX}_tournaments`;
const Tournament = mongoose.model(modelName, Schema);

export default Tournament;
