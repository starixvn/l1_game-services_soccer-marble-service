import gameSettings from "../../src/game-settings";

describe("gameSettings", () => {
    it("should have the correct id", () => {
        expect(gameSettings.id).toBe(158);
    });

    it("should have the correct name", () => {
        expect(gameSettings.name).toBe("Marbles158");
    });

    it("should have the correct configName", () => {
        expect(gameSettings.configName).toBe("marbles158");
    });

    it("should have the correct hedgeBetGroups", () => {
        expect(gameSettings.hedgeBetGroups).toEqual([
            ["ft_hdp_home", "ft_hdp_away"],
            ["h1_hdp_home", "h1_hdp_away"],
            ["ft_ou_over", "ft_ou_under"],
            ["h1_ou_over", "h1_ou_under"],
            ["ft_oe_even", "ft_oe_odd"],
            ["h1_oe_even", "h1_oe_odd"],
            ["ft_1x2_home", "ft_1x2_away"],
            ["h1_1x2_home", "h1_1x2_away"],
        ]);
    });

    it("should have provablyFair set to false", () => {
        expect(gameSettings.provablyFair).toBe(false);
    });

    it("should have the correct historyPageSize", () => {
        expect(gameSettings.historyPageSize).toBe(12);
    });

    it("should have the correct defaultBetTracks", () => {
        expect(gameSettings.defaultBetTracks).toEqual({});
    });

    it("should have the correct botSettings", () => {
        expect(gameSettings.botSettings).toEqual({
            ratio: { main: 80, side: 20 },
        });
    });
});
