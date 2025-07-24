import { TableGameConfigBot } from "sc-game-base/src/table/crons";
import GameData from "../game-data";
import GameDefinition from "../game-definition";
import { isWithinBettingTimeInCurrentEventDetail } from "../helpers/game-timing";

export default class Bot extends TableGameConfigBot {
    declare gameData: GameData;
    declare definition: GameDefinition;

    override updateBalanceAndPublishBetPayload(botId: string, choice: string, amount: number, balance: number) {
        super.updateBalanceAndPublishBetPayload(botId, choice, amount, balance);
        this.updatePlayerBetCount(botId, choice);
    }

    getTicketsPerRound() {
        return this.chance.integer({ min: 2, max: 10 });
    }

    resetBot(bot: any) {
        super.resetBot(bot);

        bot.totalTickets = bot.remainTickets;
    }

    getNumberOfBotsToBet() {
        const totalTickets = Object.values(this.botsInRoom).reduce((acc: number, bot) => acc + ((bot as any).totalTickets || 0), 0);
        const randomPercent = this.chance.integer({ min: 1, max: 10 }) / 100;
        const maxTickets = Math.max(2, Math.floor(totalTickets * randomPercent));

        return this.chance.integer({ min: 1, max: maxTickets });
    }

    getBotsToBet() {
        const numberBotsToBet = this.getNumberOfBotsToBet();

        let botsToBet = Object.values(this.botsInRoom).filter(
            (t: any) => t.totalBet < this.gameData.gameConfigs.bot_maxbet && t.remainTickets > 0
        );

        botsToBet = this.chance.shuffle(botsToBet);

        return botsToBet.slice(0, Math.min(numberBotsToBet, botsToBet.length - 1));
    }

    updatePlayerBetCount(playerId: string, choice: string) {
        if (this.definition.choices.includes(choice)) {
            if (!this.gameData.playerBetCount[choice]) {
                this.gameData.playerBetCount[choice] = [];
            }
            !this.gameData.playerBetCount[choice].includes(playerId) && this.gameData.playerBetCount[choice].push(playerId);
        }
    }

    getBetChoice(bot: any) {
        const betChoices = Object.keys(this.gameData.dynamicOdds ?? {}).filter((choice) => this.isBetChoiceValid(choice));
        const choice = this.chance.pickone(betChoices);
        const hedgeBetGroup = this.gameData.dynamicHedgeBetGroups?.find((group) => group.has(choice));

        if (hedgeBetGroup) {
            const oppositeChoice = Array.from(hedgeBetGroup).find((c) => c !== choice);
            return bot.choices.includes(oppositeChoice) ? oppositeChoice : choice;
        } else {
            return choice;
        }
    }

    filterBetChoicesRatios(betChoiceRatios: { group: string[]; underBetRatio: boolean }[]) {
        const result = [];

        for (const betChoiceRatio of betChoiceRatios) {
            const betOptions = this.filterBetChoice(betChoiceRatio.group);

            if (betOptions.length > 0) {
                result.push({ group: betOptions, underBetRatio: betChoiceRatio.underBetRatio });
            }
        }

        // Incase all bet choices are over the ratio, return all bet choices
        if (result.every((data) => !data.underBetRatio)) {
            for (const betChoiceRatio of result) {
                betChoiceRatio.underBetRatio = true;
            }
        }

        return result;
    }

    isDuringBetTime = () => isWithinBettingTimeInCurrentEventDetail(this.gameData);

    async insertOrUpdateBet(bot: any, choice: string, amount: number, currentBet: any) {
        const currentAmount = currentBet ? currentBet[choice] ?? 0 : 0;
        const update = { [choice]: amount + currentAmount, odds: this.gameData.dynamicOdds };
        const create = {
            uid: bot.id,
            name: bot.name,
            roundId: this.gameData.roundId,
            time: new Date(),
            currency: " ",
            operatorId: " ",
            clientSeed: bot.clientSeed,
        };

        await this.tempBetsRepository.updateOne(
            { uid: bot.id, roundId: this.gameData.roundId },
            { $set: update, $setOnInsert: create },
            { upsert: true, setDefaultsOnInsert: true }
        );

        return create.time;
    }

    filterBetChoice(betOptions: string[]) {
        return betOptions.filter((choice) => this.isBetChoiceValid(choice));
    }

    private isBetChoiceValid(choice: string) {
        return this.isOddOfBetChoiceValid(choice);
    }

    private isOddOfBetChoiceValid(choice: string) {
        return this.gameData?.dynamicOdds?.[choice] && this.gameData?.dynamicOdds?.[choice] !== 0;
    }
}
