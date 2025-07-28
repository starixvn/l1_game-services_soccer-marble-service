import { GameClientDriver, normalUser, eventTypes } from "sc-game-service-integration-utils";
import { initUserSession } from "../../helper/helper";
import { socketOptionsFunc } from "../../_stubs/test-data";
import appConfigs from "../../../../build/app-configs.IGT";
import { dateWithOffset, FLOW, INCOMING, CONFIGURED_DATE } from "../../shared";

const socketOptions = socketOptionsFunc(appConfigs.hostingPort);

const LOCKBET_OFFSET = -3000;

const timeStamps = {
    firstHalf: {
        startPlaceBet: dateWithOffset(CONFIGURED_DATE, FLOW.scheduleStart + INCOMING),
    },
    secondHalf: {
        startPlaceBet: dateWithOffset(CONFIGURED_DATE, FLOW.h2OddAvailable + INCOMING),
    },
    settle: dateWithOffset(CONFIGURED_DATE, FLOW.h2ResultAvailable + INCOMING),
}

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
    describe("within betting time 1h", () => {
        let client;

        beforeEach(async () => {
            client = new GameClientDriver(socketOptions, initUserSession(normalUser));
            await signInClient(client);
        });
    
        afterEach(() => {
            client.close();
            client = null;
        });
        describe("invalid bet", () => {
            const handleEndBetCallback = (data) => data.endBet;
            it("endbet", async () => {
                // Arrange
                const betChoie = "1:ft_hdp_home"
                const time = timeStamps.firstHalf.startPlaceBet + 1000 - Date.now();

                // Act
                await placeBetAfterTimeout(betChoie, 100.8, time / 1000, client);

                // Assert
                const result = await client.handleGameEvent(handleEndBetCallback);
                console.log(result);
                expect(result.endBet).toBe(-1);
                expect(result.notice).toStrictEqual({ errorCode: 'SB1935' })
            });
        })

        describe("valid bet", () => {
            const handleOwnBetsCallback = (data) => data.ownBets;
            it("ownsBets", async () => {
                // Arrange
                const betChoie = "0:ft_hdp_home"
                const time = timeStamps.firstHalf.startPlaceBet + 1000 - Date.now();

                // Act
                await placeBetAfterTimeout(betChoie, 100.8, time / 1000, client);

                // Assert
                const result = await client.handleGameEvent(handleOwnBetsCallback);
                console.log(result);
                expect(result.ownBets).toStrictEqual({ '0:ft_hdp_home': 100 })
            })
        });

        describe("not valid betting time", () => {
            const pingRemainingTimeCallback = () => client?.sendInGameEvent();
            const handleRemainingTimeCallback = (data) => data.remainingTime;
            const handleEndBetCallback = (data) => data.endBet;
            it("endbet", async () => {
                // Arrange
                
                const timeBet = new Set([22])
                const interval = setInterval(pingRemainingTimeCallback, 500);
                let result = null;

                // Act
                while (true) {
                    const inGameData = await client.handleGameEvent(handleRemainingTimeCallback);
                    if (timeBet.has(inGameData.remainingTime)) {
                        await placeBetAfterTimeout("0:ft_hdp_home", 100.8, 0, client);
                        result = await client.handleGameEvent(handleEndBetCallback);
                        break;
                    }
                }
                clearInterval(interval);
                // Assert
                expect(result.endBet).toBe(-1);
                expect(result.notice).toStrictEqual({ errorCode: 'SB1905' })
            })
        })
    });
});
