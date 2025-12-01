import { isEventEnded } from "../../../src/helpers/timing-helper";
import { MarbleEvent } from "../../../src/features/shared-types";

describe("isEventEnded", () => {
    
    it("true if no event details", () => {
        const event = {} as unknown as MarbleEvent;
        const now = Date.now();
        
        const result = isEventEnded({ event, now });
        
        expect(result).toBe(true);
    });

    it("true if event details is empty", () => {
        const event = {
            eventDetails: []
        } as unknown as MarbleEvent;
        const now = Date.now();
        
        const result = isEventEnded({ event, now });
        
        expect(result).toBe(true);
    });
    
    it("true if now is after scheduleEndTs", () => {
        const scheduleEndTs = new Date("2024-01-01T12:00:00Z").toISOString();
        const now = new Date("2024-01-01T13:00:00Z").getTime();
        
        const event = {
            eventDetails: [{}],
            scheduleEndTs
        } as unknown as MarbleEvent;
        
        const result = isEventEnded({ event, now });
        
        expect(result).toBe(true);
    });

    it("false if now is before scheduleEndTs", () => {
        const scheduleEndTs = new Date("2024-01-01T12:00:00Z").toISOString();
        const now = new Date("2024-01-01T11:00:00Z").getTime();
        
        const event = {
            eventDetails: [{}],
            scheduleEndTs
        } as unknown as MarbleEvent;
        
        const result = isEventEnded({ event, now });
        
        expect(result).toBe(false);
    });
});