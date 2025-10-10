import { Event, EventDetail } from "odds-feed-client";

export interface BetConfig {
    delayPlaceBetByOddsAvailableByMilliseconds?: number;
    lockBetTimeBeforeScheduleStartByMilliseconds?: number;
}

export interface MarbleEvent extends Event {
    config?: {
        bet?: BetConfig;
    }
    eventDetails: MarbleEventDetail[];
}

export interface Market {
    selections: Selection[];
    hedgeBetExclusion?: string[];
}

interface Selection {
    betChoice: string;
    price?: number;
    point?: number;
    settlementStatus: string;
}

export type MarbleEventDetail = EventDetail & {
    markets: Market[];
    result: {
        finalScore: string;
        goalSequence: string;
    };
}