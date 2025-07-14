import { BET_CHOICES, LIVE_BET_CHOICES, PRE_MATCH_BET_CHOICES } from "../../../src/constants";
import {
    parseScore,
    roundToPrecision,
    calculateFullTimeScoreRates,
    calculateProbabilitiesForBetChoices,
    calculateBetOdds,
    probabilityToBetOdds,
    calculatePreMatchOdds,
    calculateLiveOdds,
    calculateMarginFromOdds,
} from "../../../src/helpers/odds-helper";
import { HalfConfigType, MatchConfigType } from "../../../src/match-configs";

jest.mock("../../../src/constants", () => ({
    ...jest.requireActual("../../../src/constants"),
    DEFAULT_MARGIN_BASE: 0,
}));

describe("odds-helper", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("parseScore", () => {
        it("should correctly parse score string into numbers", () => {
            expect(parseScore("2-1")).toEqual([2, 1]);
            expect(parseScore("0-0")).toEqual([0, 0]);
            expect(parseScore("5-3")).toEqual([5, 3]);
        });
    });

    describe("roundToPrecision", () => {
        it("should round numbers to specified precision", () => {
            expect(roundToPrecision(1.23456789)).toBe(1.23457);
            expect(roundToPrecision(2.5)).toBe(2.5);
            expect(roundToPrecision(3.14159, 1000)).toBe(3.142);
        });
    });

    describe("calculateFullTimeScoreRates", () => {
        const mockFirstHalf: HalfConfigType = {
            scoreRate: {
                "1-0": 0.5,
                "0-1": 0.5,
            },
        };

        const mockSecondHalf: HalfConfigType = {
            scoreRate: {
                "1-0": 0.5,
                "0-1": 0.5,
            },
        };

        it("should correctly combine first and second half scores", () => {
            const result = calculateFullTimeScoreRates(mockFirstHalf, mockSecondHalf);
            expect(result["2-0"]).toBe(0.25);
            expect(result["1-1"]).toBe(0.5);
            expect(result["0-2"]).toBe(0.25);
        });
    });

    describe("calculateProbabilitiesForBetChoices", () => {
        const mockScoreRates = {
            "1-0": 0.4,
            "0-1": 0.3,
            "1-1": 0.2,
            "3-3": 0.1,
        };

        it("should calculate correct probabilities for all bet choices", () => {
            const result = calculateProbabilitiesForBetChoices(mockScoreRates);
            const { probabilities } = result;

            expect(probabilities.home).toBeCloseTo(0.4);
            expect(probabilities.away).toBeCloseTo(0.3);
            expect(probabilities.draw).toBeCloseTo(0.3);
            expect(probabilities.over).toBeCloseTo(0.1);
            expect(probabilities.under).toBeCloseTo(0.9);
            expect(probabilities.even).toBeCloseTo(0.3);
            expect(probabilities.odd).toBeCloseTo(0.7);
        });

        it("should handle adding score correctly", () => {
            const result = calculateProbabilitiesForBetChoices(mockScoreRates, "1-1");
            const { probabilities } = result;

            expect(probabilities.home).toBeCloseTo(0.4);
            expect(probabilities.away).toBeCloseTo(0.3);
            expect(probabilities.draw).toBeCloseTo(0.3);
        });
    });

    describe("probabilityToBetOdds", () => {
        it("should convert probability to betting odds correctly", () => {
            expect(probabilityToBetOdds(0.5)).toBe(2);
            expect(probabilityToBetOdds(0.25)).toBe(4);
            expect(probabilityToBetOdds(0.1)).toBe(10);
        });

        it("should apply margin correctly", () => {
            expect(probabilityToBetOdds(0.5, 0.1)).toBe(1.8);
        });

        it("should round odds correctly", () => {
            expect(probabilityToBetOdds(0.039)).toBe(25.64);
        });

        it("should return 0 for probability <= 0", () => {
            expect(probabilityToBetOdds(0)).toBe(0);
        });

        it("should return 0 for probability >= 1", () => {
            expect(probabilityToBetOdds(1)).toBe(0);
        });
    });

    describe("calculateBetOdds", () => {
        const mockProbabilities = {
            [BET_CHOICES.home]: 0.5,
            [BET_CHOICES.away]: 0.05,
            [BET_CHOICES.homeLive]: 0.5,
            [BET_CHOICES.awayLive]: 0.05,
        };

        afterEach(() => {
            jest.spyOn(require("../../../src/helpers/odds-helper"), "calculateMarginFromOdds").mockRestore();
        });

        it("should call calculateMarginFromOdds with correct default margin", () => {
            // Arrange
            const calculateMarginSpy = jest
                .spyOn(require("../../../src/helpers/odds-helper"), "calculateMarginFromOdds")
                .mockReturnValue(0);

            // Act
            calculateBetOdds(mockProbabilities);

            // Assert
            expect(calculateMarginSpy).toHaveBeenCalledWith(2, 0);
        });

        it("should calculate betting odds with margin correctly", () => {
            // Arrange
            const calculateMarginSpy = jest
                .spyOn(require("../../../src/helpers/odds-helper"), "calculateMarginFromOdds")
                .mockReturnValue(0);

            // Act
            calculateBetOdds(mockProbabilities, [
                { max: 5, home: 0.02, away: 0.02, homeLive: 0.02, awayLive: 0.02 },
                { max: 99, home: 0.05, away: 0.05, homeLive: 0.05, awayLive: 0.05 },
            ]);

            // Assert
            expect(calculateMarginSpy).toHaveBeenNthCalledWith(1, 2, 0.02);
            expect(calculateMarginSpy).toHaveBeenNthCalledWith(2, 20, 0.05);
            expect(calculateMarginSpy).toHaveBeenNthCalledWith(3, 2, 0.02);
            expect(calculateMarginSpy).toHaveBeenNthCalledWith(4, 20, 0.05);
        });
    });

    describe("calculateMarginFromOdds", () => {
        beforeEach(() => {
            jest.spyOn(require("../../../src/helpers/odds-helper"), "calculateMarginFromOdds").mockRestore();
        });

        const testCases = [
            { odds: 2, margin: 0.02 },
            { odds: 4, margin: 0.04 },
            { odds: 8, margin: 0.06 },
            { odds: 16, margin: 0.08 },
            { odds: 32, margin: 0.1 },
        ];

        const marginBase = 0.02;

        testCases.forEach((testCase) => {
            it(`should return margin correctly for odds ${testCase.odds}`, () => {
                // Act
                const result = calculateMarginFromOdds(testCase.odds, marginBase);

                // Assert
                expect(result).toBe(testCase.margin);
            });
        });

        it("should return 0 for odds === 0", () => {
            const result = calculateMarginFromOdds(0, marginBase);
            expect(result).toBe(0);
        });

        it("should return 1 for when calculated margin is greater than 1", () => {
            const result = calculateMarginFromOdds(2000, 0.1);
            expect(result).toBe(1);
        });
    });

    describe("calculatePreMatchOdds", () => {
        const mockMatchConfig: MatchConfigType = {
            firstHalfConfig: {
                scoreRate: {
                    "1-0": 0.5,
                    "0-1": 0.5,
                },
            },
            secondHalfConfig: {
                scoreRate: {
                    "1-0": 0.5,
                    "0-1": 0.5,
                },
            },
        };

        it("should return odds for all bet choices", () => {
            const result = calculatePreMatchOdds(mockMatchConfig);

            console.log(result);

            expect(result[PRE_MATCH_BET_CHOICES.home]).toBeCloseTo(4);
            expect(result[PRE_MATCH_BET_CHOICES.away]).toBeCloseTo(4);
            expect(result[PRE_MATCH_BET_CHOICES.draw]).toBeCloseTo(2);
            expect(result[PRE_MATCH_BET_CHOICES.over]).toBe(0);
            expect(result[PRE_MATCH_BET_CHOICES.under]).toBe(0);
            expect(result[PRE_MATCH_BET_CHOICES.even]).toBe(0);
            expect(result[PRE_MATCH_BET_CHOICES.odd]).toBe(0);
        });
    });

    describe("calculateLiveOdds", () => {
        const mockHalfConfig: HalfConfigType = {
            scoreRate: {
                "1-0": 0.4,
                "0-1": 0.3,
                "0-2": 0.2,
                "2-2": 0.1,
            },
        };

        it("should return odds correctly for all bet choices", () => {
            const result = calculateLiveOdds(mockHalfConfig, "H", []) as any;

            expect(result[LIVE_BET_CHOICES.homeLive]).toBeCloseTo(2);
            expect(result[LIVE_BET_CHOICES.awayLive]).toBeCloseTo(5);
            expect(result[LIVE_BET_CHOICES.drawLive]).toBeCloseTo(3.33);
            expect(result[LIVE_BET_CHOICES.overLive]).toBeCloseTo(10);
            expect(result[LIVE_BET_CHOICES.underLive]).toBeCloseTo(1.11);
            expect(result[LIVE_BET_CHOICES.evenLive]).toBeCloseTo(1.43);
            expect(result[LIVE_BET_CHOICES.oddLive]).toBeCloseTo(3.33);
        });
    });
});
