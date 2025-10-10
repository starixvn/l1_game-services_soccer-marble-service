jest.mock("odds-feed-client/dependency-injection", () => ({ init: jest.fn(), register: jest.fn() }));
import { registerFeatures, oddsFeedFilter, initFeatures, disposer } from "../../../src/features/container-registry";
import gameSettings from "../../../src/game-settings";

describe("features/container-registry", () => {
    describe("registerFeatures", () => {
        it("should register all services with disposer when defined", () => {
            const di = {
                register: jest.fn(),
            } as any;

            registerFeatures(di);

            // Expect multiple registrations
            expect(di.register).toHaveBeenCalledWith(expect.objectContaining({ key: 'currentEventService', registerType: 'class' }));
            expect(di.register).toHaveBeenCalledWith(expect.objectContaining({ key: 'delayHandlingService', registerType: 'class' }));
            expect(di.register).toHaveBeenCalledWith(expect.objectContaining({ key: 'betStatusService', registerType: 'class' }));
            expect(di.register).toHaveBeenCalledWith(expect.objectContaining({ key: 'hedgeBetService', registerType: 'class' }));
            expect(di.register).toHaveBeenCalledWith(expect.objectContaining({ key: 'checkStatusService', registerType: 'class' }));
            expect(di.register).toHaveBeenCalledWith(expect.objectContaining({ key: 'resultService', registerType: 'class' }));
        });
    });

    describe("oddsFeedFilter", () => {
        it("should return true when operatorGameId matches gameSettings.id", () => {
            const event = { operatorGameId: gameSettings.id.toString() } as any;
            expect(oddsFeedFilter(event)).toBe(true);
        });

        it("should return false when operatorGameId does not match", () => {
            const event = { operatorGameId: "-1" } as any;
            expect(oddsFeedFilter(event)).toBe(false);
        });
    });

    describe("initFeatures", () => {
        it("should initEvent on all resolved services", () => {
            const delayHandlingService = { initEvent: jest.fn() };
            const currentEventService = { initEvent: jest.fn() };
            const betStatusService = { initEvent: jest.fn() };
            const checkStatusService = { initEvent: jest.fn() };
            const resultService = { initEvent: jest.fn() };

            const container = {
                resolve: jest.fn((key: string) => {
                    switch (key) {
                        case 'delayHandlingService': return delayHandlingService;
                        case 'currentEventService': return currentEventService;
                        case 'betStatusService': return betStatusService;
                        case 'checkStatusService': return checkStatusService;
                        case 'resultService': return resultService;
                        default: return undefined;
                    }
                }),
            } as any;

            initFeatures(container);

            expect(delayHandlingService.initEvent).toHaveBeenCalled();
            expect(currentEventService.initEvent).toHaveBeenCalled();
            expect(betStatusService.initEvent).toHaveBeenCalled();
            expect(checkStatusService.initEvent).toHaveBeenCalled();
            expect(resultService.initEvent).toHaveBeenCalled();
        });
    });

    describe("disposer", () => {
        it("should dispose the service", () => {
            const service = { dispose: jest.fn() };
            disposer(service);
            expect(service.dispose).toHaveBeenCalled();
        });
    });
});
