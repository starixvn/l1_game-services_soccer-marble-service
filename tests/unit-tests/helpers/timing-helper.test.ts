import { isEventEnded } from "../../../src/helpers/timing-helper";
import { Event } from "odds-feed-client";

describe("isEventEnded", () => {
    
    it("true if no event details", () => {
        const event = {} as unknown as Event;
        const now = Date.now();
        
        const result = isEventEnded({ event, now });
        
        expect(result).toBe(true);
    });

    it("true if event details is empty", () => {
        const event = {
            eventDetails: []
        } as unknown as Event;
        const now = Date.now();
        
        const result = isEventEnded({ event, now });
        
        expect(result).toBe(true);
    });
    
    it("true if now passed last event detail result available", () => {
        const firstResultsAvailableTs = new Date("2024-01-01T10:00:00Z").toISOString();
        const lastResultsAvailableTs = new Date("2024-01-01T12:00:00Z").toISOString();
        const now = new Date("2024-01-01T13:00:00Z").getTime();
        
        const event = {
            eventDetails: [
                {
                    resultsAvailableTs: firstResultsAvailableTs
                },
                {
                    resultsAvailableTs: lastResultsAvailableTs
                }
            ]
        } as unknown as Event;
        
        const result = isEventEnded({ event, now });
        
        expect(result).toBe(true);
    });

    it("false if now is before last event detail result available", () => {
        const firstResultsAvailableTs = new Date("2024-01-01T10:00:00Z").toISOString();
        const lastResultsAvailableTs = new Date("2024-01-01T12:00:00Z").toISOString();
        const now = new Date("2024-01-01T11:00:00Z").getTime();
        
        const event = {
            eventDetails: [
                {
                    resultsAvailableTs: firstResultsAvailableTs
                },
                {
                    resultsAvailableTs: lastResultsAvailableTs
                }
            ]
        } as unknown as Event;
        
        const result = isEventEnded({ event, now });
        
        expect(result).toBe(false);
    });
});