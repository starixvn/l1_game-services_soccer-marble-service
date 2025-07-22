import { EVENT_OFFSET, LOCKBET_OFFSET } from "../constants";
import GameData from "../game-data";
import { getCurrentMatch } from "./eventid";

export function getEventOffset(time: Date, offset: number = EVENT_OFFSET) {
    return new Date(time.getTime() + offset);
}

export function isWithinBettingTimeInCurrentEventDetail(gameData: GameData) {
    const gameId = gameData.gameId;
    if (!gameId) {
        return false;
    }   
    const currentMatch = getCurrentMatch(gameData, gameId);
    if (!currentMatch) {
        return false;
    }
    const now = new Date();
    const currentEventIndex = gameData.oddFeedGames[gameId].currentEventDetailIndex;


    const startPlaceBetTs = currentEventIndex == 0
        ? gameData.oddFeedGames[gameId].rounds[gameData.roundId].scheduleStartTs
        : currentMatch.oddsAvailableTs;

    const lockbetTs = getEventOffset(currentMatch.scheduleStartTs, LOCKBET_OFFSET);


    return now > startPlaceBetTs && now < lockbetTs;
}