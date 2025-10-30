import mongoose from "mongoose";
import { MODEL_NAME_PREFIX } from "../constants";

const modelName = `${MODEL_NAME_PREFIX}_bets`;
const tmpModelName = `${MODEL_NAME_PREFIX}_tmpbets`;

const bet = {
    roundId: { type: Number, required: true },
    uid: { type: String, required: true },
    name: { type: String, required: true },
    betwin: { type: Number, default: 0 },
    time: { type: Date },
    totalAmount: { type: Number, default: 0 },
    odds: { type: Object },
    siteId: { type: String },
    freeBet: { type: Boolean, default: false },
    playerId: { type: String },
    operatorId: { type: String, required: false },
    currency: { type: String, required: false },
    rate: { type: Number, required: false },
    paid: { type: Boolean, default: false },
    index: { type: Number },
};

const bets = mongoose.model(
    modelName,
    new mongoose.Schema({
        ...bet,
        currency: { type: String },
        rate: { type: Number, required: true },
    }, { strict: false }),
);

const tmpBets = mongoose.model(tmpModelName, new mongoose.Schema(bet, { strict: false }));

export { bets, tmpBets };
