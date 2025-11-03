import { Event, EventDetail } from "odds-feed-client";

export interface MarbleEvent extends Event {
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