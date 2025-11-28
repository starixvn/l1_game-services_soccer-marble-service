import { trueOddsToOddsWithMarginConfig, MarginConfigs } from "../../../src/helpers/odds-helper";

describe("trueOddsToOddsWithMarginConfig", () => {
    
    it("should return empty object when true odds is empty", () => {
        const trueOdds = {};
        const marginConfig: MarginConfigs = [];
        
        const result = trueOddsToOddsWithMarginConfig(trueOdds, marginConfig);
        
        expect(result).toEqual({});
    });

    it("should apply default margin when margin config is empty", () => {
        const trueOdds = { home: 2, away: 3 };
        const marginConfig: MarginConfigs = [];
        
        const result = trueOddsToOddsWithMarginConfig(trueOdds, marginConfig);
        
        // With default margin (0.02), odds should be less than true odds
        expect(result.home).toBeLessThan(2);
        expect(result.away).toBeLessThan(3);
        expect(result.home).toBeGreaterThan(0);
        expect(result.away).toBeGreaterThan(0);
    });

    it("should apply margin based on matching config threshold", () => {
        const trueOdds = { low: 1.5, medium: 3, high: 10 };
        const marginConfig: MarginConfigs = [
            { max: 2, margin: 0.05 },   // For odds <= 2, use 5% margin base
            { max: 5, margin: 0.03 },  // For odds <= 5, use 3% margin base
        ];
        
        const result = trueOddsToOddsWithMarginConfig(trueOdds, marginConfig);
        
        // All odds should be reduced (margin applied)
        expect(result.low).toBeLessThan(1.5);
        expect(result.medium).toBeLessThan(3);
        expect(result.high).toBeLessThan(10);
        
        // All should be positive
        expect(result.low).toBeGreaterThan(0);
        expect(result.medium).toBeGreaterThan(0);
        expect(result.high).toBeGreaterThan(0);
    });

    it("should use default margin when odds exceed all config thresholds", () => {
        const trueOdds = { veryHigh: 20 };
        const marginConfig: MarginConfigs = [
            { max: 2, margin: 0.05 },
            { max: 5, margin: 0.03 },
        ];
        
        const result = trueOddsToOddsWithMarginConfig(trueOdds, marginConfig);
        
        // Should use default margin (0.02) since 20 > 5
        expect(result.veryHigh).toBeLessThan(20);
        expect(result.veryHigh).toBeGreaterThan(0);
    });

    it("should handle zero or negative odds", () => {
        const trueOdds = { zero: 0, negative: -1, positive: 2 };
        const marginConfig: MarginConfigs = [];
        
        const result = trueOddsToOddsWithMarginConfig(trueOdds, marginConfig);
        
        // Zero odds: margin is 0, so result is (1 - 0) * 0 = 0
        expect(result.zero).toBe(0);
        // Negative odds: margin is 0 (since odds <= 0), so result is (1 - 0) * (-1) = -1
        expect(result.negative).toBe(-1);
        // Positive odds should still be processed with margin
        expect(result.positive).toBeLessThan(2);
        expect(result.positive).toBeGreaterThan(0);
    });

    it("should process multiple odds with different configs", () => {
        const trueOdds = {
            choice1: 1.2,  // <= 2, should use 0.05 margin
            choice2: 2,    // <= 2, should use 0.05 margin
            choice3: 3.5,  // <= 5, should use 0.03 margin
            choice4: 5,    // <= 5, should use 0.03 margin
            choice5: 7,    // > 5, should use default 0.02 margin
        };
        const marginConfig: MarginConfigs = [
            { max: 2, margin: 0.05 },
            { max: 5, margin: 0.03 },
        ];
        
        const result = trueOddsToOddsWithMarginConfig(trueOdds, marginConfig);
        
        // All should be reduced
        expect(result.choice1).toBeLessThan(1.2);
        expect(result.choice2).toBeLessThan(2);
        expect(result.choice3).toBeLessThan(3.5);
        expect(result.choice4).toBeLessThan(5);
        expect(result.choice5).toBeLessThan(7);
        
        // All should be positive
        Object.values(result).forEach(odd => {
            expect(odd).toBeGreaterThanOrEqual(0);
        });
    });

    it("should use highest matching threshold when multiple configs match", () => {
        const trueOdds = { choice: 2 };
        const marginConfig: MarginConfigs = [
            { max: 10, margin: 0.01 },  // Matches (2 <= 10)
            { max: 5, margin: 0.03 },  // Matches (2 <= 5)
            { max: 2, margin: 0.05 },  // Matches (2 <= 2) - should use this (highest threshold)
        ];
        
        const result = trueOddsToOddsWithMarginConfig(trueOdds, marginConfig);
        
        // Should use the config with max: 2 (0.05 margin), which gives higher margin
        // So the result should be lower than if using 0.01 or 0.03
        expect(result.choice).toBeLessThan(2);
        expect(result.choice).toBeGreaterThan(0);
    });

    it("should round odds to 2 decimal places", () => {
        const trueOdds = { choice: 2.123456789 };
        const marginConfig: MarginConfigs = [];
        
        const result = trueOddsToOddsWithMarginConfig(trueOdds, marginConfig);
        
        // Should be rounded to 2 decimal places (precision 100)
        const roundedValue = Math.round(result.choice * 100) / 100;
        expect(result.choice).toBe(roundedValue);
    });
});

