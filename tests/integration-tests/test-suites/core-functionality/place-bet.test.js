import { GameClientDriver, normalUser, eventTypes } from "sc-game-service-integration-utils";
import gameSettings from "../../_stubs/game-settings";
import { getTimeOutToBet, initUserSession } from "../../helper/helper";
import { socketOptionsFunc } from "../../_stubs/test-data";
import appConfigs from "../../../../build/app-configs.IGT";

const socketOptions = socketOptionsFunc(appConfigs.hostingPort);

const signInClient = async (client) => {
    const interval = setInterval(() => client.sendSignInEvent(), 500);
    await client.handleSignedInEvent();
    clearInterval(interval);
};

const placeBetAfterTimeout = async (betChoice, amount, timeout, client) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            client.emit(eventTypes.bet, { betChoice, amount });
            resolve();
        }, timeout * 1000);
    });
};

describe("when placing a bet", () => {
    let client;

    beforeEach(async () => {
        client = new GameClientDriver(socketOptions, initUserSession(normalUser));
        await signInClient(client);
    });

    afterEach(() => {
        client.close();
        client = null;
    });

    describe("when placing a bet in the first half", () => {
        it("should round bet choices to the nearest integer", async () => {
            // Arrange
            const inGameData = await client.handleGameEvent((data) => data.remainingTime);
            const timeout = getTimeOutToBet(
                inGameData.remainingTime,
                gameSettings.durations.lockingBetFirstHalf,
                gameSettings.durations.placingBetsFirstHalf,
                gameSettings.durations.wholeRound,
            );

            // Act
            await placeBetAfterTimeout("home", 100.8, timeout, client);
            const result = await client.handleGameEvent((data) => data.endBet);

            // Assert
            expect(result.endBet).toBe(100);
        });

        it("should allow betting only within placing bet duration", async () => {
            // Arrange
            const timeCanBet = new Set([7, 8, 9]);
            let check = {};
            const interval = setInterval(() => client?.sendInGameEvent(), 1000);
            const betChoice = "home";

            // Act & Assert
            for (let count = 0; count < 12; ) {
                const inGameData = await client.handleGameEvent((data) => data.remainingTime);
                if (!check[inGameData.remainingTime]) {
                    check[inGameData.remainingTime] = true;
                    count++;
                }
                client.emit(eventTypes.bet, { betChoice, amount: 100 });
                const result = await client.handleGameEvent((data) => data.endBet);

                if (timeCanBet.has(inGameData.remainingTime)) {
                    expect(result.endBet).toBe(100);
                } else {
                    expect(result.endBet).toBe(-1);
                }
            }

            clearInterval(interval);
        });

        it("should reject bet choices that are not in the first half", async () => {
            // Arrange
            const inGameData = await client.handleGameEvent((data) => data.remainingTime);
            const timeout = getTimeOutToBet(
                inGameData.remainingTime,
                gameSettings.durations.lockingBetFirstHalf,
                gameSettings.durations.placingBetsFirstHalf,
                gameSettings.durations.wholeRound,
            );

            // Act
            await placeBetAfterTimeout("homeLive", 100.8, timeout, client);
            const result = await client.handleGameEvent((data) => data.endBet);

            // Assert
            expect(result.endBet).toBe(-1);
        });
    });

    describe("when placing a bet in the second half", () => {
        it("should round bet choices to the nearest integer", async () => {
            // Arrange
            const inGameData = await client.handleGameEvent((data) => data.remainingTime);
            const timeout = getTimeOutToBet(
                inGameData.remainingTime,
                gameSettings.durations.lockingBetSecondHalf,
                gameSettings.durations.placingBetsSecondHalf,
                gameSettings.durations.wholeRound,
            );

            const betChoice = "homeLive";

            // Act
            await placeBetAfterTimeout(betChoice, 100.8, timeout, client);
            const result = await client.handleGameEvent((data) => data.endBet);

            // Assert
            expect(result.endBet).toBe(100);
        });

        it("should allow betting only within placing bet duration", async () => {
            // Arrange
            const timeCanBet = new Set([2, 3, 4]);
            let check = {};
            const interval = setInterval(() => client?.sendInGameEvent(), 1000);
            const betChoice = "homeLive";

            // Act & Assert
            for (let count = 0; count < 12; ) {
                const inGameData = await client.handleGameEvent((data) => data.remainingTime);
                if (!check[inGameData.remainingTime]) {
                    check[inGameData.remainingTime] = true;
                    count++;
                }
                client.emit(eventTypes.bet, { betChoice, amount: 100 });
                const result = await client.handleGameEvent((data) => data.endBet);

                if (timeCanBet.has(inGameData.remainingTime)) {
                    expect(result.endBet).toBe(100);
                } else {
                    expect(result.endBet).toBe(-1);
                }
            }

            clearInterval(interval);
        });
    });
});
