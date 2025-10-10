type HedgeBetRestriction = Record<string, Set<string>>; // restriction[playerId]

type HedgeBetInputArgs = {
    gameId?: string;
    player: string;
    betChoice: string;
}

export class HedgeBetService {
    private readonly hedgeBetRestriction: Record<string, HedgeBetRestriction> = {}; // restriction[gameId][playerId];
    
    readonly hedgeBetGroupsByGameId: Record<string, Set<string>[]> = {};
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

        const hedgeBetRestriction = this.hedgeBetRestriction[gameId][player];
        console.log("hedgeBetRestriction", hedgeBetRestriction);
    }

    verifyHedgeBetRestriction({ gameId, player, betChoice }: HedgeBetInputArgs) {
        if (!gameId) {
            return new Set();
        }

        const hedgeBetGroups = this.hedgeBetGroupsByGameId[gameId];
        const hedgeBetGroup = hedgeBetGroups?.find((group) => group.has(betChoice)) ?? new Set();

        console.log("hedgeBetGroup", hedgeBetGroup);

        const hedgeBetRestriction = this.hedgeBetRestriction[gameId][player];
        return hedgeBetRestriction?.has(betChoice) 
            ? hedgeBetGroup 
            : new Set();
    }
}