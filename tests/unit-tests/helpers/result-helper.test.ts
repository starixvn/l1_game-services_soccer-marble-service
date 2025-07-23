import { resultHelper } from "../../../src/helpers";
import { ResultType } from "../../../src/models/rounds";
import { EventResponse } from "../../../src/consumers/odd-feed-consumer";

describe("Result Helper", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("generateResult", () => {
        it("should generate a simple result with home and away scores", () => {
            // Act
            const result = resultHelper.generateResult();

            // Assert
            expect(result).toEqual({
                home: 0,
                away: 0,
            });
        });
    });

    describe("generateResultFromAdminRawResult", () => {
        it("should generate a result from admin raw result", () => {
            // Arrange
            const roundResult: ResultType = {
                home: 2,
                away: 1,
            };

            // Act
            const result = resultHelper.generateResultFromAdminRawResult(roundResult);

            // Assert
            expect(result).toEqual({
                home: 2,
                away: 1,
            });
        });

        it("should handle zero scores", () => {
            // Arrange
            const roundResult: ResultType = {
                home: 0,
                away: 0,
            };

            // Act
            const result = resultHelper.generateResultFromAdminRawResult(roundResult);

            // Assert
            expect(result).toEqual({
                home: 0,
                away: 0,
            });
        });
    });

    describe("getSettlementResult", () => {
        it("should calculate settlement result based on event response", () => {
            // Arrange
            const mockEventResponse: EventResponse = {
                eventID: 12345,
                eventNameAKey: "Team A",
                eventNameBKey: "Team B",
                scheduleStartTs: new Date(),
                productCode: "SOCCER",
                productTypeKey: "MATCH",
                eventDetails: [
                    {
                        eventID: 12345,
                        scheduleStartTs: new Date(),
                        oddsAvailableTs: new Date(),
                        resultsAvailableTs: new Date(),
                        hasResults: true,
                        playlist: "test-playlist",
                        goalInfo: "test-goal-info",
                        result: "1:0",
                        markets: [
                            {
                                marketID: 1,
                                marketNameKey: "match_result",
                                marketName: "Match Result",
                                selections: [
                                    {
                                        betChoice: "home",
                                        price: 2.0,
                                        point: 1.5,
                                        settlementStatus: "W",
                                        selectionID: 1,
                                        selectionNameLongKey: "home_team",
                                        name: "Home Team"
                                    },
                                    {
                                        betChoice: "away",
                                        price: 3.0,
                                        point: 2.0,
                                        settlementStatus: "L",
                                        selectionID: 2,
                                        selectionNameLongKey: "away_team",
                                        name: "Away Team"
                                    },
                                    {
                                        betChoice: "draw",
                                        price: 2.5,
                                        point: 1.8,
                                        settlementStatus: "L",
                                        selectionID: 3,
                                        selectionNameLongKey: "draw",
                                        name: "Draw"
                                    }
                                ]
                            }
                        ]
                    }
                ]
            };

            // Act
            const settlementResult = resultHelper.getSettlementResult(mockEventResponse);

            // Assert
            expect(settlementResult).toEqual({
                "0:home": true,
                "0:away": false,
                "0:draw": false,
            });
        });

        it("should handle multiple event details", () => {
            // Arrange
            const mockEventResponse: EventResponse = {
                eventID: 12345,
                eventNameAKey: "Team A",
                eventNameBKey: "Team B",
                scheduleStartTs: new Date(),
                productCode: "SOCCER",
                productTypeKey: "MATCH",
                eventDetails: [
                    {
                        eventID: 12345,
                        scheduleStartTs: new Date(),
                        oddsAvailableTs: new Date(),
                        resultsAvailableTs: new Date(),
                        hasResults: true,
                        playlist: "test-playlist",
                        goalInfo: "test-goal-info",
                        result: "1:0",
                        markets: [
                            {
                                marketID: 1,
                                marketNameKey: "match_result",
                                marketName: "Match Result",
                                selections: [
                                    {
                                        betChoice: "home",
                                        price: 2.0,
                                        point: 1.5,
                                        settlementStatus: "W",
                                        selectionID: 1,
                                        selectionNameLongKey: "home_team",
                                        name: "Home Team"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        eventID: 12345,
                        scheduleStartTs: new Date(),
                        oddsAvailableTs: new Date(),
                        resultsAvailableTs: new Date(),
                        hasResults: true,
                        playlist: "test-playlist",
                        goalInfo: "test-goal-info",
                        result: "0:1",
                        markets: [
                            {
                                marketID: 1,
                                marketNameKey: "match_result",
                                marketName: "Match Result",
                                selections: [
                                    {
                                        betChoice: "away",
                                        price: 2.0,
                                        point: 1.5,
                                        settlementStatus: "W",
                                        selectionID: 1,
                                        selectionNameLongKey: "away_team",
                                        name: "Away Team"
                                    }
                                ]
                            }
                        ]
                    }
                ]
            };

            // Act
            const settlementResult = resultHelper.getSettlementResult(mockEventResponse);

            // Assert
            expect(settlementResult).toEqual({
                "0:home": true,
                "1:away": true,
            });
        });

        it("should handle empty event details", () => {
            // Arrange
            const mockEventResponse: EventResponse = {
                eventID: 12345,
                eventNameAKey: "Team A",
                eventNameBKey: "Team B",
                scheduleStartTs: new Date(),
                productCode: "SOCCER",
                productTypeKey: "MATCH",
                eventDetails: []
            };

            // Act
            const settlementResult = resultHelper.getSettlementResult(mockEventResponse);

            // Assert
            expect(settlementResult).toEqual({});
        });
    });

    describe("generateRawResultForHash", () => {
        it("should return undefined", () => {
            // Act
            const result = resultHelper.generateRawResultForHash();

            // Assert
            expect(result).toBeUndefined();
        });
    });
});
