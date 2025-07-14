import { stub } from "jest-auto-stub";
import GameStatusPublisher from "../../../src/publishers/game-status-publisher";
import GameData from "../../../src/game-data";

describe("GameStatusPublisher", () => {
    let publisher: GameStatusPublisher;
    const gameData = stub<GameData>();

    beforeEach(() => {
        publisher = new GameStatusPublisher("marblefootball2", gameData);
        publisher.publishToAllUsers = jest.fn();
    });

    describe("publishOdds", () => {
        it("should publish odds to all users with correct format", () => {
            const testOdds = {
                team1: 1.5,
                team2: 2.8,
            };

            publisher.publishOdds(testOdds);

            expect(publisher.publishToAllUsers).toHaveBeenCalledWith({
                odds: testOdds,
            });
        });
    });
});
