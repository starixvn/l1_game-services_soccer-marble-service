import { TableInGameConsumer } from "sc-game-base/src/table/event-consumers";
import { Core } from "sc-game-base";
import { BaseEventPublisher } from "sc-game-base/src/core/event-publishers";
import GameData from "../game-data";
import GameDefinition from "../game-definition";
import { getUserBetPercentage } from "../helpers/bet-percentage";
import { BetStatusService } from "../features/bet-status/bet-status-service";
import { CurrentEventService } from "../features/current-event/current-event-service";
import { StreamingService } from "../features/streaming-service/streaming-service";

interface InGameConsumerContainer {
    definition: GameDefinition;
    gameData: GameData;
    roundQuery: Core.QueryApis.RoundQuery;
    publisher: BaseEventPublisher;
    getBalance: (player: any) => Promise<number>;
    gameManagementApiClientFactory: any;
    betStatusService: BetStatusService;
    currentEventService: CurrentEventService;
    streamingService: StreamingService;
}

export default class InGameConsumer extends TableInGameConsumer {
    declare gameData: GameData;
    betStatusService: BetStatusService;
    currentEventService: CurrentEventService;
    streamingService: StreamingService;

    constructor({
        definition,
        gameData,
        roundQuery,
        publisher,
        getBalance,
        gameManagementApiClientFactory,
        betStatusService,
        currentEventService,
        streamingService,
    }: InGameConsumerContainer) {
        super(
            definition,
            gameData,
            roundQuery,
            publisher,
            getBalance,
            gameManagementApiClientFactory,
        );
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

        const marblePayload: Record<string, any> = { 
            ...this.betStatusService.payload,
            match: { home: currentEvent.eventNameAKey, away: currentEvent.eventNameBKey },
            playlist: this.streamingService.currentPlaylist,
            userBetPercentage: getUserBetPercentage(this.gameData.playerBetCount, betChoices),
        };

        if (this.betStatusService.allowBets) {
            marblePayload.spb = true
        }
        else {
            marblePayload.epb = true;
        }

        return {
            ...payload,
            ...marblePayload,
        };
    }
}
