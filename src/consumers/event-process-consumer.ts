import GameData from "../game-data";
import { SchedulerConsumer } from "./scheduler-consumer";
import { EventDetail, EventResponse, MarketSelection, OddFeedConsumer, ScheduleResponseItem } from "./odd-feed-consumer";
import { extractGameId, extractRoundId, getCurrentMatch } from "../helpers/eventid";
import { GameStatusPublisher, RunningRoundInfoPublisher } from "../publishers";
import { getEventOffset } from "../helpers/game-timing";
import { LOCKBET_OFFSET } from "../constants";
import SettleGameRoundConsumer from "./settle-game-round-consumer";

export type ProcessingEventContext = {
    fullEvent: EventResponse;
    eventDetail: EventDetail;
    index: number;
    time: Date;
}

export class EventProcessConsumer {

    gameStatusPublisher: GameStatusPublisher
    gameData: GameData;
    schedulerConsumer: SchedulerConsumer;
    oddFeedConsumer: OddFeedConsumer;
    gameId: number;
    runningRoundInfoPublisher: RunningRoundInfoPublisher;
    settleGameRoundConsumer: SettleGameRoundConsumer;
    constructor(container: any) {
        this.gameData = container.gameData;
        this.schedulerConsumer = container.schedulerConsumer;
        this.oddFeedConsumer = container.oddFeedConsumer;
        this.gameId = container.appConfigs.oddFeed.gameId;
        this.gameStatusPublisher = container.gameStatusPublisher;
        this.runningRoundInfoPublisher = container.runningRoundInfoPublisher;
        this.settleGameRoundConsumer = container.settleGameRoundConsumer;
    }

    public async proceed(): Promise<void> {
        if (this.gameData.disabled) {
            return;
        }
        const schedule = await this.oddFeedConsumer.getSchedule();
        for (const event of schedule) {
            void this.processEvent(event);
        }
    }

    async processEvent(event: ScheduleResponseItem) {
        const gameId = extractGameId(event.eventID);
        if (gameId !== this.gameId) {
            return;
        }

        const roundId = extractRoundId(event.eventID);
 
        if (new Date(event.scheduleStartTs) < new Date()) {
            return;
        }
        if (this.gameData.oddFeedGames[gameId]?.rounds[roundId]) {
            return;
        }
        const fullEvent = await this.oddFeedConsumer.getEvent({ eventID: event.eventID });

        if (!this.gameData.oddFeedGames[gameId]) {
            this.gameData.oddFeedGames[gameId] = {
                rounds: {},
            };
        }
        this.gameData.oddFeedGames[gameId].rounds[roundId] = fullEvent;
        
        const eventStartTs = getEventOffset(new Date(event.scheduleStartTs));

        this.schedulerConsumer.schedule(eventStartTs, () => this.onScheduleStart({fullEvent, eventDetail: fullEvent.eventDetails[0], index: 0, time: eventStartTs}));
        
        fullEvent.eventDetails.forEach((eventDetail, index) => {
            const procesedEventDetail = this.processEventDetailWithTimingOffset(eventDetail);
            const eventContext: ProcessingEventContext = {
                fullEvent,
                eventDetail: procesedEventDetail,
                index,
                time: procesedEventDetail.scheduleStartTs
            }

            const oddsAvailableTs = procesedEventDetail.oddsAvailableTs;
            const scheduleStartTs = procesedEventDetail.scheduleStartTs;
            const resultsAvailableTs = procesedEventDetail.resultsAvailableTs;
            const lockbetTs = getEventOffset(scheduleStartTs, LOCKBET_OFFSET);

            this.schedulerConsumer.schedule(oddsAvailableTs, () => this.onOddAvailable({ ...eventContext, time: oddsAvailableTs }));
            this.schedulerConsumer.schedule(lockbetTs, () => this.onLockBet({ ...eventContext, time: lockbetTs }));
            this.schedulerConsumer.schedule(scheduleStartTs, () => this.onLiveStream({ ...eventContext, time: scheduleStartTs }));
            this.schedulerConsumer.schedule(resultsAvailableTs, () => this.onMatchResultAvailable({ ...eventContext, time: resultsAvailableTs }));
        });
    }

    updateAndGetRemainingTime() {
        const currentRound = this.getCurrentRound();
        if (!currentRound) {
            return 0;
        }
        
        const lastRoundResultAvailableTs = currentRound.eventDetails[currentRound.eventDetails.length - 1]?.resultsAvailableTs;
        if (!lastRoundResultAvailableTs) {
            return 0;
        }
        const now = new Date();
        const remainingTime = Math.ceil((new Date(lastRoundResultAvailableTs).getTime() - now.getTime()) / 1000);
        this.gameData.remainingTime = remainingTime;
        return remainingTime;
    }

    async onScheduleStart(context: ProcessingEventContext) {
        this.gameData.roundId = extractRoundId(context.fullEvent.eventID);
        this.gameData.oddFeedGames[this.gameId].currentRound = extractRoundId(context.fullEvent.eventID);
        this.gameData.oddFeedGames[this.gameId].currentEventDetailIndex = context.index;
        await this.syncEventDetail(context.fullEvent.eventID);
        this.publishMatch(context.fullEvent);
        this.publishBetChoiceReady();
    }

    async onOddAvailable(context: ProcessingEventContext) {
        if (context.index == 0) return;
        this.gameData.oddFeedGames[this.gameId].currentEventDetailIndex = context.index;
        
        await this.syncEventDetail(context.fullEvent.eventID);
        this.publishBetChoiceReady();
    }

