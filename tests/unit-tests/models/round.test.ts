import { rounds } from "../../../src/models";
import { mongo } from "mongoose";

describe("Round", () => {
    describe("when create the new instance of Round", () => {
        afterEach(() => {
            jest.useRealTimers();
            jest.clearAllMocks();
        });

        it("should create a round with default properties", () => {
            // Arrange
            const mockId = new mongo.ObjectId("672452f978c8cd0e08122643");
            const today = new Date("2024-01-01");

            jest.useFakeTimers().setSystemTime(today);

            const expected = {
                _id: mockId,
                time: today,
            };

            // Act
            const actual = new rounds({ _id: "672452f978c8cd0e08122643" });

            // Assert
            expect(actual.toObject()).toStrictEqual(expected);
        });

        it("should verify the required properties", () => {
            // Arrange
            const actual = new rounds({});

            // Act
            const error = actual.validateSync();

            // Assert
            expect(error.message).toBe(
                `marblefootball2_rounds validation failed: exchangeRateId: Path \`exchangeRateId\` is required., id: Path \`id\` is required.`,
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

            const { rounds } = await import("../../../src/models");

            // Act
            const model = new rounds({});

            // Assert
            expect(model.collection.name).toBe("marblefootball2_dev_rounds");
        });

        it("should not have _dev suffix in production environment", async () => {
            // Arrange
            process.env.NODE_ENV = "production";

            const { rounds } = await import("../../../src/models");

            // Act
            const model = new rounds({});

            // Assert
            expect(model.collection.name).toBe("marblefootball2_rounds");
        });

        it("should handle undefined environment as production", async () => {
            // Arrange
            delete process.env.NODE_ENV;

            const { rounds } = await import("../../../src/models");

            // Act
            const model = new rounds({});

            // Assert
            expect(model.collection.name).toBe("marblefootball2_rounds");
        });
    });
});
