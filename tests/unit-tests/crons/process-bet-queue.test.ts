jest.mock("sc-game-base/src/table/crons", () => ({
    TableProcessBetQueue: class {
        constructor(container: any) {
            Object.assign(this, container);
        }
        adjustTotalBets() {}
    }
}));
import ProcessBetQueue from "../../../src/crons/process-bet-queue";

describe("ProcessBetQueue", () => {
    let cron: any;

    beforeEach(() => {
        cron = Object.create(ProcessBetQueue.prototype);
        cron.gameData = { roundId: 10, playerBetCount: {} };
        cron.definition = { choices: ["home", "away", "draw"] };
        cron.betStatusService = {
            betStatusByGameId: { "0": true, "10": true },
            dynamicOddsByGameId: { "0": { home: 2, away: 3 }, "10": { home: 2, away: 3 } },
            betChoicePointsByGameId: { "0": { home: 1, away: 2 }, "10": { home: 1, away: 2 } },
        };
        cron.betsRepository = { updateOne: jest.fn().mockResolvedValue(undefined) };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("adjustTotalBets", () => {
        it("should call super and adjust player bet count", () => {
            const superSpy = jest.spyOn(Object.getPrototypeOf(ProcessBetQueue.prototype), "adjustTotalBets").mockImplementation(() => {});
            const player = { UID: "u1" };
            const bet = { betChoice: "home" } as any;
            cron.adjustPlayerBetCount = jest.fn();

            cron.adjustTotalBets(player, bet, 1.2);

            expect(superSpy).toHaveBeenCalled();
            expect(cron.adjustPlayerBetCount).toHaveBeenCalledWith(player, "home");
        });
    });

    describe("constructor", () => {
        it("should set betStatusService from container", () => {
            const container = { betStatusService: { tag: "betsvc" }, gameData: {}, definition: {} } as any;
            const instance = new ProcessBetQueue(container) as any;
            expect(instance.betStatusService).toBe(container.betStatusService);
        });
    });

    describe("adjustPlayerBetCount", () => {
        it("should add player to bet choice when valid and not duplicate", () => {
            const player = { UID: "u1" };
            cron.adjustPlayerBetCount(player, "home");
            expect(cron.gameData.playerBetCount.home).toEqual(["u1"]);

            // Duplicate add should not repeat
            cron.adjustPlayerBetCount(player, "home");
            expect(cron.gameData.playerBetCount.home).toEqual(["u1"]);
        });

        it("should ignore invalid bet choices", () => {
            const player = { UID: "u2" };
            cron.adjustPlayerBetCount(player, "invalid");
            expect(cron.gameData.playerBetCount.invalid).toBeUndefined();
        });
    });

    describe("composeBettingTimeValidationCriteria", () => {
        it("should fail when roundId mismatches current gameData.roundId", () => {
            const result = cron.composeBettingTimeValidationCriteria(11);
            expect(result[0].failure).toBe(true);
            expect(result[0].notice.errorCode).toBe("SB1905");
        });

        it("should fail when bet status by game id is false", () => {
            cron.betStatusService.betStatusByGameId = { "10": false };
            const result = cron.composeBettingTimeValidationCriteria(10);
            expect(result[1].failure).toBe(true);
            expect(result[1].notice.errorCode).toBe("SB1905");
        });

        it("should pass when roundId matches and bet status true", () => {
            const result = cron.composeBettingTimeValidationCriteria(10);
            expect(result[0].failure).toBe(false);
            expect(result[1].failure).toBe(false);
        });
    });

    describe("upsertBet", () => {
        it("should upsert bet with odds set and session fields", async () => {
            const player = {
                UID: "u3",
                profile: { name: "foo" },
                session: { siteId: "s1", currencyName: "USD", operatorId: "op", playerId: "p1" },
            };
            const bet = {
                amount: 100,
                betChoice: "home",
                roundId: 10,
                clientSeed: new Date(),
                freeBet: false,
                index: 0,
            };
            const rate = 1.23;

            const time = await cron.upsertBet(player, 10, bet, rate);

            expect(cron.betsRepository.updateOne).toHaveBeenCalledWith(
                { uid: "u3", roundId: 10, freeBet: false },
                {
                    $inc: { "0.home": 100, totalAmount: 100 },
                    $setOnInsert: expect.objectContaining({
                        uid: "u3",
                        name: "foo",
                        siteId: "s1",
                        currency: "USD",
                        rate: 1.23,
                        operatorId: "op",
                        playerId: "p1",
                        freeBet: false,
                        roundId: 10,
                    }),
                    $set: {
                        "odds.0.home": { price: 2, point: 1 },
                        "odds.0.away": { price: 3, point: 2 },
                    },
                },
                { upsert: true, setDefaultsOnInsert: true },
            );
            expect(time).toBeInstanceOf(Date);
        });

        it("should upsert bet without odds when odds are missing", async () => {
            cron.betStatusService.dynamicOddsByGameId = {};
            const player = { UID: "u4", profile: { name: "bar" }, session: null };
            const bet = { amount: 50, betChoice: "away", roundId: 10, clientSeed: new Date(), index: 1 } as any;

            await cron.upsertBet(player, 10, bet, 1.0);
            expect(cron.betsRepository.updateOne).toHaveBeenCalledWith(
                { uid: "u4", roundId: 10, freeBet: undefined },
                {
                    $inc: { "1.away": 50, totalAmount: 50 },
                    $setOnInsert: expect.objectContaining({
                        uid: "u4",
                        name: "bar",
                        roundId: 10,
                        freeBet: undefined,
                    }),
                    $set: {},
                },
                { upsert: true, setDefaultsOnInsert: true },
            );
        });
    });
});


