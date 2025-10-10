import { Core } from "sc-game-base";
import { Event } from "odds-feed-client";

export default class GameStatusPublisher extends Core.BaseEventPublishers.GameStatusPublisher {
    publishOdds(odds: Record<string, number>) {
        this.publishToAllUsers({ odds });
    }

    publishBetChoicePoints(points: Record<string, number>) {
        this.publishToAllUsers({ points });
    }

    publishCurrentIndex(index: number) {
        this.publishToAllUsers({ currentIndex: index });
    }

    publishMatch(event: Event) {
        this.publishToAllUsers({ match: { home: event.eventNameAKey, away: event.eventNameBKey } });
    }
}
