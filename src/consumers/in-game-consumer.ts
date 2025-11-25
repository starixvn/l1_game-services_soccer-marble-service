import { TableInGameConsumer } from "sc-game-base/src/table/event-consumers";
import GameData from "../game-data";
import { getUserBetPercentage } from "../helpers/bet-percentage";
import { BetStatusService } from "../features/bet-status/bet-status-service";
import { CurrentEventService } from "../features/current-event/current-event-service";
import { StreamingService } from "../features/streaming-service/streaming-service";

export default class InGameConsumer extends TableInGameConsumer {
    declare gameData: GameData;
    betStatusService: BetStatusService;
    currentEventService: CurrentEventService;
    streamingService: StreamingService;

    constructor(
        definition: any,
        gameData: GameData,
        roundQuery: any,
        publisher: any,
        getBalance: any,
        gameManagementApiClientFactory: any,
        betStatusService: BetStatusService,
        currentEventService: CurrentEventService,
        streamingService: StreamingService,
    ) {
        super(definition, gameData, roundQuery, publisher, getBalance, gameManagementApiClientFactory);
        this.betStatusService = betStatusService;
        this.currentEventService = currentEventService; 
        this.streamingService = streamingService;
    }

    override async consume(realPlayer: any): Promise<void> {
        await super.consume(realPlayer);
    }

    override async buildPayload(realPlayer: any) {
        const payload = await super.buildPayload(realPlayer);
        const betChoices = Object.keys(this.betStatusService.odds);

        const currentEvent = this.currentEventService.getCurrentEvent();
        const home = currentEvent.eventNameAKey;
        const away = currentEvent.eventNameBKey;
        const match = { home, away };
        return {
            ...payload,
            userBetPercentage: getUserBetPercentage(this.gameData.playerBetCount, betChoices),
            odds: this.betStatusService.odds,
            points: this.betStatusService.points,
            index: this.betStatusService.currentIndex,
            match,
            playlist: this.streamingService.currentPlaylist,
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
