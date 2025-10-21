module.exports = async () => {
    return {
        rootDir: "./",
        verbose: true,
        transform: {
            "^.+\\.ts?$": ['ts-jest', { useESM: true }],
            "^.+\\.js?$": "babel-jest",
        },
        transformIgnorePatterns: [
            "node_modules/(?!(sc-base-database|odds-feed-client|sc-common|sc-base-apis|sc-api-client|jest-auto-fixture|nanoid|crypto-random-string|sc-game-service-integration-utils|sc-game-management-client|prom-client|sc-game-base|openid-client|oauth4webapi|jose|@sc/user-tracking-client)/.*)",
        ],
        preset: "ts-jest",
        testEnvironment: "node",
        testResultsProcessor: "jest-sonar-reporter",
        reporters: ["default", ["jest-junit", { outputDirectory: "coverage", outputName: "unit-tests.xml" }]],
        coverageReporters: ["clover", "lcov", "text-summary", "cobertura"],
        coverageDirectory: "coverage",
        collectCoverageFrom: [
            "src/**/*.{ts,tsx}",
            "!src/**/*.d.ts",
            "!src/**/__mocks__/**",
            "!src/**/__fixtures__/**",
            "!src/**/?(*.)+(spec|test).ts",
        ],
        moduleNameMapper: {
            "d3-array": "<rootDir>/node_modules/d3-array/dist/d3-array.min.js",
        },
    };
};
