import gameSettings from "../../src/game-settings";
import { BET_CHOICES } from "../../src/constants";

describe("gameSettings", () => {
    it("should have the correct id", () => {
        expect(gameSettings.id).toBe(114);
    });

    it("should have the correct name", () => {
        expect(gameSettings.name).toBe("MarbleFootball2");
    });

    it("should have the correct configName", () => {
        expect(gameSettings.configName).toBe("marblefootball2");
    });

    it("durations should be in the correct order", () => {
        const {
            wholeRound,
            startingRound,
            placingBetsFirstHalf,
            lockingBetFirstHalf,
            streamingVideoFirstHalf,
            placingBetsSecondHalf,
            lockingBetSecondHalf,
            streamingVideoSecondHalf,
        } = gameSettings.durations;

        expect(wholeRound).toBeGreaterThan(startingRound);
        expect(startingRound).toBeGreaterThan(placingBetsFirstHalf);
        expect(placingBetsFirstHalf).toBeGreaterThan(lockingBetFirstHalf);
        expect(lockingBetFirstHalf).toBeGreaterThan(streamingVideoFirstHalf);
        expect(wholeRound).toBeGreaterThan(placingBetsSecondHalf);
        expect(placingBetsSecondHalf).toBeGreaterThan(lockingBetSecondHalf);
        expect(lockingBetSecondHalf).toBeGreaterThan(streamingVideoSecondHalf);
    });

    it("should have the correct choices", () => {
        expect(gameSettings.choices).toEqual(Object.values(BET_CHOICES));
    });

    it("should have the correct choicesMapper", () => {
        expect(gameSettings.choicesMapper).toEqual({
            [BET_CHOICES.home]: 1,
            [BET_CHOICES.away]: 2,
            [BET_CHOICES.draw]: 3,
            [BET_CHOICES.over]: 4,
            [BET_CHOICES.under]: 5,
            [BET_CHOICES.odd]: 6,
            [BET_CHOICES.even]: 7,
            [BET_CHOICES.homeLive]: 8,
            [BET_CHOICES.awayLive]: 9,
            [BET_CHOICES.drawLive]: 10,
            [BET_CHOICES.overLive]: 11,
            [BET_CHOICES.underLive]: 12,
            [BET_CHOICES.oddLive]: 13,
            [BET_CHOICES.evenLive]: 14,
        });
    });

    it("should have the correct hedgeBetGroups", () => {
        expect(gameSettings.hedgeBetGroups).toEqual([
            [BET_CHOICES.home, BET_CHOICES.away],
            [BET_CHOICES.over, BET_CHOICES.under],
            [BET_CHOICES.odd, BET_CHOICES.even],
            [BET_CHOICES.homeLive, BET_CHOICES.awayLive],
            [BET_CHOICES.overLive, BET_CHOICES.underLive],
            [BET_CHOICES.oddLive, BET_CHOICES.evenLive],
        ]);
    });

    it("should have provablyFair set to false", () => {
        expect(gameSettings.provablyFair).toBe(false);
    });

    it("should have the correct historyPageSize", () => {
        expect(gameSettings.historyPageSize).toBe(8);
    });

    it("should have the correct defaultBetTracks", () => {
        expect(gameSettings.defaultBetTracks).toEqual({});
    });

    it("should have the correct botSettings", () => {
        expect(gameSettings.botSettings).toEqual({
            ratio: { mainPreOpts: 40, mainLiveOpts: 40, subPreOpts: 10, subLiveOpts: 10 },
            mainPreOpts: [BET_CHOICES.home, BET_CHOICES.away],
            mainLiveOpts: [BET_CHOICES.homeLive, BET_CHOICES.awayLive],
            subPreOpts: [BET_CHOICES.over, BET_CHOICES.under, BET_CHOICES.odd, BET_CHOICES.even, BET_CHOICES.draw],
            subLiveOpts: [BET_CHOICES.overLive, BET_CHOICES.underLive, BET_CHOICES.oddLive, BET_CHOICES.evenLive, BET_CHOICES.drawLive],
        });
    });
});
