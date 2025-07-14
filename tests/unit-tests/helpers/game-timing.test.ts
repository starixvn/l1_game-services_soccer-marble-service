import {
    isFirstHalfOddsActive,
    isWithinBettingTime,
    isWithinFirstHalfBettingTime,
    isWithinSecondHalfBettingTime,
    isDuringFirstHalf,
    isDuringSecondHalf,
    isStreamingVideoFirstHalf,
    isStreamingVideoSecondHalf,
    isShowingResultFirstHalf,
    isShowingResultSecondHalf,
} from "../../../src/helpers/game-timing";

describe("Game Timing Helpers", () => {
    // Arrange
    const mockDurations: any = {
        wholeRound: 126,
        startingRound: 116,
        placingBetsFirstHalf: 110,
        lockingBetFirstHalf: 93,
        streamingVideoFirstHalf: 92,
        placingBetsSecondHalf: 52,
        lockingBetSecondHalf: 35,
        streamingVideoSecondHalf: 34,
    };

    describe("isFirstHalfOddsActive", () => {
        it("should return true when remaining time is greater than placingBetsSecondHalf", () => {
            // Arrange
            const remainingTime = mockDurations.placingBetsSecondHalf + 1;

            // Act
            const result = isFirstHalfOddsActive(remainingTime, mockDurations);

            // Assert
            expect(result).toBe(true);
        });

        it("should return false when remaining time equals placingBetsSecondHalf", () => {
            // Arrange
            const remainingTime = mockDurations.placingBetsSecondHalf;

            // Act
            const result = isFirstHalfOddsActive(remainingTime, mockDurations);

            // Assert
            expect(result).toBe(false);
        });

        it("should return false when remaining time is less than placingBetsSecondHalf", () => {
            // Arrange
            const remainingTime = mockDurations.placingBetsSecondHalf - 1;

            // Act
            const result = isFirstHalfOddsActive(remainingTime, mockDurations);

            // Assert
            expect(result).toBe(false);
        });
    });

    describe("isWithinBettingTime", () => {
        it("should return true during first half betting window", () => {
            // Arrange
            const remainingTime = mockDurations.placingBetsFirstHalf - 1;

            // Act
            const result = isWithinBettingTime(remainingTime, mockDurations);

            // Assert
            expect(result).toBe(true);
        });

        it("should return true during second half betting window", () => {
            // Arrange
            const remainingTime = mockDurations.placingBetsSecondHalf - 1;

            // Act
            const result = isWithinBettingTime(remainingTime, mockDurations);

            // Assert
            expect(result).toBe(true);
        });

        it("should return false before first half betting window", () => {
            // Arrange
            const remainingTime = mockDurations.placingBetsFirstHalf + 1;

            // Act
            const result = isWithinBettingTime(remainingTime, mockDurations);

            // Assert
            expect(result).toBe(false);
        });

        it("should return false after first half betting window", () => {
            // Arrange
            const remainingTime = mockDurations.lockingBetFirstHalf - 1;

            // Act
            const result = isWithinBettingTime(remainingTime, mockDurations);

            // Assert
            expect(result).toBe(false);
        });

        it("should return true at exact boundary of first half betting window (locking time)", () => {
            // Arrange
            const remainingTime = mockDurations.lockingBetFirstHalf;

            // Act
            const result = isWithinBettingTime(remainingTime, mockDurations);

            // Assert
            expect(result).toBe(true);
        });
    });

    describe("isWithinFirstHalfBettingTime", () => {
        it("should return true within first half betting window", () => {
            // Arrange
            const remainingTime = mockDurations.placingBetsFirstHalf - 1;

            // Act
            const result = isWithinFirstHalfBettingTime(remainingTime, mockDurations);

            // Assert
            expect(result).toBe(true);
        });

        it("should return false above upper boundary", () => {
            // Arrange
            const remainingTime = mockDurations.placingBetsFirstHalf + 1;

            // Act
            const result = isWithinFirstHalfBettingTime(remainingTime, mockDurations);

            // Assert
            expect(result).toBe(false);
        });

        it("should return false below lower boundary", () => {
            // Arrange
            const remainingTime = mockDurations.lockingBetFirstHalf - 1;

            // Act
            const result = isWithinFirstHalfBettingTime(remainingTime, mockDurations);

            // Assert
            expect(result).toBe(false);
        });
    });

    describe("isWithinSecondHalfBettingTime", () => {
        it("should return true within second half betting window", () => {
            // Arrange
            const remainingTime = mockDurations.placingBetsSecondHalf - 1;

            // Act
            const result = isWithinSecondHalfBettingTime(remainingTime, mockDurations);

            // Assert
            expect(result).toBe(true);
        });

        it("should return false at upper boundary", () => {
            // Arrange
            const remainingTime = mockDurations.placingBetsSecondHalf + 1;

            // Act
            const result = isWithinSecondHalfBettingTime(remainingTime, mockDurations);

            // Assert
            expect(result).toBe(false);
        });

        it("should return true at lower boundary (locking time)", () => {
            // Arrange
            const remainingTime = mockDurations.lockingBetSecondHalf;

            // Act
            const result = isWithinSecondHalfBettingTime(remainingTime, mockDurations);

            // Assert
            expect(result).toBe(true);
        });

        it("should return false above upper boundary", () => {
            // Arrange
            const remainingTime = mockDurations.placingBetsSecondHalf + 1;

            // Act
            const result = isWithinSecondHalfBettingTime(remainingTime, mockDurations);

            // Assert
            expect(result).toBe(false);
        });

        it("should return false below lower boundary", () => {
            // Arrange
            const remainingTime = mockDurations.lockingBetSecondHalf - 1;

            // Act
            const result = isWithinSecondHalfBettingTime(remainingTime, mockDurations);

            // Assert
            expect(result).toBe(false);
        });
    });

    describe("isDuringFirstHalf", () => {
        it("should return true when remaining time is within first half", () => {
            // Arrange
            const remainingTime = mockDurations.streamingVideoFirstHalf - 1;

            // Act
            const result = isDuringFirstHalf(remainingTime, mockDurations);

            // Assert
            expect(result).toBe(true);
        });

        it("should return false when remaining time is at upper boundary", () => {
            // Arrange
            const remainingTime = mockDurations.placingBetsFirstHalf + 1;

            // Act
            const result = isDuringFirstHalf(remainingTime, mockDurations);

            // Assert
            expect(result).toBe(false);
        });

        it("should return false when remaining time is at lower boundary", () => {
            // Arrange
            const remainingTime = mockDurations.placingBetsSecondHalf;

            // Act
            const result = isDuringFirstHalf(remainingTime, mockDurations);

            // Assert
            expect(result).toBe(false);
        });
    });

    describe("isDuringSecondHalf", () => {
        it("should return true when remaining time is within second half", () => {
            // Arrange
            const remainingTime = mockDurations.streamingVideoSecondHalf - 1;

            // Act
            const result = isDuringSecondHalf(remainingTime, mockDurations);

            // Assert
            expect(result).toBe(true);
        });

        it("should return false when remaining time is at upper boundary", () => {
            // Arrange
            const remainingTime = mockDurations.placingBetsSecondHalf + 1;

            // Act
            const result = isDuringSecondHalf(remainingTime, mockDurations);

            // Assert
            expect(result).toBe(false);
        });

        it("should return false when remaining time is at lower boundary", () => {
            // Arrange
            const remainingTime = 0;

            // Act
            const result = isDuringSecondHalf(remainingTime, mockDurations);

            // Assert
            expect(result).toBe(false);
        });

        it("should return false when remaining time is above upper boundary", () => {
            // Arrange
            const remainingTime = mockDurations.wholeRound;

            // Act
            const result = isDuringSecondHalf(remainingTime, mockDurations);

            // Assert
            expect(result).toBe(false);
        });
    });

    describe("isStreamingVideoFirstHalf", () => {
        it("should return true when remaining time is within streaming video first half", () => {
            // Arrange
            const remainingTime = mockDurations.streamingVideoFirstHalf - 1;

            // Act
            const result = isStreamingVideoFirstHalf(remainingTime, mockDurations);

            // Assert
            expect(result).toBe(true);
        });

        it("should return false when remaining time is at upper boundary", () => {
            // Arrange
            const remainingTime = mockDurations.streamingVideoFirstHalf + 1;

            // Act
            const result = isStreamingVideoFirstHalf(remainingTime, mockDurations);

            // Assert
            expect(result).toBe(false);
        });

        it("should return false when remaining time is at lower boundary", () => {
            // Arrange
            const remainingTime = mockDurations.placingBetsSecondHalf;

            // Act
            const result = isStreamingVideoFirstHalf(remainingTime, mockDurations);

            // Assert
            expect(result).toBe(false);
        });
    });

    describe("isStreamingVideoSecondHalf", () => {
        it("should return true when remaining time is within streaming video second half", () => {
            // Arrange
            const remainingTime = mockDurations.streamingVideoSecondHalf - 1;

            // Act
            const result = isStreamingVideoSecondHalf(remainingTime, mockDurations);

            // Assert
            expect(result).toBe(true);
        });

        it("should return false when remaining time is at upper boundary", () => {
            // Arrange
            const remainingTime = mockDurations.streamingVideoSecondHalf + 1;

            // Act
            const result = isStreamingVideoSecondHalf(remainingTime, mockDurations);

            // Assert
            expect(result).toBe(false);
        });

        it("should return false when remaining time is above upper boundary", () => {
            // Arrange
            const remainingTime = mockDurations.wholeRound;

            // Act
            const result = isStreamingVideoSecondHalf(remainingTime, mockDurations);

            // Assert
            expect(result).toBe(false);
        });
    });

    describe("isShowingResultFirstHalf", () => {
        it("should return true when remaining time is within showing result first half", () => {
            // Arrange
            const remainingTime = mockDurations.placingBetsSecondHalf - 1;

            // Act
            const result = isShowingResultFirstHalf(remainingTime, mockDurations);

            // Assert
            expect(result).toBe(true);
        });

        it("should return false when remaining time is at upper boundary", () => {
            // Arrange
            const remainingTime = mockDurations.placingBetsSecondHalf + 1;

            // Act
            const result = isShowingResultFirstHalf(remainingTime, mockDurations);

            // Assert
            expect(result).toBe(false);
        });

        it("should return false when remaining time is at lower boundary", () => {
            // Arrange
            const remainingTime = mockDurations.lockingBetSecondHalf - 1;

            // Act
            const result = isShowingResultFirstHalf(remainingTime, mockDurations);

            // Assert
            expect(result).toBe(false);
        });
    });

    describe("isShowingResultSecondHalf", () => {
        it("should return true when remaining time is within showing result second half", () => {
            // Arrange
            const remainingTime = mockDurations.wholeRound - 1;

            // Act
            const result = isShowingResultSecondHalf(remainingTime, mockDurations);

            // Assert
            expect(result).toBe(true);
        });

        it("should return false when remaining time is at upper boundary", () => {
            // Arrange
            const remainingTime = 0;

            // Act
            const result = isShowingResultSecondHalf(remainingTime, mockDurations);

            // Assert
            expect(result).toBe(false);
        });

        it("should return false when remaining time is at lower boundary", () => {
            // Arrange
            const remainingTime = mockDurations.startingRound - 1;

            // Act
            const result = isShowingResultSecondHalf(remainingTime, mockDurations);

            // Assert
            expect(result).toBe(false);
        });
    });
});
