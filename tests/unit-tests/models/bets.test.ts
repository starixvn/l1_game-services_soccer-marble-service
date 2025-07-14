import { bets } from "../../../src/models";
import { mongo } from "mongoose";

describe("Bets", () => {
    describe("when create the new instance of Bet", () => {
        it("should create a bet with default properties", () => {
            // Arrange
            const mockId = new mongo.ObjectId("672452f978c8cd0e08122643");

            const expected = {
                _id: mockId,
                betwin: 0,
                freeBet: false,
                paid: false,
                totalAmount: 0,
                home: 0,
                away: 0,
                draw: 0,
                over: 0,
                under: 0,
                odd: 0,
                even: 0,
                homeLive: 0,
                awayLive: 0,
                drawLive: 0,
                overLive: 0,
                underLive: 0,
                oddLive: 0,
                evenLive: 0,
            };

            // Act
            const actual = new bets({ _id: "672452f978c8cd0e08122643" });

            // Assert
            expect(actual.toObject()).toStrictEqual(expected);
        });

        it("should verify the required properties", () => {
            // Arrange
            const actual = new bets({});

            // Act
            const error = actual.validateSync() as any;

            // Assert
            expect(error.message).toBe(
                `marblefootball2_bets validation failed: rate: Path \`rate\` is required., name: Path \`name\` is required., uid: Path \`uid\` is required., roundId: Path \`roundId\` is required.`,
            );
        });
    });

    describe("modelName property", () => {
        const originalEnv = process.env;

        beforeEach(() => {
            jest.resetModules();
            process.env = { ...originalEnv };
        });

        afterEach(() => {
            process.env = originalEnv;
        });
        it("should have _dev in development environment", async () => {
            // Arrange
            process.env.NODE_ENV = "development";

            const { bets } = await import("../../../src/models");

            // Act
            const model = new bets({});

            // Assert
            expect(model.collection.name).toBe("marblefootball2_dev_bets");
        });

        it("should not have _dev suffix in production environment", async () => {
            // Arrange
            process.env.NODE_ENV = "production";

            const { bets } = await import("../../../src/models");

            // Act
            const model = new bets({});

            // Assert
            expect(model.collection.name).toBe("marblefootball2_bets");
        });

        it("should handle undefined environment as production", async () => {
            // Arrange
            delete process.env.NODE_ENV;

            const { bets } = await import("../../../src/models");

            // Act
            const model = new bets({});

            // Assert
            expect(model.collection.name).toBe("marblefootball2_bets");
        });
    });
});
