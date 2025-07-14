import HistoryQuery from "../../../src/query-apis/history-query";

describe(HistoryQuery.name, () => {
    let historyQuery: HistoryQuery;

    const mockPlayer = { UID: "player123" };
    const mockBet = {
        roundId: "round123",
        uid: "player123",
        paid: true,
    };
    const mockRound = {
        result: { score: "2-1" },
        match: "Team A vs Team B",
        settlementResult: "win",
    };
    const mockBetLogDetails = [
        { id: 1, details: "bet detail 1" },
        { id: 2, details: "bet detail 2" },
    ];

    beforeEach(() => {
        historyQuery = new HistoryQuery({} as any, {} as any, {} as any);

        historyQuery.betsRepository = {
            countDocuments: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue(10),
            }),
            find: jest.fn().mockReturnValue({
                lean: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue([mockBet]),
                }),
            }),
        };

        historyQuery.roundQuery = {
            getOne: jest.fn().mockResolvedValue(mockRound),
            roundsRepository: {} as any,
            resultsRepository: {} as any,
            convertSettlementResult: jest.fn(),
            convertResult: jest.fn(),
            getList: jest.fn(),
            getRoundPF: jest.fn(),
        };

        historyQuery.betLogsRepository = true;
        historyQuery.getBetLogDetails = jest.fn().mockResolvedValue(mockBetLogDetails);
        historyQuery.convertBet = jest.fn().mockReturnValue({ convertedBet: true });
        historyQuery.convertBetLogs = jest.fn().mockReturnValue(["converted log 1", "converted log 2"]);
        historyQuery.getBetProjection = jest.fn().mockReturnValue({ projection: true });
    });

    describe("queryHistory", () => {
        it("should return empty object for invalid player", async () => {
            //Act
            const result = await historyQuery.queryHistory(null, 1, 10);

            //Assert
            expect(result).toEqual({});
        });

        it("should return empty object for invalid page", async () => {
            //Act
            const result = await historyQuery.queryHistory(mockPlayer, 0, 10);

            //Assert
            expect(result).toEqual({});
        });

        describe("when querying history successfully", () => {
            let result: any;
            const page = 2;
            const pageSize = 10;

            beforeEach(async () => {
                result = await historyQuery.queryHistory(mockPlayer, page, pageSize);
            });

            it("should call countDocuments with correct filter", () => {
                //Assert
                expect(historyQuery.betsRepository.countDocuments).toHaveBeenCalledWith({
                    uid: mockPlayer.UID,
                    paid: true,
                });
            });

            it("should call find with correct parameters", () => {
                //Assert
                expect(historyQuery.betsRepository.find).toHaveBeenCalledWith(
                    { uid: mockPlayer.UID, paid: true },
                    { projection: true },
                    { sort: { _id: -1 }, skip: 10, limit: 10 },
                );
            });

            it("should call getOne with correct parameters", () => {
                //Assert
                expect(historyQuery.roundQuery.getOne).toHaveBeenCalledWith(mockBet.roundId, { _id: false });
            });

            it("should call getBetLogDetails with correct parameters", () => {
                //Assert
                expect(historyQuery.getBetLogDetails).toHaveBeenCalledWith(mockPlayer, mockBet.roundId);
            });

            it("should return correctly formatted history object", () => {
                //Assert
                expect(result).toEqual({
                    history: {
                        betLogs: [
                            {
                                convertedBet: true,
                                phien: mockBet.roundId,
                                result: {
                                    score: "2-1",
                                    teamName: "Team A vs Team B",
                                },
                                settlementResult: "win",
                                betLogDetails: ["converted log 1", "converted log 2"],
                            },
                        ],
                        page,
                        pageSize,
                        total: 10,
                    },
                });
            });
        });

        it("should return empty betLogs array when no bets found", async () => {
            //Arrange
            historyQuery.betsRepository.find = jest.fn().mockReturnValue({
                lean: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue([]),
                }),
            });

            //Act
            const result = await historyQuery.queryHistory(mockPlayer, 1, 10);

            //Assert
            expect(result).toEqual({
                history: {
                    betLogs: [],
                    page: 1,
                    pageSize: 10,
                    total: 10,
                },
            });
        });
    });

    describe("when betLogsRepository is undefined", () => {
        beforeEach(async () => {
            historyQuery.betLogsRepository = undefined;
        });

        it("should return empty betLogDetails array", async () => {
            // Act
            await historyQuery.queryHistory(mockPlayer, 1, 10);

            // Assert
            expect(historyQuery.convertBetLogs).toHaveBeenLastCalledWith([]);
        });
    });
});
