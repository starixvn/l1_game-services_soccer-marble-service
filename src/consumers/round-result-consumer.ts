import { RoundResultConsumer as RoundResultConsumerBase } from "sc-game-base/src/core/event-consumers";
import GameData from "../game-data";
import { resultHelper } from "../helpers";
import { encrypt } from "sc-game-base/src/core/helpers/crypto-helper";
import { DEFAULT_NUMBER_OF_VIDEOS } from "../constants";
export default class RoundResultConsumer extends RoundResultConsumerBase {
    declare gameData: GameData;

    constructor(container: any) {
        super(
            container.gameData,
            container.definition,
            container.roundResultPublisher,
            container.resultsRepository,
            container.provablyFairConsumer,
        );

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
        this.generateResultFromAdmin();
    }

    override generateResultFromAdmin() {
        const { roundId, settlementResultFromAdmin: resultFromAdmin } = this.gameData;

        if (roundId === resultFromAdmin.roundId) {
            this.gameData.result = resultHelper.generateResultFromAdminRawResult(resultFromAdmin.result);
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
