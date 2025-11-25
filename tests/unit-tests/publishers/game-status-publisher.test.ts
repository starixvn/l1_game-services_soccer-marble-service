import GameStatusPublisher from "../../../src/publishers/game-status-publisher";

describe("GameStatusPublisher", () => {
    let publisher: GameStatusPublisher;

    beforeEach(() => {
        publisher = Object.create(GameStatusPublisher.prototype);
        publisher.publishToAllUsers = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should publish odds to all users", () => {
        const odds = { home: 2, away: 3 };
        publisher.publishOdds(odds);
        expect(publisher.publishToAllUsers).toHaveBeenCalledWith({ odds });
    });

    it("should publish points to all users", () => {
        const points = { home: 1, away: 2 };
        publisher.publishBetChoicePoints(points);
        expect(publisher.publishToAllUsers).toHaveBeenCalledWith({ points });
    });

    it("should publish current index to all users", () => {
        publisher.publishCurrentIndex(3);
        expect(publisher.publishToAllUsers).toHaveBeenCalledWith({ currentIndex: 3 });
    });

    it("should publish match to all users", () => {
        const event = { eventNameAKey: "Team A", eventNameBKey: "Team B" } as any;
        publisher.publishMatch(event);
        expect(publisher.publishToAllUsers).toHaveBeenCalledWith({ match: { home: "Team A", away: "Team B" } });
    });
});


