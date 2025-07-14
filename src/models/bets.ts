import mongoose from "mongoose";
import { MODEL_NAME_PREFIX, BET_CHOICES } from "../constants";

const modelName = `${MODEL_NAME_PREFIX}_bets`;
const tmpModelName = `${MODEL_NAME_PREFIX}_tmpbets`;

const betChoices = Object.keys(BET_CHOICES).reduce(
    (acc, key) => {
        acc[key] = { type: Number, default: 0 };
        return acc;
    },
    {} as Record<string, { type: NumberConstructor; default: number }>,
);

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
    ...betChoices,
};

const bets = mongoose.model(
    modelName,
    new mongoose.Schema({
        ...bet,
        currency: { type: String },
        rate: { type: Number, required: true },
    }),
);

const tmpBets = mongoose.model(tmpModelName, new mongoose.Schema(bet));

export { bets, tmpBets };
