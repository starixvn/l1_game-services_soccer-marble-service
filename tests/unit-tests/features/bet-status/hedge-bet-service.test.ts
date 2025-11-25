import GameData from "../../../../src/game-data";
import { HedgeBetService } from "../../../../src/features/bet-status/hedge-bet-service";

describe("HedgeBetService", () => {
    let service: HedgeBetService;
    let gameData: GameData;

    beforeEach(() => {
        gameData = {
            roundId: 0,
        } as unknown as GameData;
        service = new HedgeBetService({ gameData });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("updateHedgeBetGroups / resetHedgeBetRestriction", () => {
        it("should set groups and reset restrictions", () => {
            const groups = [new Set(["home", "away"]), new Set(["over", "under"])];
            service.updateHedgeBetGroups(groups);
            // Use track to create restriction state then reset
            service.trackHedgeBetRestriction({ player: "p1", betChoice: "home" });
            service.resetHedgeBetRestriction();
            // After reset, verifyHedgeBetRestriction should behave as if nothing is banned
            const res = service.verifyHedgeBetRestriction({ player: "p1", betChoice: "away" });
            expect(Array.from(res)).toEqual([]);
        });
    });

    describe("trackHedgeBetRestriction", () => {
        it("should do nothing when gameId is missing", () => {
            expect(() => service.trackHedgeBetRestriction({ gameId: undefined, player: "p1", betChoice: "home" })).not.toThrow();
        });

        it("should add banned choices for the player's restriction set (coalesce and init paths)", () => {
            // Setup groups and pick a choice; the other choices become banned
            service.updateHedgeBetGroups([new Set(["home", "away"])]);
            service.trackHedgeBetRestriction({ player: "p1", betChoice: "home" });
            const group = service.verifyHedgeBetRestriction({ player: "p1", betChoice: "away" });
            expect(group instanceof Set).toBe(true);
            expect(group.has("home")).toBe(true);
            expect(group.has("away")).toBe(true);
        });

        it("should handle missing group (coalesce to empty Set)", () => {
            // No groups updated yet
            service.trackHedgeBetRestriction({ player: "p2", betChoice: "draw" });
            // Nothing should be banned; verifying should give empty Set
            const group = service.verifyHedgeBetRestriction({ player: "p2", betChoice: "home" });
            expect(Array.from(group)).toEqual([]);
        });
    });

    describe("verifyHedgeBetRestriction", () => {
        it("should return group when player's restriction contains betChoice", () => {
            service.updateHedgeBetGroups([new Set(["home", "away"])]);
            // First track with 'home' so 'away' becomes banned
            service.trackHedgeBetRestriction({ player: "p3", betChoice: "home" });
            const res = service.verifyHedgeBetRestriction({ player: "p3", betChoice: "away" });
            expect(res instanceof Set).toBe(true);
            expect(res.has("home")).toBe(true);
            expect(res.has("away")).toBe(true);
        });

        it("should return empty set when player's restriction does not contain betChoice", () => {
            service.updateHedgeBetGroups([new Set(["home", "away"])]);
            // Track with 'home' so 'away' is banned; check unrelated 'draw'
            service.trackHedgeBetRestriction({ player: "p4", betChoice: "home" });
            const res = service.verifyHedgeBetRestriction({ player: "p4", betChoice: "draw" });
            expect(Array.from(res)).toEqual([]);
        });

        it("should coalesce missing player restriction to empty result", () => {
            service.updateHedgeBetGroups([new Set(["home", "away"])]);
            // Initialize empty restriction map so optional chaining on player kicks in
            service.resetHedgeBetRestriction();
            const res = service.verifyHedgeBetRestriction({ player: "unknown", betChoice: "home" });
            expect(Array.from(res)).toEqual([]);
        });
    });
});


