import { TableInGameConsumer } from "sc-game-base/src/table/event-consumers";
import GameData from "../game-data";
import { getUserBetPercentage } from "../helpers/bet-percentage";
import { BetStatusService } from "../features/bet-status/bet-status-service";
import { CurrentEventService } from "../features/current-event/current-event-service";
import { extractGameId } from "../helpers/eventid";

export default class InGameConsumer extends TableInGameConsumer {
    declare gameData: GameData;
    betStatusService: BetStatusService;
    currentEventService: CurrentEventService;

    constructor(
        definition: any,
        gameData: GameData,
        roundQuery: any,
        publisher: any,
        getBalance: any,
        gameManagementApiClientFactory: any,
        betStatusService: BetStatusService,
        currentEventService: CurrentEventService,
    ) {
        super(definition, gameData, roundQuery, publisher, getBalance, gameManagementApiClientFactory);
        this.betStatusService = betStatusService;
        this.currentEventService = currentEventService;
    }

    override async consume(realPlayer: any): Promise<void> {
        await super.consume(realPlayer);

        try {

            this.publishOddsToPlayer(realPlayer.UID);
            this.publishBetChoicePointsToPlayer(realPlayer.UID);
            this.publishMatchToPlayer(realPlayer.UID);
        }   catch (error) {
            console.log("error", error);
        }
    }

    override async buildPayload(realPlayer: any) {
        const payload = await super.buildPayload(realPlayer);
        const betChoices = Object.keys(this.betStatusService.odds);
        return {
            ...payload,
            userBetPercentage: getUserBetPercentage(this.gameData.playerBetCount, betChoices),
        };
    }

    publishOddsToPlayer(UID: string): void {
        this.publisher.publishToUser(UID, { odds: this.betStatusService.odds });
    }

    publishBetChoicePointsToPlayer(UID: string): void {
        this.publisher.publishToUser(UID, { points: this.betStatusService.points });
    }

    publishMatchToPlayer(UID: string): void {
        const currentEvent = this.currentEventService.getCurrentEvent();
        const home = currentEvent.eventNameAKey;
        const away = currentEvent.eventNameBKey;
        this.publisher.publishToUser(UID, { match: { home, away } });
    }

    publishCurrentIndexToPlayer(UID: string): void {
        this.publisher.publishToUser(UID, { currentIndex: this.betStatusService.currentIndex });
    }
}
