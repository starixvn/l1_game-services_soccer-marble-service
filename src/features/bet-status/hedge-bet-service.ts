import GameData from "../../game-data";
import { extractGameId } from "../../helpers/eventid";

type HedgeBetRestriction = Record<string, Set<string>>;

type HedgeBetInputArgs = {
    gameId?: string;
    player: string;
    betChoice: string;
}

interface HedgeBetServiceContainer {
    gameData: GameData;
}

export class HedgeBetService {
    gameData: GameData;
    private readonly hedgeBetRestriction: Record<string, HedgeBetRestriction> = {};

    constructor(container: HedgeBetServiceContainer) {
        this.gameData = container.gameData;
    }

    private readonly hedgeBetGroupsByGameId: Record<string, Set<string>[]> = {};

    get hedgeBetGroups() {
        const gameId = extractGameId(this.gameData.roundId).toString();
        return this.hedgeBetGroupsByGameId[gameId];
    }

    updateHedgeBetGroups(gameId: string, hedgeBetGroups: Set<string>[]) {
        this.hedgeBetGroupsByGameId[gameId] = hedgeBetGroups;
    }

    resetHedgeBetRestriction(gameId: string) {
        this.hedgeBetRestriction[gameId] = {};
    }

    trackHedgeBetRestriction({ gameId, player, betChoice }: HedgeBetInputArgs) {
        if (!gameId) {
            return;
        }

        const hedgeBetGroups = this.hedgeBetGroupsByGameId[gameId];
        const hedgeBetGroup = hedgeBetGroups?.find((group) => group.has(betChoice)) ?? new Set();
        const bannedBetChoices = Array.from(hedgeBetGroup).filter((choice) => choice !== betChoice);

        if (!this.hedgeBetRestriction[gameId]) {
            this.hedgeBetRestriction[gameId] = {};
        }

        if (!this.hedgeBetRestriction[gameId][player]) {
            this.hedgeBetRestriction[gameId][player] = new Set();
        }

        bannedBetChoices.forEach((choice) => {
            this.hedgeBetRestriction[gameId][player].add(choice);
        });
    }

    verifyHedgeBetRestriction({ gameId, player, betChoice }: HedgeBetInputArgs) {
        if (!gameId) {
            return new Set();
        }

        const hedgeBetGroups = this.hedgeBetGroupsByGameId[gameId];
        const hedgeBetGroup = hedgeBetGroups?.find((group) => group.has(betChoice)) ?? new Set();


        const hedgeBetRestriction = this.hedgeBetRestriction[gameId][player];
        return hedgeBetRestriction?.has(betChoice) 
            ? hedgeBetGroup 
            : new Set();
    }
}