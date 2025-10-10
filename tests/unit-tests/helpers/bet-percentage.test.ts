import { getUserBetPercentage } from "../../../src/helpers/bet-percentage";

describe("bet-percentage helper", () => {
    it("should return 0 percentages when total is 0", () => {
        const playerBetCount = { home: [], away: [] } as Record<string, string[]>;
        const betChoices = ["home", "away"];
        const res = getUserBetPercentage(playerBetCount, betChoices);
        expect(res).toEqual({ home: 0, away: 0 });
    });

    it("should compute rounded percentages correctly", () => {
        const playerBetCount = {
            home: ["u1", "u2", "u3"],
            away: ["u4"],
            draw: ["u5", "u6"],
        } as Record<string, string[]>;
        const betChoices = ["home", "away", "draw"];
        const res = getUserBetPercentage(playerBetCount, betChoices);
        expect(res).toEqual({ home: 50, away: 17, draw: 33 });
    });

    it("should handle missing choice arrays and treat them as 0", () => {
        const playerBetCount = {
            home: ["u1"],
        } as Record<string, string[]>;
        const betChoices = ["home", "away"];
        const res = getUserBetPercentage(playerBetCount, betChoices);
        expect(res).toEqual({ home: 100, away: 0 });
    });
});


