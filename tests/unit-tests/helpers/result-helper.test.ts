import {
    generateResult,
    generateResultFromAdminRawResult,
    getSettlementResult,
    generateRawResultForHash,
    getLastSettlementResult,
    combineFinalResult,
} from "../../../src/helpers/result-helper";
import { Result, SettlementResult } from "../../../src/models/rounds";

describe("helpers/result-helper", () => {
    it("generateResult should return empty result object shape", () => {
        const res = generateResult();
        expect(res).toEqual({});
    });

    it("generateResultFromAdminRawResult should return a shallow copy of input (empty shape)", () => {
        const input: any = {};
        const res = generateResultFromAdminRawResult(input);
        expect(res).toEqual({});
    });

    it("getSettlementResult should return empty map for settlement when no markets", () => {
        const round = { markets: [] } as any;
        const result = getSettlementResult(round);
        expect(result).toEqual({});
    });

    it("generateRawResultForHash exists and is callable", () => {
        expect(() => generateRawResultForHash()).not.toThrow();
    });

    describe("getLastSettlementResult", () => {
        it("should return empty object when settlementResult is empty", () => {
            const settlementResult: SettlementResult = {};
            const result = getLastSettlementResult(settlementResult);
            expect(result).toEqual({});
        });

        it("should return the only entry when settlementResult has one entry", () => {
            const settlementResult: SettlementResult = {
                1: { home: true, away: false, draw: false },
            };
            const result = getLastSettlementResult(settlementResult);
            expect(result).toEqual({ home: true, away: false, draw: false });
        });

        it("should return the last entry when settlementResult has multiple entries", () => {
            const settlementResult: SettlementResult = {
                1: { home: true, away: false, draw: false },
                2: { home: false, away: true, draw: false },
                3: { home: true, away: false, draw: false },
            };
            const result = getLastSettlementResult(settlementResult);
            expect(result).toEqual({ home: true, away: false, draw: false });
        });
    });

    describe("combineFinalResult", () => {
        it("should return '0:0' when result is empty", () => {
            const result: Result = {};
            const combined = combineFinalResult(result);
            expect(combined).toBe("0:0");
        });

        it("should return the same score when result has one entry", () => {
            const result: Result = {
                1: { phase: 1, result: "2:1" },
            };
            const combined = combineFinalResult(result);
            expect(combined).toBe("2:1");
        });

        it("should sum scores correctly when result has multiple entries", () => {
            const result: Result = {
                1: { phase: 1, result: "1:0" },
                2: { phase: 2, result: "2:1" },
                3: { phase: 3, result: "0:2" },
            };

            const combined = combineFinalResult(result);
            expect(combined).toBe("3:3");
        });

        it("should handle result with different phases correctly", () => {
            const result: Result = {
                1: { phase: 1, result: "1:0" },
                2: { phase: 2, result: "2:1" },
                3: { phase: 3, result: "0:2" },
            };
            const combined = combineFinalResult(result);
            expect(combined).toBe("3:3");
        });

        it("should handle large scores correctly", () => {
            const result: Result = {
                1: { phase: 1, result: "5:3" },
                2: { phase: 2, result: "4:2" },
                3: { phase: 3, result: "1:5" },
            };
            const combined = combineFinalResult(result);
            expect(combined).toBe("10:10");
        });

        it("should handle zero scores correctly", () => {
            const result: Result = {
                1: { phase: 1, result: "0:0" },
                2: { phase: 2, result: "0:0" },
                3: { phase: 3, result: "0:0" },
            };
            const combined = combineFinalResult(result);
            expect(combined).toBe("0:0");
        });
    });
});
