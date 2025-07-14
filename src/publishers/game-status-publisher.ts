import { Core } from "sc-game-base";

export default class GameStatusPublisher extends Core.BaseEventPublishers.GameStatusPublisher {
    publishOdds(odds: Record<string, number>) {
        this.publishToAllUsers({ odds });
    }
}
