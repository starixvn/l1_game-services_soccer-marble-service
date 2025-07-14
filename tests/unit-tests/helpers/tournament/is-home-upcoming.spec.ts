import isHomeUpcoming from "../../../../src/helpers/tournament/is-home-upcoming";

describe(isHomeUpcoming.name, () => {
    describe("when the input is invalid", () => {
        test.each([
            [[], 0],
            [null, 0],
            [["A", "B"], 1],
            [["A", "B", "C"], 3],
            [["A", "B", "C"], 2],
        ])("should throw exception", (matches: unknown[] | any, index: number) => {
            // Act
            const caller = () => isHomeUpcoming(matches, index);

            // Assert
            expect(caller).toThrow();
        });
    });

    describe("when the input is valid", () => {
        it("should return the next match", () => {
            // Arrange
            const matches = [
                { home: "1", away: "2" },
                { home: "3", away: "4" },
                { home: "5", away: "6" },
                { home: "7", away: "8" },
                { home: "9", away: "10" },
                { home: "11", away: "12" },
                { home: "13", away: "14" },
                { home: "15", away: "16" },
                { home: "1", away: "4" },
                { home: "5", away: "" },
                { home: "", away: "" },
                { home: "", away: "" },
                { home: "", away: "" },
                { home: "", away: "" },
                { home: "", away: "" },
            ];

            // Act
            const actual = isHomeUpcoming(matches, 2);

            // Assert
            expect(actual).toBeTruthy();
        });
    });
});
