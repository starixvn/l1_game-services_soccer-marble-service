import { TableGameConfigBot } from "sc-game-base/src/table/crons";
import GameData from "../game-data";
import GameDefinition from "../game-definition";
import { BetStatusService } from "../features/bet-status/bet-status-service";
import { HedgeBetService } from "../features/bet-status/hedge-bet-service";
import { helpers } from "sc-common";

export default class Bot extends TableGameConfigBot {
    declare gameData: GameData;
    declare definition: GameDefinition;

    betStatusService: BetStatusService;
    hedgeBetService: HedgeBetService;

    indexedAllBets: Record<number, Record<string, number>> = {};
    // like AllBets but it is like allBets[index][choice] = amount

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

    isDuringBetTime = () => {
        const roundId = this.gameData.roundId;
        if (roundId === undefined || roundId === null) {
            return false;
        }

        return !this.isNoBetChoiceValid() && this.betStatusService.allowBets;
    };

    resetBot(bot: any) {
        super.resetBot(bot);

        bot.totalTickets = bot.remainTickets;
    }

    resetAllBotData(): void {
        super.resetAllBotData();
        this.allBets = {};
    }

    override getNumberOfBotsToJoin() {
        const remaining = this.maxNumberOfBots - Object.keys(this.botsInRoom).length;
            
        return remaining > 0
            ? this.chance.integer({ min: 1, max: remaining })
            : 0;
    }

    getNumberOfBotsToBet() {
        const totalTickets = Object.values(this.botsInRoom).reduce((acc: number, bot) => acc + ((bot as any).totalTickets || 0), 0);
        const randomPercent = this.chance.integer({ min: 1, max: 10 }) / 100;
        const maxTickets = Math.max(2, Math.floor(totalTickets * randomPercent));

        return this.chance.integer({ min: 1, max: maxTickets });
    }

    override getBetChoicesRatios() {
        const betGroups = this.betStatusService.betGroups;
        const allBetOptions = Object.keys(this.allBets ?? {});

        const totalBotBet = this.getAllBetAmountOnChoices(allBetOptions);
        return Object.keys(betGroups).map((group) => {
            return {
                group: betGroups[group],
                underBetRatio: (this.getAllBetAmountOnChoices(betGroups[group]) * 100) / totalBotBet < this.botSettings.ratio[group],
            };
        });
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
        if (!this.gameData.playerBetCount[choice]) {
            this.gameData.playerBetCount[choice] = [];
        }
        !this.gameData.playerBetCount[choice].includes(playerId) && this.gameData.playerBetCount[choice].push(playerId);
    }


    override getBetChoice(bot: any) {
        const betOptions = Object.keys(this.betStatusService.odds);
        const betChoiceRatios = this.getBetChoicesRatios();
        const underRatioGroups = helpers.arrayHelper.shuffle(betChoiceRatios.filter((data) => data.underBetRatio));
        const choice = underRatioGroups.length > 0 
            ? this.chance.pickone(underRatioGroups[0].group) 
            : this.chance.pickone(betOptions);

        const hedgeBetGroup = this.hedgeBetService.hedgeBetGroups?.find((group) => group.has(choice));

        if (hedgeBetGroup) {
            const oppositeChoice = Array.from(hedgeBetGroup).find((c) => c !== choice);
            return bot.choices.includes(oppositeChoice) ? oppositeChoice : choice;
        } else {
            return choice;
        }
    }

    override async insertOrUpdateBet(bot: any, choice: string, amount: number, currentBet: any) {
        const dynamicOdds = this.betStatusService.odds;
        const points = this.betStatusService.points;
        const currentIndex = this.betStatusService.currentIndex;
        const oddsUpdate = dynamicOdds ? 
            Object.entries(dynamicOdds).reduce((acc, [key, value]) => {
                acc[`odds.${currentIndex}.${key}`] = {
                    price: value,
                    point: points[key] ?? 0,
                };
                return acc;
            }, {} as Record<string, any>) : {};

        const currentAmount = currentBet ? currentBet[`${currentIndex}`]?.[choice] ?? 0 : 0;
        const update = { [`${currentIndex}.${choice}`]: amount + currentAmount, ...oddsUpdate };
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
        const dynamicOdds = this.betStatusService.odds;
        return dynamicOdds?.[choice] && dynamicOdds?.[choice] > 0;
    }

    private isNoBetChoiceValid() {
        const dynamicOdds = this.betStatusService.odds;
        const odds = Object.values(dynamicOdds ?? {});
        return odds.every((odd) => odd === 0);
    }
}
