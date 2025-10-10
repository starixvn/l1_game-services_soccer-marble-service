import { TableGameData } from "sc-game-base/src/table";
import { GameConfigs } from "sc-game-base/src/core/game-data";
export default class GameData extends TableGameData {
    declare realPlayers: { [playerId: string]: RealPlayer };
    declare gameConfigs: GameConfigs;
    constructor() {
        super(0);
        this.playerBetCount = {};
    }
    playerBetCount: Record<string, string[]> = {};
    lastRoundId?: number;
    proceedEvent?: boolean;
}

export type RealPlayer = {
    UID: string;
    profile: { name: string; minBet: number; maxBet: number };
    session: any;
    socketClient: any;
};
