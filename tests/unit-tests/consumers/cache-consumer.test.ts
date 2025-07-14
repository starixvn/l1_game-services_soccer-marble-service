import CacheConsumer from "../../../src/consumers/cache-consumer";
import { CacheableMemory } from "cacheable";

// Mock the CacheableMemory class
jest.mock("cacheable", () => ({
    CacheableMemory: jest.fn().mockImplementation(() => ({
        has: jest.fn(),
        get: jest.fn(),
        set: jest.fn(),
    })),
}));

describe("CacheConsumer", () => {
    let cacheConsumer: CacheConsumer;
    let mockCache: jest.Mocked<CacheableMemory>;

    beforeEach(() => {
        jest.clearAllMocks();
        cacheConsumer = new CacheConsumer();
        mockCache = (cacheConsumer as any).cache;
    });

    describe("get", () => {
        it("should return cached value if key exists", async () => {
            // Arrange
            const key = "test-key";
            const cachedValue = { data: "cached-data" };
            mockCache.has.mockReturnValue(true);
            mockCache.get.mockReturnValue(cachedValue);
            const getFunction = jest.fn();

            // Act
            const result = await cacheConsumer.get(key, getFunction);

            // Assert
            expect(mockCache.has).toHaveBeenCalledWith(key);
            expect(mockCache.get).toHaveBeenCalledWith(key);
            expect(getFunction).not.toHaveBeenCalled();
            expect(result).toBe(cachedValue);
        });

        it("should call getFunction and cache result if key doesn't exist", async () => {
            // Arrange
            const key = "test-key";
            const newValue = { data: "new-data" };
            mockCache.has.mockReturnValue(false);
            const getFunction = jest.fn().mockResolvedValue(newValue);

            // Act
            const result = await cacheConsumer.get(key, getFunction);

            // Assert
            expect(mockCache.has).toHaveBeenCalledWith(key);
            expect(mockCache.get).not.toHaveBeenCalled();
            expect(getFunction).toHaveBeenCalled();
            expect(mockCache.set).toHaveBeenCalledWith(key, newValue, undefined);
            expect(result).toBe(newValue);
        });

        it("should respect ttl option when caching new value", async () => {
            // Arrange
            const key = "test-key";
            const newValue = { data: "new-data" };
            const ttl = 60000; // 1 minute
            mockCache.has.mockReturnValue(false);
            const getFunction = jest.fn().mockResolvedValue(newValue);

            // Act
            const result = await cacheConsumer.get(key, getFunction, { ttl });

            // Assert
            expect(mockCache.set).toHaveBeenCalledWith(key, newValue, ttl);
            expect(result).toBe(newValue);
        });
    });

    describe("has", () => {
        it("should return true if key exists in cache", () => {
            // Arrange
            const key = "test-key";
            mockCache.has.mockReturnValue(true);

            // Act
            const result = cacheConsumer.has(key);

            // Assert
            expect(mockCache.has).toHaveBeenCalledWith(key);
            expect(result).toBe(true);
        });

        it("should return false if key doesn't exist in cache", () => {
            // Arrange
            const key = "test-key";
            mockCache.has.mockReturnValue(false);

            // Act
            const result = cacheConsumer.has(key);

            // Assert
            expect(mockCache.has).toHaveBeenCalledWith(key);
            expect(result).toBe(false);
        });
    });

    describe("set", () => {
        it("should store value in cache", async () => {
            // Arrange
            const key = "test-key";
            const value = { data: "test-data" };

            // Act
            await cacheConsumer.set(key, value);

            // Assert
            expect(mockCache.set).toHaveBeenCalledWith(key, value, undefined);
        });

        it("should respect ttl option when storing value", async () => {
            // Arrange
            const key = "test-key";
            const value = { data: "test-data" };
            const ttl = 60000; // 1 minute

            // Act
            await cacheConsumer.set(key, value, { ttl });

            // Assert
            expect(mockCache.set).toHaveBeenCalledWith(key, value, ttl);
        });
    });
});
