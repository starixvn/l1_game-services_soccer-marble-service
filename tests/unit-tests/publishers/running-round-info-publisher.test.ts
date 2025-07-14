import { stub } from "jest-auto-stub";
import GameData from "../../../src/game-data";
import { RunningRoundInfoPublisher } from "../../../src/publishers";
import * as helper from "../../../src/helpers/bet-percentage";
import { RunningRoundInfoPublisher as RunningRoundInfoPublisherBase } from "sc-game-base/src/core/event-publishers";

describe("RunningRoundInfoPublisher", () => {
    let publisher: RunningRoundInfoPublisher;

    const gameData = stub<GameData>();

    beforeEach(() => {
        publisher = new RunningRoundInfoPublisher("marbleFootball2", gameData);
        publisher.publishToAllUsers = jest.fn();
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should call super.publish() when publish() is invoked", () => {
        const superPublishSpy = jest.spyOn(RunningRoundInfoPublisherBase.prototype, "publish").mockImplementation();
        const publishBetPercentageSpy = jest.spyOn(publisher, "publishBetPercentage");

        publisher.publish();

        expect(superPublishSpy).toHaveBeenCalledTimes(1);
        expect(publishBetPercentageSpy).toHaveBeenCalledTimes(1);
    });

    it("should call getUserBetPercentage with the correct playerBetCount and bet choices", () => {
        // Arrange
        const mockGameData = {
            playerBetCount: { home: 10, away: 20, draw: 30 },
            remainingTime: 100,
        } as any;
        publisher.gameData = mockGameData;

        jest.spyOn(helper, "getUserBetPercentage");

        // Act
        publisher.publishBetPercentage();

        // Assert
        expect(helper.getUserBetPercentage).toHaveBeenCalledWith(mockGameData.playerBetCount);
    });

    it("should publish userBetPercentage to all users when at least one bet exists", () => {
        // Arrange
        const mockGameData = {
            playerBetCount: { A: 10, B: 0, C: 5 },
            remainingTime: 100,
        } as any;
        publisher.gameData = mockGameData;

        const mockUserBetPercentage = { A: 66.67, B: 0, C: 33.33 };

        jest.spyOn(helper, "getUserBetPercentage").mockReturnValue(mockUserBetPercentage);

        // Act
        publisher.publishBetPercentage();

        // Assert
        expect(publisher.publishToAllUsers).toHaveBeenCalledWith({ userBetPercentage: mockUserBetPercentage });
    });

    it("should not publish anything if all percentage values are zero", () => {
        // Arrange
        const mockGameData = {
            playerBetCount: { A: 0, B: 0, C: 0 },
            remainingTime: 100,
        } as any;
        publisher.gameData = mockGameData;

        const mockUserBetPercentage = { A: 0, B: 0, C: 0 };

        jest.spyOn(helper, "getUserBetPercentage").mockReturnValue(mockUserBetPercentage);

        // Act
        publisher.publishBetPercentage();

        //Assert
        expect(publisher.publishToAllUsers).not.toHaveBeenCalled();
    });
});
