import { TableInGameConsumer } from "sc-game-base/src/table/event-consumers";
import GameData from "../game-data";
import { getUserBetPercentage } from "../helpers/bet-percentage";
import GameDefinition from "../game-definition";
import {
    isStreamingVideoFirstHalf,
    isStreamingVideoSecondHalf,
    isShowingResultFirstHalf,
    isShowingResultSecondHalf,
} from "../helpers/game-timing";

export default class InGameConsumer extends TableInGameConsumer {
    declare gameData: GameData;
    declare definition: GameDefinition;

    constructor(
        definition: GameDefinition,
        gameData: GameData,
        roundQuery: any,
        publisher: any,
        getBalance: any,
        gameManagementApiClientFactory: any
    ) {
        super(definition, gameData, roundQuery, publisher, getBalance, gameManagementApiClientFactory);
    }

    override async consume(realPlayer: any): Promise<void> {
        await super.consume(realPlayer);
        this.publishOddsToPlayer(realPlayer.UID);
        this.publishVoiceToPlayer(realPlayer.UID);
    }

    override async buildPayload(realPlayer: any) {
        const payload = await super.buildPayload(realPlayer);
        return {
            ...payload,
            userBetPercentage: getUserBetPercentage(this.gameData.playerBetCount),
            liveStreamServer: this.gameData.liveStreamServer,
            videoResult: this.getCurrentVideoResult(),
            tournament: this.gameData.publishedTournament,
        };
    }

    getCurrentVideoResult() {
        const { durations } = this.definition;
        const { remainingTime } = this.gameData;

        if (isStreamingVideoFirstHalf(remainingTime, durations)) {
            return this.getFirstHalfStreamingResult();
        }
        if (isStreamingVideoSecondHalf(remainingTime, durations)) {
            return this.getSecondHalfStreamingResult();
        }
        if (isShowingResultFirstHalf(remainingTime, durations)) {
            return this.getFirstHalfResult();
        }
        if (isShowingResultSecondHalf(remainingTime, durations)) {
            return this.getSecondHalfResult();
        }
        return {};
    }

    private getFirstHalfStreamingResult() {
        const { result } = this.gameData;
        return {
            firstHalfVideo: result?.firstHalfVideo,
            firstHalfTimeline: result?.firstHalfTimeline,
            firstHalf: result?.firstHalf,
        };
    }

    private getSecondHalfStreamingResult() {
        const { result } = this.gameData;
        return {
            firstHalfTimeline: result?.firstHalfTimeline,
            firstHalf: result?.firstHalf,
            secondHalfVideo: result?.secondHalfVideo,
            secondHalfTimeline: result?.secondHalfTimeline,
            secondHalf: result?.secondHalf,
        };
    }

    private getFirstHalfResult() {
        const { result } = this.gameData;
        return {
            firstHalfTimeline: result?.firstHalfTimeline,
            firstHalf: result?.firstHalf,
        };
    }

    private getSecondHalfResult() {
        const { result } = this.gameData;
        return {
            firstHalfTimeline: result?.firstHalfTimeline,
            firstHalf: result?.firstHalf,
            secondHalfTimeline: result?.secondHalfTimeline,
            secondHalf: result?.secondHalf,
        };
    }

    publishOddsToPlayer(UID: string): void {
        this.publisher.publishToUser(UID, { odds: this.gameData.dynamicOdds });
    }

    publishVoiceToPlayer(UID: string): void {
        const { result } = this.gameData;
        this.publisher.publishToUser(UID, { voices: result?.voices ?? {} });
    }
}
