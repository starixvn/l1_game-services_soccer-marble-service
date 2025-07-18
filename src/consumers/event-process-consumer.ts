import GameData from "../game-data";
import { SchedulerConsumer } from "./scheduler-consumer";
import { EventDetail, EventResponse, MarketSelection, OddFeedConsumer, ScheduleResponseItem } from "./odd-feed-consumer";
import { extractGameId, extractRoundId } from "../helpers/eventid";
import { GameStatusPublisher, RunningRoundInfoPublisher } from "../publishers";
import { BetChoiceSelection, LIVE_BET_CHOICES, PRE_MATCH_BET_CHOICES } from "../constants";

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
        console.log("CURRENT TIME ", new Date().toISOString());
        console.log("UPCOMING EVENT ", event.eventID, "Game ", gameId, "Round ", roundId, "start time ", new Date(event.scheduleStartTs));
        this.schedulerConsumer.schedule(new Date(event.scheduleStartTs), () => this.onScheduleStart({fullEvent, eventDetail: fullEvent.eventDetails[0], index: 0, time: new Date(event.scheduleStartTs)}));
        
        fullEvent.eventDetails.forEach((eventDetail, index) => {
            const eventContext: ProcessingEventContext = {
                fullEvent,
                eventDetail,
                index,
                time: new Date(eventDetail.scheduleStartTs)
            }

            this.schedulerConsumer.schedule(new Date(eventDetail.oddsAvailableTs), () => this.onOddAvailable({ ...eventContext, time: new Date(eventDetail.oddsAvailableTs) }));
            this.schedulerConsumer.schedule(new Date(new Date(eventDetail.scheduleStartTs).getTime() - 3000), () => this.onLockBet({ ...eventContext, time: new Date(new Date(eventDetail.scheduleStartTs).getTime() - 3000) }));
            this.schedulerConsumer.schedule(new Date(new Date(eventDetail.scheduleStartTs).getTime()), () => this.onLiveStream({ ...eventContext, time: new Date(new Date(eventDetail.scheduleStartTs).getTime()) }));
            this.schedulerConsumer.schedule(new Date(eventDetail.resultsAvailableTs), () => this.onMatchResultAvailable({ ...eventContext, time: new Date(eventDetail.resultsAvailableTs) }));
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
        console.log("schedule start ", context.time);
        this.gameData.oddFeedGames[this.gameId].currentRound = extractRoundId(context.fullEvent.eventID);
        this.gameData.oddFeedGames[this.gameId].currentEventDetailIndex = 0;

        await this.syncEventDetail(context.fullEvent.eventID);
        this.logCurrentRoundAndEventDetailIndex();
        this.saveOddsToGameData();
        this.gameStatusPublisher.publishStartPlacingBetStatus();
        this.publishOdds();
    }

    async onOddAvailable(context: ProcessingEventContext) {
        if (context.index == 0) return;
        console.log("onOddAvailable ");
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
        if (context.index === context.fullEvent.eventDetails.length - 1) {
            const roundId = extractRoundId(context.fullEvent.eventID);
            console.log("settle ", context.time);
            console.log("clear round" , roundId);
            delete this.gameData.oddFeedGames[this.gameId].rounds[roundId];
        }
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

        console.log("live stream ", videoResult);
        this.runningRoundInfoPublisher.publishToAllUsers({
            videoResult
        });
    }

    private isLastEventDetailOfTheRound() {
        const currentRound = this.getCurrentRound();
        if (!currentRound) {
            return false;
        }
        return this.gameData.oddFeedGames[this.gameId].currentEventDetailIndex === currentRound.eventDetails.length - 1;
    }

    private getCurrentMatch() {
        const currentRoundId = this.gameData.oddFeedGames[this.gameId].currentRound;
        const currentEventDetailIndex = this.gameData.oddFeedGames[this.gameId].currentEventDetailIndex;
        if (!currentRoundId) {
            return null;
        }
        if (currentEventDetailIndex === undefined) {
            return null;
        }
        return this.gameData.oddFeedGames[this.gameId].rounds[currentRoundId].eventDetails[currentEventDetailIndex] ?? null;
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
                const selectionUniqueKey = `${market.marketNameKey}:${selection.selectionNameLongKey}`;
                selections[selectionUniqueKey] = selection;
            }
        }

        const odds  = Object.entries(selections)
        .reduce((acc, [key, value]) => {
            if (!this.isBetChoice(key)) {
                return acc
            }
            const betChoice = SELECTION_TO_BET_CHOICE_MAP[key];
            acc[betChoice] = value.price ?? 0;
            return acc;
        }, {} as Record<keyof BetChoiceSelection, number>);
        this.gameData.dynamicOdds = { ...this.gameData.dynamicOdds, ...odds };
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

        const odds = Object.entries(allOdds)
        .reduce((acc, [key, value]) => {
            if (!this.isValidBetChoice(key, currentEventDetailIndex)) {
                return acc;
            }
            acc[key as keyof BetChoiceSelection] = value;
            return acc;
        }, {} as Record<keyof BetChoiceSelection, number>);
        console.log("currentEventDetailIndex ", currentEventDetailIndex);
        console.log("publishOdds ", odds);
        this.gameStatusPublisher.publishOdds(odds);
    }

    private async syncEventDetail(eventID: number) {
        const event = await this.oddFeedConsumer.getEvent({ eventID });
        const currentRoundId = this.gameData.oddFeedGames[this.gameId].currentRound;
        const currentEventDetailIndex = this.gameData.oddFeedGames[this.gameId].currentEventDetailIndex;
        if (currentRoundId === undefined || currentEventDetailIndex === undefined) {
            return;
        }
        this.gameData.oddFeedGames[this.gameId].rounds[currentRoundId].eventDetails[currentEventDetailIndex] = event.eventDetails[currentEventDetailIndex];
    }

    private isBetChoice(betChoice: string) {
        return Object.values(SELECTION_BET_CHOICES).includes(betChoice);
    }

    private isValidBetChoice(betChoice: string, index: number) {
        if (index == 0) {
            return this.isFirstHalfBetChoice(betChoice);
        }
        return this.isLiveBetChoice(betChoice);
    }

    private isFirstHalfBetChoice(betChoice: string) {
        return Object.values(PRE_MATCH_BET_CHOICES).includes(betChoice);
    }

    private isLiveBetChoice(betChoice: string) {
        return Object.values(LIVE_BET_CHOICES).includes(betChoice);
    }

    private logCurrentRoundAndEventDetailIndex() {
        const currentRoundId = this.gameData.oddFeedGames[this.gameId].currentRound;
        if (!currentRoundId) {
            return;
        }
        console.log("current round ", currentRoundId);
        console.log("current event detail index ", this.gameData.oddFeedGames[this.gameId].currentEventDetailIndex);
    }
}

const SELECTION_BET_CHOICES: BetChoiceSelection = {
    home: "MARKET_1H_1X2:HOME",
    away: "MARKET_1H_1X2:AWAY",
    draw: "MARKET_1H_1X2:TIE",
    over: "MARKET_1H_OVER_UNDER:OVER",
    under: "MARKET_1H_OVER_UNDER:UNDER",
    odd: "MARKET_1H_EVEN_ODD:ODD",
    even: "MARKET_1H_EVEN_ODD:EVEN",
    homeLive: "MARKET_1X2:HOME",
    awayLive: "MARKET_1X2:AWAY",
    drawLive: "MARKET_1X2:TIE",
    evenLive: "MARKET_EVEN_ODD:EVEN",
    overLive: "MARKET_OVER_UNDER:OVER",
    underLive: "MARKET_OVER_UNDER:UNDER",
    oddLive: "MARKET_EVEN_ODD:ODD",
}


const SELECTION_TO_BET_CHOICE_MAP: Record<string, keyof BetChoiceSelection> = Object.entries(SELECTION_BET_CHOICES).reduce((acc, [key, value]) => {
    acc[value] = key as keyof BetChoiceSelection;
    return acc;
}, {} as Record<string, keyof BetChoiceSelection>);