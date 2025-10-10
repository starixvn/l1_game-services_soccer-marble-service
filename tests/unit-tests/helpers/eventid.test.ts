import { createEventId, extractGameId, extractRoundId } from "../../../src/helpers/eventid";

describe("helpers/eventid", () => {
    describe("createEventId / extractGameId / extractRoundId", () => {
        it("should create event id and extract back gameId and roundId", () => {
            const pairs = [
                { gameId: 0, roundId: 0 },
                { gameId: 1, roundId: 1 },
                { gameId: 123, roundId: 456789 },
                { gameId: 65535, roundId: 4294967295 - 1 }, // max valid - 1
            ];

            for (const { gameId, roundId } of pairs) {
                const eventId = createEventId(gameId, roundId);
                expect(extractGameId(eventId)).toBe(gameId);
                expect(extractRoundId(eventId)).toBe(roundId);
            }
        });

        it("should throw when gameId out of range (>= 2^16)", () => {
            expect(() => createEventId(2 ** 16, 1)).toThrow("gameId out of range");
        });

        it("should throw when roundId out of range (>= 2^32)", () => {
            expect(() => createEventId(1, 2 ** 32)).toThrow("roundId out of range");
        });
    });
});


