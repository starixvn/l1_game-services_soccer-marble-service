import { TableGameConfigBot } from "sc-game-base/src/table/crons";
import GameData from "../game-data";
import GameDefinition from "../game-definition";
import { extractGameId } from "../helpers/eventid";
import { BetStatusService } from "../features/bet-status/bet-status-service";
import { HedgeBetService } from "../features/bet-status/hedge-bet-service";

export default class Bot extends TableGameConfigBot {
    declare gameData: GameData;
    declare definition: GameDefinition;

    betStatusService: BetStatusService;
    hedgeBetService: HedgeBetService;

    constructor(definition: any, gameData: any, publisher: any, gameManagementApiClientFactory: any, tempBetsRepository: any, betStatusService: BetStatusService, hedgeBetService: HedgeBetService) {
        super(definition, gameData, publisher, gameManagementApiClientFactory, tempBetsRepository);
        this.betStatusService = betStatusService;
        this.hedgeBetService = hedgeBetService;
    }

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
        const gameId = extractGameId(this.gameData.roundId).toString();
        const dynamicOdds = this.betStatusService.dynamicOddsByGameId[gameId];
        const betChoices = Object.keys(dynamicOdds ?? {}).filter((choice) => this.isBetChoiceValid(choice, gameId));
        const choice = this.chance.pickone(betChoices);
        const hedgeBetGroup = this.hedgeBetService.hedgeBetGroupsByGameId[gameId]?.find((group) => group.has(choice));

        if (hedgeBetGroup) {
            const oppositeChoice = Array.from(hedgeBetGroup).find((c) => c !== choice);
            return bot.choices.includes(oppositeChoice) ? oppositeChoice : choice;
        } else {
            return choice;
        }
    }

    filterBetChoicesRatios(betChoiceRatios: { group: string[]; underBetRatio: boolean }[]) {
        const gameId = extractGameId(this.gameData.roundId).toString();
        const result = [];

        for (const betChoiceRatio of betChoiceRatios) {
            const betOptions = this.filterBetChoice(betChoiceRatio.group, gameId);

            if (betOptions.length > 0) {
                result.push({ group: betOptions, underBetRatio: betChoiceRatio.underBetRatio });
            }
        }

        if (result.every((data) => !data.underBetRatio)) {
            for (const betChoiceRatio of result) {
                betChoiceRatio.underBetRatio = true;
            }
        }

        return result;
    }

    isDuringBetTime() {
        const gameId = extractGameId(this.gameData.roundId).toString();
        return this.betStatusService.betStatusByGameId[gameId];
    };

    async insertOrUpdateBet(bot: any, choice: string, amount: number, currentBet: any) {
        const gameId = extractGameId(this.gameData.roundId).toString();
        const dynamicOdds = this.betStatusService.dynamicOddsByGameId[gameId];
        const points = this.betStatusService.betChoicePointsByGameId[gameId];

        const oddsUpdate = dynamicOdds ? 
            Object.entries(dynamicOdds).reduce((acc, [key, value]) => {
                acc[`odds.${currentBet.index}.${key}`] = {
                    price: value,
                    point: points[key] ?? 0,
                };
                return acc;
            }, {} as Record<string, any>) : {};

        const currentAmount = currentBet ? currentBet[`${currentBet.index}.${choice}`] ?? 0 : 0;
        const update = { [`${currentBet.index}.${choice}`]: amount + currentAmount, odds: oddsUpdate };
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

    filterBetChoice(betOptions: string[], gameId: string) {
        return betOptions.filter((choice) => this.isBetChoiceValid(choice, gameId));
    }

    private isBetChoiceValid(choice: string, gameId: string) {
        return this.isOddOfBetChoiceValid(choice, gameId);
    }

    private isOddOfBetChoiceValid(choice: string, gameId: string) {
        const dynamicOdds = this.betStatusService.dynamicOddsByGameId[gameId];
        return dynamicOdds?.[choice] && dynamicOdds?.[choice] > 0;
    }
}
