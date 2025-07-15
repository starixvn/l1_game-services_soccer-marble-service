import GameData from "../game-data";
import { SchedulerConsumer } from "./scheduler-consumer";
import { OddFeedConsumer, ScheduleResponseItem } from "./odd-feed-consumer";
import { extractGameId, extractRoundId } from "../helpers/eventid";

export class EventProcessConsumer {
    gameData: GameData;
    schedulerConsumer: SchedulerConsumer;
    oddFeedConsumer: OddFeedConsumer;

    constructor(container: any) {
        this.gameData = container.gameData;
        this.schedulerConsumer = container.schedulerConsumer;
        this.oddFeedConsumer = container.oddFeedConsumer;
    }

    public async proceed(): Promise<void> {
        const schedule = await this.oddFeedConsumer.getSchedule();
        for (const event of schedule) {
            void this.processEvent(event);
        }
    }

    private async processEvent(event: ScheduleResponseItem) {
        const fullEvent = await this.oddFeedConsumer.getEvent({ eventID: event.eventID });
        const gameId = extractGameId(event.eventID);
        const roundId = extractRoundId(event.eventID);
        if (!this.gameData.oddFeedGames[gameId]) {
            this.gameData.oddFeedGames[gameId] = {
                rounds: {},
            };
        }
        this.gameData.oddFeedGames[gameId].rounds[roundId] = fullEvent;
    }
}