import { results } from "../../../src/models";
import { mongo } from "mongoose";

describe("Results", () => {
    describe("when create the new instance of Results", () => {
        afterEach(() => {
            jest.useRealTimers();
            jest.clearAllMocks();
        });
        it("should create a result with default properties", () => {
            // Arrange
            const mockId = new mongo.ObjectId("672452f978c8cd0e08122643");
            const today = new Date("2024-01-01");

            jest.useFakeTimers().setSystemTime(today);

            const expected = {
                _id: mockId,
                time: today,
            };

            // Act
            const actual = new results({ _id: "672452f978c8cd0e08122643" });

            // Assert
            expect(actual.toObject()).toStrictEqual(expected);
        });

        it("should verify the required properties", () => {
            // Arrange
            const actual = new results({});

            // Act
            const error = actual.validateSync() as any;

            // Assert
            expect(error.message).toBe(`marblefootball2_results validation failed: roundId: Path \`roundId\` is required.`);
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

            const { results } = await import("../../../src/models");

            // Act
            const model = new results({});

            // Assert
            expect(model.collection.name).toBe("marblefootball2_dev_results");
        });

        it("should not have _dev suffix in production environment", async () => {
            // Arrange
            process.env.NODE_ENV = "production";

            const { results } = await import("../../../src/models");

            // Act
            const model = new results({});

            // Assert
            expect(model.collection.name).toBe("marblefootball2_results");
        });

        it("should handle undefined environment as production", async () => {
            // Arrange
            delete process.env.NODE_ENV;

            const { results } = await import("../../../src/models");

            // Act
            const model = new results({});

            // Assert
            expect(model.collection.name).toBe("marblefootball2_results");
        });
    });
});
