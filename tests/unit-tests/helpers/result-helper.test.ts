import { generateResult, generateResultFromAdminRawResult, getSettlementResult, generateRawResultForHash } from "../../../src/helpers/result-helper";

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
});


