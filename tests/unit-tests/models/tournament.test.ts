import { tournaments } from "../../../src/models";
import { mongo } from "mongoose";

describe("Tournament", () => {
    describe("when create the new instance of Tournament", () => {
        afterEach(() => {
            jest.useRealTimers();
            jest.clearAllMocks();
        });
        it("should create a tournament with default properties", () => {
            // Arrange
            const mockId = new mongo.ObjectId("672452f978c8cd0e08122643");
            const today = new Date("2024-01-01");

            jest.useFakeTimers().setSystemTime(today);

            const expected = {
                _id: mockId,
                currentMatch: 0,
                ended: false,
                matches: [],
                time: today,
                code: "code",
            };

            // Act
            const actual = new tournaments({ _id: "672452f978c8cd0e08122643", code: "code" });

            // Assert
            expect(actual.toObject()).toStrictEqual(expected);
        });

        it("should verify the required properties", () => {
            // Arrange
            const actual = new tournaments({});

            // Act
            const error = actual.validateSync();

            // Assert
            expect(error.message).toBe(`marblefootball2_tournaments validation failed: code: Path \`code\` is required.`);
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

            const { tournaments } = await import("../../../src/models");

            // Act
            const model = new tournaments({});

            // Assert
            expect(model.collection.name).toBe("marblefootball2_dev_tournaments");
        });

        it("should not have _dev suffix in production environment", async () => {
            // Arrange
            process.env.NODE_ENV = "production";

            const { tournaments } = await import("../../../src/models");

            // Act
            const model = new tournaments({});

            // Assert
            expect(model.collection.name).toBe("marblefootball2_tournaments");
        });

        it("should handle undefined environment as production", async () => {
            // Arrange
            delete process.env.NODE_ENV;

            const { tournaments } = await import("../../../src/models");

            // Act
            const model = new tournaments({});

            // Assert
            expect(model.collection.name).toBe("marblefootball2_tournaments");
        });
    });
});
