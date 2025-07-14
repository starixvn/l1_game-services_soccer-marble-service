import mongoose from "mongoose";
import { MODEL_NAME_PREFIX } from "../constants";

export interface IResult {
    roundId: number;
    encryptedResultHash: { iv: string; content: string };
    encryptedResult: { iv: string; content: string };
    time: Date;
}

const ResultSchema = new mongoose.Schema({
    roundId: { type: Number, required: true },
    encryptedResult: { iv: { type: String }, content: { type: String } },
    time: { type: Date, default: () => new Date() },
});

const modelName = `${MODEL_NAME_PREFIX}_results`;
const Result = mongoose.model(modelName, ResultSchema);

export default Result;
