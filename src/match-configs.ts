import { ODDS_TYPE } from "./constants";

export type OddsType = {
    [key in keyof typeof ODDS_TYPE]?: number;
};

export type HalfConfigType = {
    scoreRate: Record<string, number>;
};

export type MatchConfigType = {
    firstHalfConfig: HalfConfigType;
    secondHalfConfig: HalfConfigType;
};

export const firstHalfConfig: HalfConfigType = {
    scoreRate: {
        "0-0": 0,
        "1-0": 0.15,
        "0-1": 0.15,
        "1-1": 0.18,
        "2-0": 0.1,
        "0-2": 0.1,
        "2-1": 0.06,
        "1-2": 0.06,
        "3-0": 0.04,
        "0-3": 0.04,
        "2-2": 0.04,
        "3-1": 0.04,
        "1-3": 0.04,
        "4-0": 0,
        "0-4": 0,
    },
};

const secondHalfConfig1: HalfConfigType = {
    scoreRate: {
        "0-0": 0,
        "1-0": 0.05,
        "0-1": 0.05,
        "1-1": 0.13,
        "2-0": 0.14,
        "0-2": 0.14,
        "2-1": 0.1,
        "1-2": 0.1,
        "3-0": 0.11,
        "0-3": 0.11,
        "2-2": 0.01,
        "3-1": 0.01,
        "1-3": 0.01,
        "4-0": 0.02,
        "0-4": 0.02,
    },
};

const secondHalfConfig2: HalfConfigType = {
    scoreRate: {
        "0-0": 0,
        "1-0": 0.06,
        "0-1": 0.06,
        "1-1": 0.12,
        "2-0": 0.14,
        "0-2": 0.14,
        "2-1": 0.1,
        "1-2": 0.1,
        "3-0": 0.1,
        "0-3": 0.1,
        "2-2": 0.01,
        "3-1": 0.015,
        "1-3": 0.015,
        "4-0": 0.02,
        "0-4": 0.02,
    },
};

const secondHalfConfig5: HalfConfigType = {
    scoreRate: {
        "0-0": 0,
        "1-0": 0.08,
        "0-1": 0.08,
        "1-1": 0.13,
        "2-0": 0.12,
        "0-2": 0.12,
        "2-1": 0.09,
        "1-2": 0.09,
        "3-0": 0.09,
        "0-3": 0.09,
        "2-2": 0.01,
        "3-1": 0.01,
        "1-3": 0.01,
        "4-0": 0.04,
        "0-4": 0.04,
    },
};

export const secondHalfConfigs = [secondHalfConfig1, secondHalfConfig2, secondHalfConfig5];
