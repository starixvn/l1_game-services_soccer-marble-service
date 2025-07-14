import { TableGameData } from "sc-game-base/src/table";
import { ResultType } from "./models/rounds";
import { ITournament } from "./models/tournaments";
import { GameConfigs } from "sc-game-base/src/core/game-data";
import { DEFAULT_TOURNAMENT_CODES } from "./constants";
import { MatchConfigType } from "./match-configs";
import { VoiceDurationConfig } from "./helpers/voices";
export default class GameData extends TableGameData {
    declare realPlayers: { [playerId: string]: RealPlayer };
    declare result: ResultType;
    declare gameConfigs: GameConfigs & { tournamentConfig: typeof DEFAULT_TOURNAMENT_CODES; videoStreamConfig: VideoStreamConfig };
    matchConfig: MatchConfigType;

    constructor(remainingTime: number) {
        super(remainingTime);
        this.playerBetCount = {};
        this.matchConfig = {} as MatchConfigType;
    }
    playerBetCount: Record<string, string[]> = {};
    liveStreamServer = "";
    tournament = {} as ITournament;
    publishedTournament = {} as ITournament;
    dynamicOdds?: Record<string, number>;
    voiceConfig?: VoiceDurationConfig;
}

export type RealPlayer = {
    UID: string;
    profile: { name: string; minBet: number; maxBet: number };
    session: any;
    socketClient: any;
};

type VideoStreamConfig = {
    videoInfos: VideoInfo[];
};

type VideoInfo = {
    videoName: string;
    numberOfVideos: number;
};
