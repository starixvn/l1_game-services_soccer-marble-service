import generateTournament from "../../../../src/helpers/tournament/generate";

describe(generateTournament.name, () => {
    describe("when the input is null or undefined", () => {
        test.each([[null], [undefined]])("should throw an exception", (input) => {
            // Act
            const caller = () => generateTournament(input as any);

            // Assert
            expect(caller).toThrow();
        });
    });

    describe("when the teams length is not power of 2", () => {
        test.each([[[]], [["a"]], [["a", "b", "c"]], [["a", "b", "c", "e", "f"]], [["a", "b", "c", "e", "f", "g", "h"]]])(
            "should throw an exception",
            (input) => {
                // Act
                const caller = () => generateTournament(input);

                // Assert
                expect(caller).toThrow();
            },
        );
    });

    describe("when the teams length is 4", () => {
        it("should return as expected", () => {
            // Arrange
            const input = ["A", "B", "C", "D"];
            const expected = [
                { home: "A", away: "B" },
                { home: "C", away: "D" },
                { home: "", away: "" },
            ];

            // Act
            const actual = generateTournament(input);

            // Assert
            expect(actual).toStrictEqual(expected);
        });
    });

    describe("when the teams length is 16", () => {
        it("should return as expected", () => {
            // Arrange
            const input = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16"];
            const expected = [
                { home: "1", away: "2" },
                { home: "3", away: "4" },
                { home: "5", away: "6" },
                { home: "7", away: "8" },
                { home: "9", away: "10" },
                { home: "11", away: "12" },
                { home: "13", away: "14" },
                { home: "15", away: "16" },
                { home: "", away: "" },
                { home: "", away: "" },
                { home: "", away: "" },
                { home: "", away: "" },
                { home: "", away: "" },
                { home: "", away: "" },
                { home: "", away: "" },
            ];

            // Act
            const actual = generateTournament(input);

            // Assert
            expect(actual).toStrictEqual(expected);
        });
    });
});
