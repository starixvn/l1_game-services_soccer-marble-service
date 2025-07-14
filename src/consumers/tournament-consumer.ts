import type appConfigs from "../app-configs";
import { DEFAULT_TOURNAMENT_CODES } from "../constants";
import GameData from "../game-data";
import { secureShuffle as shuffle } from "sc-core-rng";
import generate from "../helpers/tournament/generate";
import updateNext from "../helpers/tournament/update-next";
import type { tournaments, rounds } from "../models";
import type { ITournament, MatchType } from "../models/tournaments";

export default class TournamentConsumer {
    tournamentRepository: typeof tournaments;
    appConfigs: typeof appConfigs;
    gameData: GameData;
    roundsRepository: typeof rounds;

    constructor(container: any) {
        this.tournamentRepository = container.tournamentRepository;
        this.appConfigs = container.appConfigs;
        this.gameData = container.gameData;
        this.roundsRepository = container.roundsRepository;
    }

    async updateMatchResult(homeWin: boolean) {
        const roundId = this.gameData.roundId - 1;
        const tournament = await this.getCurrentTournament();

        if (tournament) {
            const match = tournament.matches[tournament.currentMatch];

            await this.updateMatchInRound(match, roundId);

            match.homeWins = homeWin;
            match.id = roundId;
            const team = homeWin ? match.home : match.away;
            const ended = tournament.currentMatch + 1 >= tournament.matches.length;

            if (!ended) {
                updateNext(tournament.matches, tournament.currentMatch, team);
            }

            this.gameData.tournament = await this.tournamentRepository.findOneAndUpdate(
                { _id: tournament._id },
                {
                    matches: tournament.matches,
                    ended: ended,
                    currentMatch: tournament.currentMatch + 1,
                },
                { new: true },
            );
        }
    }

    async getCurrentTournament(): Promise<ITournament> {
        if (this.gameData.tournament.ended === false) {
            return this.gameData.tournament;
        }

        const runningTournament: ITournament = await this.tournamentRepository.findOne({ ended: false }).lean().exec();

        if (runningTournament) {
            this.gameData.tournament = runningTournament;
            return runningTournament;
        }

        this.gameData.tournament = await this.createNewTournament();

        return this.gameData.tournament;
    }

    async getLastTournament(): Promise<ITournament> {
        const lastTournament: ITournament = await this.tournamentRepository.findOne().sort({ time: -1 }).lean().exec();

        return lastTournament;
    }

    private async createNewTournament() {
        const configs = await this.getTournamentConfigs();
        const teams = shuffle(configs.teams);

        return this.tournamentRepository.create({
            code: configs.code,
            matches: generate(teams),
            currentMatch: 0,
            ended: false,
        });
    }

    async getTournamentConfigs() {
        if (!this.gameData.gameConfigs?.tournamentConfig?.code || !this.gameData.gameConfigs?.tournamentConfig?.teams?.length) {
            return DEFAULT_TOURNAMENT_CODES;
        }

        return this.gameData.gameConfigs.tournamentConfig;
    }

    private async updateMatchInRound(match: MatchType, roundId: number) {
        await this.roundsRepository.updateOne({ id: roundId }, { match });
    }
}
