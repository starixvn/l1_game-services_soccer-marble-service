import { stub } from "jest-auto-stub";
import appConfigs from "../../../src/app-configs";
import { TournamentConsumer } from "../../../src/consumers";
import GameData from "../../../src/game-data";
import { roundsRepository, tournamentRepository } from "../global-stubs";
import { DEFAULT_TOURNAMENT_CODES } from "../../../src/constants";

describe(TournamentConsumer.name, () => {
    let consumer: TournamentConsumer;
    const gameData = stub<GameData>();
    gameData.gameConfigs.tournamentConfig = DEFAULT_TOURNAMENT_CODES;

    roundsRepository.updateOne = jest.fn();

    beforeEach(() => {
        consumer = new TournamentConsumer({
            tournamentRepository,
            appConfigs,
            gameData,
            roundsRepository,
        });
    });

    describe("getCurrentTournament", () => {
        it("should return the current tournament if not ended", async () => {
            // Arrange
            gameData.tournament = { _id: "1234", ended: false } as any;

            // Act
            const result = await consumer.getCurrentTournament();

            // Assert
            expect(result).toEqual(gameData.tournament);
        });

        it("should fetch and return a running tournament if none is set in gameData", async () => {
            // Arrange
            gameData.tournament = { ended: true } as any;

            const mockLeanExec = jest.fn().mockResolvedValue({
                _id: "1234",
                ended: false,
            });

            (tournamentRepository as any).findOne.mockReturnValue({
                lean: () => ({ exec: mockLeanExec }),
            } as any);

            // Act
            const result = await consumer.getCurrentTournament();

            // Assert
            expect(tournamentRepository.findOne).toHaveBeenCalledWith({ ended: false });
            expect(result).toEqual({ _id: "1234", ended: false });
        });

        it("should create and return a new tournament if no running tournament exists", async () => {
            // Arrange
            gameData.tournament = { ended: true } as any;

            (tournamentRepository as any).findOne.mockReturnValue({
                lean: () => ({ exec: () => null }),
            } as any);

            (tournamentRepository as any).create.mockReturnValue({ _id: "6729922bdbdc9fc5fb25d98d" });

            // Act
            const result = await consumer.getCurrentTournament();

            // Assert
            expect(tournamentRepository.create).toHaveBeenCalledWith({
                code: DEFAULT_TOURNAMENT_CODES.code,
                matches: expect.any(Array),
                currentMatch: 0,
                ended: false,
            });
            expect(result).toEqual({ _id: "6729922bdbdc9fc5fb25d98d" });
        });
    });

    describe("updateMatchResult", () => {
        it("should update round with match ", async () => {
            // Arrange
            const matches = [
                {
                    home: "VNM",
                    away: "SGP",
                },
                {
                    home: "PHL",
                    away: "TWN",
                },
                {
                    home: "HKG",
                    away: "THA",
                },
                {
                    home: "IDN",
                    away: "TLS",
                },
                {
                    home: "JPN",
                    away: "KOR",
                },
                {
                    home: "CHN",
                    away: "LAO",
                },
                {
                    home: "BRN",
                    away: "IND",
                },
                {
                    home: "KHM",
                    away: "MYS",
                },
                {
                    home: "",
                    away: "",
                },
                {
                    home: "",
                    away: "",
                },
                {
                    home: "",
                    away: "",
                },
                {
                    home: "",
                    away: "",
                },
                {
                    home: "",
                    away: "",
                },
                {
                    home: "",
                    away: "",
                },
                {
                    home: "",
                    away: "",
                },
            ];

            gameData.roundId = 1;
            gameData.tournament = {
                _id: "672988e6610ec92d5204aaf4",
                matches: matches,
                currentMatch: 0,
                ended: false,
            } as any;

            // Act
            await consumer.updateMatchResult(true);

            // Assert
            expect(roundsRepository.updateOne).toHaveBeenCalledWith(
                { id: 0 },
                {
                    match: matches[0],
                },
            );
        });
        it("should update the match result and proceed to the next match", async () => {
            // Arrange
            const matches = [
                {
                    home: "VNM",
                    away: "SGP",
                },
                {
                    home: "PHL",
                    away: "TWN",
                },
                {
                    home: "HKG",
                    away: "THA",
                },
                {
                    home: "IDN",
                    away: "TLS",
                },
                {
                    home: "JPN",
                    away: "KOR",
                },
                {
                    home: "CHN",
                    away: "LAO",
                },
                {
                    home: "BRN",
                    away: "IND",
                },
                {
                    home: "KHM",
                    away: "MYS",
                },
                {
                    home: "",
                    away: "",
                },
                {
                    home: "",
                    away: "",
                },
                {
                    home: "",
                    away: "",
                },
                {
                    home: "",
                    away: "",
                },
                {
                    home: "",
                    away: "",
                },
                {
                    home: "",
                    away: "",
                },
                {
                    home: "",
                    away: "",
                },
            ];

            gameData.roundId = 1;
            gameData.tournament = {
                _id: "672988e6610ec92d5204aaf4",
                matches: matches,
                currentMatch: 0,
                ended: false,
            } as any;

            const expectedMatches = [
                {
                    home: "VNM",
                    away: "SGP",
                    id: 0,
                    homeWins: true,
                },
                {
                    home: "PHL",
                    away: "TWN",
                },
                {
                    home: "HKG",
                    away: "THA",
                },
                {
                    home: "IDN",
                    away: "TLS",
                },
                {
                    home: "JPN",
                    away: "KOR",
                },
                {
                    home: "CHN",
                    away: "LAO",
                },
                {
                    home: "BRN",
                    away: "IND",
                },
                {
                    home: "KHM",
                    away: "MYS",
                },
                {
                    home: "VNM",
                    away: "",
                },
                {
                    home: "",
                    away: "",
                },
                {
                    home: "",
                    away: "",
                },
                {
                    home: "",
                    away: "",
                },
                {
                    home: "",
                    away: "",
                },
                {
                    home: "",
                    away: "",
                },
                {
                    home: "",
                    away: "",
                },
            ];

            // Act
            await consumer.updateMatchResult(true);

            // Assert
            expect(tournamentRepository.findOneAndUpdate).toHaveBeenCalledWith(
                { _id: "672988e6610ec92d5204aaf4" },
                {
                    matches: expectedMatches,
                    currentMatch: 1,
                    ended: false,
                },
                { new: true },
            );
        });

        it("should update the tournament as ended if it is the last match", async () => {
            // Arrange
            const matches = [
                {
                    home: "INT",
                    away: "MCI",
                    homeWins: true,
                    id: 1,
                },
                {
                    home: "BVB",
                    away: "BAR",
                    homeWins: false,
                    id: 2,
                },
                {
                    home: "LIV",
                    away: "RMA",
                    homeWins: false,
                    id: 3,
                },
                {
                    home: "SCP",
                    away: "AVL",
                    homeWins: false,
                    id: 4,
                },
                {
                    home: "PSG",
                    away: "ARS",
                    homeWins: true,
                    id: 5,
                },
                {
                    home: "ATM",
                    away: "JUV",
                    homeWins: true,
                    id: 6,
                },
                {
                    home: "FCB",
                    away: "MIL",
                    homeWins: false,
                    id: 7,
                },
                {
                    home: "LEV",
                    away: "ATA",
                    homeWins: false,
                    id: 8,
                },
                {
                    home: "INT",
                    away: "BAR",
                    homeWins: true,
                    id: 9,
                },
                {
                    home: "RMA",
                    away: "AVL",
                    homeWins: true,
                    id: 10,
                },
                {
                    home: "PSG",
                    away: "ATM",
                    homeWins: false,
                    id: 11,
                },
                {
                    home: "MIL",
                    away: "ATA",
                    homeWins: false,
                    id: 12,
                },
                {
                    home: "INT",
                    away: "RMA",
                    homeWins: false,
                    id: 13,
                },
                {
                    home: "ATM",
                    away: "ATA",
                    homeWins: false,
                    id: 14,
                },
                {
                    home: "RMA",
                    away: "ATA",
                },
            ];

            gameData.roundId = 16;
            gameData.tournament = {
                _id: "672988e6610ec92d5204aaf4",
                matches: matches,
                currentMatch: 14,
                ended: false,
            } as any;

            const expectedMatches = [
                {
                    home: "INT",
                    away: "MCI",
                    homeWins: true,
                    id: 1,
                },
                {
                    home: "BVB",
                    away: "BAR",
                    homeWins: false,
                    id: 2,
                },
                {
                    home: "LIV",
                    away: "RMA",
                    homeWins: false,
                    id: 3,
                },
                {
                    home: "SCP",
                    away: "AVL",
                    homeWins: false,
                    id: 4,
                },
                {
                    home: "PSG",
                    away: "ARS",
                    homeWins: true,
                    id: 5,
                },
                {
                    home: "ATM",
                    away: "JUV",
                    homeWins: true,
                    id: 6,
                },
                {
                    home: "FCB",
                    away: "MIL",
                    homeWins: false,
                    id: 7,
                },
                {
                    home: "LEV",
                    away: "ATA",
                    homeWins: false,
                    id: 8,
                },
                {
                    home: "INT",
                    away: "BAR",
                    homeWins: true,
                    id: 9,
                },
                {
                    home: "RMA",
                    away: "AVL",
                    homeWins: true,
                    id: 10,
                },
                {
                    home: "PSG",
                    away: "ATM",
                    homeWins: false,
                    id: 11,
                },
                {
                    home: "MIL",
                    away: "ATA",
                    homeWins: false,
                    id: 12,
                },
                {
                    home: "INT",
                    away: "RMA",
                    homeWins: false,
                    id: 13,
                },
                {
                    home: "ATM",
                    away: "ATA",
                    homeWins: false,
                    id: 14,
                },
                {
                    home: "RMA",
                    away: "ATA",
                    homeWins: false,
                    id: 15,
                },
            ];

            // Act
            await consumer.updateMatchResult(false);

            // Assert
            expect(tournamentRepository.findOneAndUpdate).toHaveBeenCalledWith(
                { _id: "672988e6610ec92d5204aaf4" },
                {
                    matches: expectedMatches,
                    currentMatch: 15,
                    ended: true,
                },
                { new: true },
            );
        });
    });

    describe("getLastTournament", () => {
        it("should return the last tournament", async () => {
            // Arrange
            const tournament = { _id: "1234", ended: true } as any;
            const mockLeanExec = jest.fn().mockResolvedValue(tournament);

            (tournamentRepository as any).findOne.mockReturnValue({
                sort: () => ({
                    lean: () => ({ exec: mockLeanExec }),
                }),
            });

            // Act
            const result = await consumer.getLastTournament();

            // Assert
            expect(result).toEqual(tournament);
        });
    });

    describe("getTournamentConfigs", () => {
        it("should return default tournament configs if tournament config code is not set", async () => {
            // Arrange
            gameData.gameConfigs.tournamentConfig = {
                code: null,
                teams: null,
            } as any;

            // Act
            const result = await consumer.getTournamentConfigs();

            // Assert
            expect(result).toEqual(DEFAULT_TOURNAMENT_CODES);
        });

        it("should return default tournament configs if tournament config teams is not set", async () => {
            // Arrange
            gameData.gameConfigs.tournamentConfig = {
                code: "test",
                teams: null,
            } as any;

            // Act
            const result = await consumer.getTournamentConfigs();

            // Assert
            expect(result).toEqual(DEFAULT_TOURNAMENT_CODES);
        });

        it("should return tournament configs if tournament config is set", async () => {
            // Arrange
            gameData.gameConfigs.tournamentConfig = { code: "test", teams: ["INT", "MCI"] };

            // Act
            const result = await consumer.getTournamentConfigs();

            // Assert
            expect(result).toEqual(gameData.gameConfigs.tournamentConfig);
        });
    });
});
