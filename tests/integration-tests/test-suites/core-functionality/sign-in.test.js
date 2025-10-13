import { initUserSession } from "../../helper/helper";
import { GameClientDriver, normalUser } from "sc-game-service-integration-utils";
import { socketOptionsFunc } from "../../_stubs/test-data";
import appConfigs from "../../../../build/app-configs.IGT";

const socketOptions = socketOptionsFunc(appConfigs.hostingPort);

describe("signin", () => {

    let client;
    let sendSignInInterval;
    beforeAll(async () => {
        client = new GameClientDriver(socketOptions, initUserSession(normalUser));
    });

    afterAll(() => {
        client.socket.disconnect();
        clearInterval(sendSignInInterval);
    });

    it("should receive signed in response", async () => {
        //Arrange & Act
        sendSignInInterval = setInterval(() => {
            client.sendSignInEvent();
        }, 500);

        // Act
        await client.handleSignedInEvent();
    });
});
