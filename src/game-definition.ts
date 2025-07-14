import { TableGameDefinition } from "sc-game-base/src/table";
export default class GameDefinition extends TableGameDefinition {
    declare durations: Duration & { placingBets: number; lockingBet: number };
    constructor(gameSettings: GameSettings, generateResult: Function, settle: Function, generateRawResultForHash: Function) {
        super(
            {
                ...gameSettings,
                durations: {
                    ...gameSettings.durations,
                    placingBets: gameSettings.durations.placingBetsFirstHalf,
                    lockingBet: gameSettings.durations.lockingBetFirstHalf,
                },
            },
            generateResult,
            settle,
            generateRawResultForHash,
        );
    }
}

export type GameSettings = {
    id: number;
    name: string;
    configName: string;
    durations: Duration;
    provablyFair?: boolean;
    choices: string[];
    choicesMapper: any;
    hedgeBetGroups: any[];
    numberOfRoundHistory: number;
    historyPageSize: number;
};

export type Duration = {
    /**@deprecated use placingBetsFirstHalf and placingBetsSecondHalf instead */
    placingBets: number;
    /**@deprecated use lockingBetFirstHalf and lockingBetSecondHalf instead */
    lockingBet: number;
    wholeRound: number;
    placingBetsFirstHalf: number;
    lockingBetFirstHalf: number;
    startingRound: number;
    streamingVideoFirstHalf: number;
    placingBetsSecondHalf: number;
    lockingBetSecondHalf: number;
    streamingVideoSecondHalf: number;
};
