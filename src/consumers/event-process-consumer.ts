import GameData from "../game-data";
import { SchedulerConsumer } from "./scheduler-consumer";
import { EventDetail, EventResponse, MarketSelection, OddFeedConsumer, ScheduleResponseItem } from "./odd-feed-consumer";
import { extractGameId, extractRoundId, getCurrentMatch } from "../helpers/eventid";
import { GameStatusPublisher, RunningRoundInfoPublisher } from "../publishers";
import { getEventOffset } from "../helpers/game-timing";
import { LOCKBET_OFFSET } from "../constants";

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

    constructor(container: any) {
        this.gameData = container.gameData;
        this.schedulerConsumer = container.schedulerConsumer;
        this.oddFeedConsumer = container.oddFeedConsumer;
        this.gameId = container.appConfigs.oddFeed.gameId;
        this.gameStatusPublisher = container.gameStatusPublisher;
        this.runningRoundInfoPublisher = container.runningRoundInfoPublisher;
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
        console.log("--- PROCESS EVENT --- ", event.eventID);
        const gameId = extractGameId(event.eventID);
        if (gameId !== this.gameId) {
            return;
        }

        const roundId = extractRoundId(event.eventID);
 
        if (new Date(event.scheduleStartTs) < new Date()) {
            console.log("Skipping event ", event.eventID, " because it is in the past");
            return;
        }
        if (this.gameData.oddFeedGames[gameId]?.rounds[roundId]) {
            return;
        }
        console.log("Processing event ", event.eventID, "Game ", gameId, "Round ", roundId);
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
        console.log("onScheduleStart ", context.index);
        this.gameData.roundId = extractRoundId(context.fullEvent.eventID);
        this.gameData.oddFeedGames[this.gameId].currentRound = extractRoundId(context.fullEvent.eventID);
        this.gameData.oddFeedGames[this.gameId].currentEventDetailIndex = context.index;

        await this.syncEventDetail(context.fullEvent.eventID);
        this.logCurrentRoundAndEventDetailIndex();
        this.saveOddsToGameData();
        this.gameStatusPublisher.publishStartPlacingBetStatus();
        this.publishOdds();
    }

    async onOddAvailable(context: ProcessingEventContext) {
        console.log("onOddAvailable ", context.index);
        if (context.index == 0) return;
        this.gameData.oddFeedGames[this.gameId].currentEventDetailIndex = context.index;
        
        await this.syncEventDetail(context.fullEvent.eventID);
        this.logCurrentRoundAndEventDetailIndex();
        this.saveOddsToGameData();
        this.gameStatusPublisher.publishStartPlacingBetStatus();
        this.publishOdds();
    }

    async onLockBet(context: ProcessingEventContext) {
        this.logCurrentRoundAndEventDetailIndex();
        this.gameStatusPublisher.publishEndPlacingBetStatus()
    }

    async onMatchResultAvailable(context: ProcessingEventContext) {
        await this.syncEventDetail(context.eventDetail.eventID);
        if (context.index !== context.fullEvent.eventDetails.length - 1) {
            return;
        }
        const roundId = extractRoundId(context.fullEvent.eventID);
        delete this.gameData.oddFeedGames[this.gameId].rounds[roundId];
    }

    async onLiveStream(context: ProcessingEventContext) {
        this.logCurrentRoundAndEventDetailIndex();
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

    private saveOddsToGameData() {
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
                const selectionUniqueKey = selection.betChoice;
                selections[selectionUniqueKey] = selection;
            }
        }

        const odds  = Object.entries(selections)
        .reduce((acc, [key, value]) => {
            acc[key] = value.price ?? 0;
            return acc;
        }, {} as Record<string, number>);
        this.gameData.dynamicOdds = odds;
    }

    private publishOdds() {
        const allOdds = this.gameData.dynamicOdds;
        const currentEventDetailIndex = this.gameData.oddFeedGames[this.gameId].currentEventDetailIndex;
        if (!allOdds) {
            return;
        }

        if (currentEventDetailIndex === undefined) {
            return;
        }
        this.gameStatusPublisher.publishOdds(allOdds);
    }

    private async syncEventDetail(eventID: number) {
        const event = await this.oddFeedConsumer.getEvent({ eventID });
        const processedEvent = this.processEventDetails(event);
        this.gameData.oddFeedGames[this.gameId].rounds[extractRoundId(event.eventID)] = processedEvent;
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

    private logCurrentRoundAndEventDetailIndex() {
        const currentRoundId = this.gameData.oddFeedGames[this.gameId].currentRound;
        if (!currentRoundId) {
            return;
        }
        console.log("current round ", currentRoundId);
        console.log("current event detail index ", this.gameData.oddFeedGames[this.gameId].currentEventDetailIndex);
    }

    private processEventDetailWithTimingOffset(eventDetail: EventDetail) {
        const procesedEventDetail = { ...eventDetail };
        procesedEventDetail.scheduleStartTs = getEventOffset(new Date(eventDetail.scheduleStartTs));
        procesedEventDetail.oddsAvailableTs = getEventOffset(new Date(eventDetail.oddsAvailableTs));
        procesedEventDetail.resultsAvailableTs = getEventOffset(new Date(eventDetail.resultsAvailableTs));
        return procesedEventDetail;
    }
}