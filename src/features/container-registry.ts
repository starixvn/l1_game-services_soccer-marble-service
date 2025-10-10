import { DelayHandlingService } from "./delay/delay-handling-service";
import { CurrentEventService } from "./current-event/current-event-service";
import { DiContainer } from "odds-feed-client/container";
import { Event } from "odds-feed-client";
import { init, register } from "odds-feed-client/dependency-injection"
import gameSettings from "../game-settings";
import { BetStatusService } from "./bet-status/bet-status-service";
import { HedgeBetService } from "./bet-status/hedge-bet-service";
import { CheckStatusService } from "./check-status/check-status-service";
import { ResultService } from "./result/result-service";


export interface DelayHandlerContainer {
    delayHandlingService: DelayHandlingService;
    currentEventService: CurrentEventService;
}

export type MarbleEvent = Event & {
    operatorGameId?: string;
 }

export function registerFeatures(diContainer: DiContainer) {

    register<MarbleEvent>(diContainer, {
        oddsFeedFilter,
    });

    diContainer.register({
        key: 'currentEventService',
        registerType: 'class',
        value: CurrentEventService,
        disposer: service => service.dispose(),
    });
    diContainer.register({
        key: 'delayHandlingService',
        registerType: 'class',
        value: DelayHandlingService,
        disposer: service => service.dispose(),
    });

    diContainer.register({
        key: 'betStatusService',
        registerType: 'class',
        value: BetStatusService,
        disposer: service => service.dispose(),
    });
    diContainer.register({
        key: 'hedgeBetService',
        registerType: 'class',
        value: HedgeBetService,
    });
    diContainer.register({
        key: 'checkStatusService',
        registerType: 'class',
        value: CheckStatusService,
        disposer: service => service.dispose(),
    });

    diContainer.register({
        key: 'resultService',
        registerType: 'class',
        value: ResultService,
        disposer: service => service.dispose(),
    });
};

export function oddsFeedFilter(event: MarbleEvent) {
    return event.operatorGameId === gameSettings.id.toString();
}

export function initFeatures(container: DiContainer) {
    init(container);
    container.resolve<DelayHandlingService>('delayHandlingService').initEvent();
    container.resolve<CurrentEventService>('currentEventService').initEvent();
    container.resolve<BetStatusService>('betStatusService').initEvent();
    container.resolve<CheckStatusService>('checkStatusService').initEvent();
    container.resolve<ResultService>('resultService').initEvent();
}
