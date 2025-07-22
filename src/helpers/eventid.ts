import GameData from "../game-data";

const SHIFT_BITS = 32n;
const MASK_32_BITS = 0xffffffffn;

export const createEventId = (gameId: number, roundId: number) => {
  if (gameId >= 2 ** 16) {
    throw new Error("gameId out of range");
  }

  if (roundId >= 2 ** 32) {
    throw new Error("roundId out of range");
  }

  return Number((BigInt(gameId) << SHIFT_BITS) + BigInt(roundId));
};

export const extractGameId = (eventId: number) => {
  return Number(BigInt(eventId) >> SHIFT_BITS);
};

export const extractRoundId = (eventId: number) => {
  return Number(BigInt(eventId) & MASK_32_BITS);
};

export function getCurrentMatch(gameData: GameData, gameId?: number) {
  if (!gameId) {
    return null;
  }
  const currentRoundId = gameData.oddFeedGames[gameId].currentRound;
  const currentEventDetailIndex = gameData.oddFeedGames[gameId].currentEventDetailIndex;
  if (!currentRoundId) {
      return null;
  }
  if (currentEventDetailIndex === undefined) {
      return null;
  }
  return gameData.oddFeedGames[gameId].rounds[currentRoundId].eventDetails[currentEventDetailIndex] ?? null;
}