    async onLockBet(context: ProcessingEventContext) {
        this.gameStatusPublisher.publishEndPlacingBetStatus()
    }

    async onMatchResultAvailable(context: ProcessingEventContext) {
        if (context.index !== context.fullEvent.eventDetails.length - 1) {
            return;
        }
        const event = await this.syncEventDetailForcingResultAvailable(context.eventDetail.eventID);
        if (!event?.eventDetails[context.index]?.hasResults) {
            return;
        }
        await this.settleGameRoundConsumer.settleSpecificRound(extractRoundId(event.eventID));
    }

    async onLiveStream(context: ProcessingEventContext) {
        const currentEventDetail = this.getCurrentMatch();
        if (!currentEventDetail) {
            return;
        }
        await this.syncEventDetail(currentEventDetail.eventID);
        const updatedCurrentEventDetail = this.getCurrentMatch();
        if (!updatedCurrentEventDetail) {
            return;
        }
        const videoResult = {
            video: updatedCurrentEventDetail.playlist,
            timeline: updatedCurrentEventDetail.goalInfo
        }

        this.runningRoundInfoPublisher.publishToAllUsers({
            videoResult
        });
    }

    private publishBetChoiceReady() {
        this.saveOddsAndPointsToGameData();
        this.gameStatusPublisher.publishStartPlacingBetStatus();
        this.publishOdds();
        this.publishBetChoicePoints();
    }
 
    private getCurrentMatch() {
        return getCurrentMatch(this.gameData, this.gameId);
    }

    private getCurrentRound() {
        const currentRoundId = this.gameData?.oddFeedGames?.[this.gameId]?.currentRound;
        if (!currentRoundId) {
            return null;
        }
        return this.gameData.oddFeedGames[this.gameId].rounds[currentRoundId] ?? null;
    }

    private saveOddsAndPointsToGameData() {
        const currentRoundId = this.gameData.oddFeedGames[this.gameId].currentRound;
        if (!currentRoundId) {
            return;
        }
        const currentRound = this.gameData.oddFeedGames[this.gameId].rounds[currentRoundId];
        if (!currentRound) {
            return;
        }
        const currentEventDetailIndex = this.gameData.oddFeedGames[this.gameId].currentEventDetailIndex;
        if (currentEventDetailIndex === undefined) {
            return;
        }
        const currentEventDetail = currentRound.eventDetails[currentEventDetailIndex];
        if (!currentEventDetail) {
            return;
        }
        const selections: Record<string, MarketSelection> = {}
        for (const market of currentEventDetail.markets) {
            for (const selection of market.selections) {
                const selectionUniqueKey = `${currentEventDetailIndex}:${selection.betChoice}`;
                selections[selectionUniqueKey] = selection;
            }
        }

        const odds  = Object.entries(selections)
        .reduce((acc, [key, value]) => {
            acc[key] = value.price ?? 0;
            return acc;
        }, {} as Record<string, number>);

        const points = Object.entries(selections)
        .reduce((acc, [key, value]) => {
            acc[key] = value.point ?? 0;
            return acc;
        }, {} as Record<string, number>);

        this.gameData.dynamicOdds = odds;
        this.gameData.betChoicePoints = points;
    }

    private publishOdds() {
        const allOdds = this.gameData.dynamicOdds;
        if (!allOdds) {
            return;
        }
        this.gameStatusPublisher.publishOdds(allOdds);
    }

    private publishBetChoicePoints() {
        const allBetChoicePoints = this.gameData.betChoicePoints;
        if (!allBetChoicePoints) {
            return;
        }
        this.gameStatusPublisher.publishToAllUsers({ points: allBetChoicePoints });
    }

    private publishMatch(event: EventResponse) {
        const home = event.eventNameAKey;
        const away = event.eventNameBKey;
        this.gameStatusPublisher.publishMatch({ home, away });
    }

    private async syncEventDetail(eventID: number) {
        const event = await this.oddFeedConsumer.getEvent({ eventID });
        const processedEvent = this.processEventDetails(event);
        this.gameData.oddFeedGames[this.gameId].rounds[extractRoundId(event.eventID)] = processedEvent;
        return processedEvent;
    }

    private async syncEventDetailForcingResultAvailable(eventID: number, { maxAttempts = 3, delay = 100 }: { maxAttempts?: number, delay?: number } = {}) {
        let attempt = maxAttempts;
        while (attempt > 0) {
            const event = await this.syncEventDetail(eventID);
            if (event.eventDetails[event.eventDetails.length - 1].hasResults) {
                return event;
            }
            attempt--;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        return null;
    }

    private processEventDetails(event: EventResponse) {
        const processedEvent = { ...event };
        processedEvent.scheduleStartTs = getEventOffset(new Date(event.scheduleStartTs));
        processedEvent.eventDetails.forEach((eventDetail, index) => {
            const procesedEventDetail = this.processEventDetailWithTimingOffset(eventDetail);
            processedEvent.eventDetails[index] = procesedEventDetail;
        });
        return processedEvent;
    }

    private processEventDetailWithTimingOffset(eventDetail: EventDetail) {
        const procesedEventDetail = { ...eventDetail };
        procesedEventDetail.scheduleStartTs = getEventOffset(new Date(eventDetail.scheduleStartTs));
        procesedEventDetail.oddsAvailableTs = getEventOffset(new Date(eventDetail.oddsAvailableTs));
        procesedEventDetail.resultsAvailableTs = getEventOffset(new Date(eventDetail.resultsAvailableTs));
        return procesedEventDetail;
    }
}