import { mongo } from "mongoose";
import { betLogs } from "../../../src/models";

describe("Bet Logs", () => {
    describe("when create the new instance of BetLogs", () => {
        it("should create a bet log with default properties", () => {
            // Arrange
            const mockId = new mongo.ObjectId("672452f978c8cd0e08122643");

            const expected = {
                _id: mockId,
                amount: 0,
                rebet: false,
                roundId: 0,
            };

            // Act
            const actual = new betLogs({ _id: "672452f978c8cd0e08122643" });

            // Assert
            expect(actual.toObject()).toStrictEqual(expected);
        });

        it("should verify the required properties", () => {
            // Arrange
            const actual = new betLogs({});

            // Act
            const error = actual.validateSync() as any;

            // Assert
            expect(error.message).toBe(
                `marblefootball2_betlogs validation failed: operatorId: Path \`operatorId\` is required., rate: Path \`rate\` is required., currency: Path \`currency\` is required., name: Path \`name\` is required., uid: Path \`uid\` is required.`,
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

            const { betLogs } = await import("../../../src/models");

            // Act
            const model = new betLogs({});

            // Assert
            expect(model.collection.name).toBe("marblefootball2_dev_betlogs");
        });

        it("should not have _dev suffix in production environment", async () => {
            // Arrange
            process.env.NODE_ENV = "production";

            const { betLogs } = await import("../../../src/models");

            // Act
            const model = new betLogs({});

            // Assert
            expect(model.collection.name).toBe("marblefootball2_betlogs");
        });

        it("should handle undefined environment as production", async () => {
            // Arrange
            delete process.env.NODE_ENV;

            const { betLogs } = await import("../../../src/models");

            // Act
            const model = new betLogs({});

            // Assert
            expect(model.collection.name).toBe("marblefootball2_betlogs");
        });
    });
});
