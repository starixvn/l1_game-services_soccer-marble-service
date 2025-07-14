import { RoundResultConsumer as RoundResultConsumerBase } from "sc-game-base/src/core/event-consumers";
import GameData from "../game-data";
import type TournamentConsumer from "./tournament-consumer";
import { resultHelper } from "../helpers";
import { encrypt } from "sc-game-base/src/core/helpers/crypto-helper";
import { DEFAULT_NUMBER_OF_VIDEOS } from "../constants";
export default class RoundResultConsumer extends RoundResultConsumerBase {
    declare gameData: GameData;
    tournamentConsumer: TournamentConsumer;

    constructor(container: any) {
        super(
            container.gameData,
            container.definition,
            container.roundResultPublisher,
            container.resultsRepository,
            container.provablyFairConsumer,
        );

        this.tournamentConsumer = container.tournamentConsumer;
    }

    getNumberOfVideos = () => {
        const numberOfVideos = this.gameData.gameConfigs.videoStreamConfig?.videoInfos.reduce(
            (acc, video) => {
                acc[video.videoName] = video.numberOfVideos;
                return acc;
            },
            {} as Record<string, number>,
        );

        return numberOfVideos || DEFAULT_NUMBER_OF_VIDEOS;
    };

    override getDataForGenerateResult() {
        const numberOfVideos = this.getNumberOfVideos();
        const { matchConfig } = this.gameData;

        return { numberOfVideos, matchConfig };
    }

    override async generateResult() {
        await super.generateResult();

        const tournament = await this.tournamentConsumer.getCurrentTournament();
        this.gameData.result.tournamentId = tournament._id;
        await this.createResultRecord();
    }

    override generateResultFromAdmin() {
        const { roundId, settlementResultFromAdmin: resultFromAdmin } = this.gameData;
        const numberOfVideos = this.getNumberOfVideos();

        if (roundId === resultFromAdmin.roundId) {
            this.gameData.result = resultHelper.generateResultFromAdminRawResult(resultFromAdmin.result, numberOfVideos);
            return true;
        }

        return false;
    }

    async createResultRecord() {
        await this.resultsRepository.create({
            roundId: this.gameData.roundId,
            encryptedResult: encrypt(JSON.stringify(this.gameData.result)),
        });
    }
}
