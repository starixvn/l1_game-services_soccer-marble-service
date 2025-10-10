type HedgeBetRestriction = Record<string, Set<string>>; // restriction[playerId]

type HedgeBetInputArgs = {
    gameId?: string;
    player: string;
    betChoice: string;
}

export class HedgeBetService {
    private readonly _hedgeBetGroupsByGameId: Record<string, Set<string>[]> = {};
    private readonly _hedgeBetRestriction: Record<string, HedgeBetRestriction> = {}; // restriction[gameId][playerId];

    updateHedgeBetGroups(gameId: string, hedgeBetGroups: Set<string>[]) {
        this._hedgeBetGroupsByGameId[gameId] = hedgeBetGroups;
    }

    resetHedgeBetRestriction(gameId: string) {
        this._hedgeBetRestriction[gameId] = {};
    }

    trackHedgeBetRestriction({ gameId, player, betChoice }: HedgeBetInputArgs) {
        if (!gameId) {
            return;
        }

        const hedgeBetGroups = this._hedgeBetGroupsByGameId[gameId];
        const hedgeBetGroup = hedgeBetGroups?.find((group) => group.has(betChoice)) ?? new Set();
        const bannedBetChoices = Array.from(hedgeBetGroup).filter((choice) => choice !== betChoice);

        if (!this._hedgeBetRestriction[gameId]) {
            this._hedgeBetRestriction[gameId] = {};
        }

        if (!this._hedgeBetRestriction[gameId][player]) {
            this._hedgeBetRestriction[gameId][player] = new Set();
        }

        bannedBetChoices.forEach((choice) => {
            this._hedgeBetRestriction[gameId][player].add(choice);
        });

        const hedgeBetRestriction = this._hedgeBetRestriction[gameId][player];
        console.log("hedgeBetRestriction", hedgeBetRestriction);
    }

    verifyHedgeBetRestriction({ gameId, player, betChoice }: HedgeBetInputArgs) {
        if (!gameId) {
            return new Set();
        }

        const hedgeBetGroups = this._hedgeBetGroupsByGameId[gameId];
        const hedgeBetGroup = hedgeBetGroups?.find((group) => group.has(betChoice)) ?? new Set();

        console.log("hedgeBetGroup", hedgeBetGroup);

        const hedgeBetRestriction = this._hedgeBetRestriction[gameId][player];
        return hedgeBetRestriction?.has(betChoice) 
            ? hedgeBetGroup 
            : new Set();
    }
}