import { UnsettledRoundConsumer as UnsettledRoundConsumerBase } from "sc-game-base/src/core/event-consumers";
import GameData from "../game-data";
import SettleGameRoundConsumer from "./settle-game-round-consumer";
import { OddsFeedCron } from "odds-feed-client";
import { CurrentEventService } from "../features/current-event/current-event-service";

export default class UnsettledRoundConsumer extends UnsettledRoundConsumerBase {
    declare settleGameRoundConsumer: SettleGameRoundConsumer;
    declare gameData: GameData;
    oddsFeedCron: OddsFeedCron;
    currentEventService: CurrentEventService;

    constructor(container: any) {
        super(container);
        this.oddsFeedCron = container.oddsFeedCron;
        this.currentEventService = container.currentEventService;
    }

    async proceed(): Promise<void> {
        await this.settleUnsettledRounds();
    }

    private async settleUnsettledRounds(): Promise<any> {
        const unsettledBets = await this.getUnsettledBets();
        const unsettledRound = [...new Set<number>(unsettledBets.map((bet: { roundId: number }) => bet.roundId))];
        return unsettledRound.map((roundId: number) => {
            const currentEvent = this.currentEventService.getCurrentEvent();
            if (currentEvent?.eventID === roundId) {
                return;
            }
            this.oddsFeedCron.scheduleEvent({ eventID: roundId});
        });
    }

    override async getUnsettledBets(): Promise<any> {
        const playerBets = await this.betsRepository.find({ paid: false }).lean().exec();
        const botBets = this.tempBetsRepository
            ? await this.tempBetsRepository.find({ paid: false }).lean().exec()
            : [];

        return playerBets.concat(botBets);
    }
}
