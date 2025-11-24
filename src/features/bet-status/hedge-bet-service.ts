import GameData from "../../game-data";

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
    private _hedgeBetRestriction: HedgeBetRestriction = {};

    constructor(container: HedgeBetServiceContainer) {
        this.gameData = container.gameData;
    }

    private _hedgeBetGroups: Set<string>[] = [];

    get hedgeBetGroups() {
        return this._hedgeBetGroups;
    }

    updateHedgeBetGroups(hedgeBetGroups: Set<string>[]) {
        this._hedgeBetGroups = hedgeBetGroups;
    }

    resetHedgeBetRestriction() {
        this._hedgeBetRestriction = {};
    }

    trackHedgeBetRestriction({ player, betChoice }: HedgeBetInputArgs) {

        const hedgeBetGroups = this._hedgeBetGroups;
        const hedgeBetGroup = hedgeBetGroups?.find((group: Set<string>) => group.has(betChoice)) ?? new Set();
        const bannedBetChoices = Array.from(hedgeBetGroup).filter((choice) => choice !== betChoice);


        if (!this._hedgeBetRestriction[player]) {
            this._hedgeBetRestriction[player] = new Set();
        }

        bannedBetChoices.forEach((choice) => {
            this._hedgeBetRestriction[player].add(choice);
        });
    }

    verifyHedgeBetRestriction({ player, betChoice }: HedgeBetInputArgs) {
        const hedgeBetGroups = this._hedgeBetGroups;
        const hedgeBetGroup = hedgeBetGroups?.find((group) => group.has(betChoice)) ?? new Set();


        const hedgeBetRestriction = this._hedgeBetRestriction[player];
        return hedgeBetRestriction?.has(betChoice) 
            ? hedgeBetGroup 
            : new Set();
    }
}