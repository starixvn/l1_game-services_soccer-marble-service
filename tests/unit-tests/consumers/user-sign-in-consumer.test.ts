import { UserSignInConsumer } from "../../../src/consumers/user-sign-in-consumer";
import { TableUserSignInConsumer } from "sc-game-base/src/table/event-consumers";

describe("UserSignInConsumer", () => {
    let consumer: UserSignInConsumer & {
        userSignInPublisher: any;
        gameData: any;
        currentEventService: any;
        serverTimeDiffService: any;
    };
    const definition: any = {};
    const playGamePermissionValidator: any = {};
    const appConfigs: any = {};
    const socket: any = { id: "sock1" };

    beforeEach(() => {
        consumer = Object.create(UserSignInConsumer.prototype);
        consumer.userSignInPublisher = { publishUmNotice: jest.fn() };
        consumer.gameData = { umMessages: { code: "UM" }, roundId: undefined };
        consumer.currentEventService = { eventByEventId: {} };
        consumer.serverTimeDiffService = { now: Date.now() };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("constructor", () => {
        it("should set currentEventService and serverTimeDiffService", () => {
            // Arrange
            const gameData = { umMessages: {} } as any;
            const publisher = { publishUmNotice: jest.fn() } as any;
            const currentEventService = { tag: "svc" } as any;
            const serverTimeDiffService = { now: Date.now() } as any;

            // Act
            const instance = new UserSignInConsumer({
                definition,
                gameData,
                userSignInPublisher: publisher,
                playGamePermissionValidator,
                appConfigs,
                gameManagementApiClientFactory: { instance: jest.fn().mockReturnValue({}) },
                currentEventService,
                serverTimeDiffService,
            } as any);

            // Assert
            expect(instance.currentEventService).toBe(currentEventService);
            expect(instance.serverTimeDiffService).toBe(serverTimeDiffService);
        });
    });

    describe("consume", () => {
        it("should publish UM notice when roundId is missing", async () => {
            // Arrange
            consumer.gameData.roundId = undefined;

            // Act
            await consumer.consume(socket, {});

            // Assert
            expect(consumer.userSignInPublisher.publishUmNotice).toHaveBeenCalledWith(socket, consumer.gameData.umMessages);
        });

        it("should publish UM notice when current event is missing", async () => {
            // Arrange
            consumer.gameData.roundId = 100;
            consumer.currentEventService.eventByEventId = {};

            // Act
            await consumer.consume(socket, {});

            // Assert
            expect(consumer.userSignInPublisher.publishUmNotice).toHaveBeenCalledWith(socket, consumer.gameData.umMessages);
        });

        it("should publish UM notice when current event already ended", async () => {
            // Arrange
            const baseTime = Date.now();
            const eventEndTime = baseTime - 1000; // Event ended 1 second ago
            const currentTime = baseTime; // Current time is after event end time

            consumer.gameData.roundId = 101;
            consumer.serverTimeDiffService.now = currentTime;
            consumer.currentEventService.eventByEventId = {
                101: {
                    eventDetails: [
                        { resultsAvailableTs: new Date(eventEndTime) },
                    ],
                },
            };

            // Act
            await consumer.consume(socket, {});

            // Assert
            expect(consumer.userSignInPublisher.publishUmNotice).toHaveBeenCalledWith(socket, consumer.gameData.umMessages);
        });

        it("should call super.consume when event is still running", async () => {
            // Arrange
            const baseTime = Date.now();
            const eventEndTime = baseTime + 60 * 1000; // Event ends in 60 seconds
            const currentTime = baseTime; // Current time is before event end time

            consumer.gameData.roundId = 102;
            consumer.serverTimeDiffService.now = currentTime;
            consumer.currentEventService.eventByEventId = {
                102: {
                    eventDetails: [
                        { resultsAvailableTs: new Date(eventEndTime) },
                    ],
                },
            };
            const superConsumeSpy = jest.spyOn(TableUserSignInConsumer.prototype as any, "consume").mockResolvedValue(undefined as any);

            // Act
            await consumer.consume(socket, { data: 1 });

            // Assert
            expect(superConsumeSpy).toHaveBeenCalledWith(socket, { data: 1 });
            expect(consumer.userSignInPublisher.publishUmNotice).not.toHaveBeenCalled();
        });

        it("should call super.consume when event has multiple eventDetails and uses the last one", async () => {
            // Arrange
            const baseTime = Date.now();
            const firstEventEndTime = baseTime - 1000; // First event ended
            const lastEventEndTime = baseTime + 60 * 1000; // Last event ends in 60 seconds
            const currentTime = baseTime; // Current time is before last event end time

            consumer.gameData.roundId = 103;
            consumer.serverTimeDiffService.now = currentTime;
            consumer.currentEventService.eventByEventId = {
                103: {
                    eventDetails: [
                        { resultsAvailableTs: new Date(firstEventEndTime) },
                        { resultsAvailableTs: new Date(lastEventEndTime) },
                    ],
                },
            };
            const superConsumeSpy = jest.spyOn(TableUserSignInConsumer.prototype as any, "consume").mockResolvedValue(undefined as any);

            // Act
            await consumer.consume(socket, { data: 1 });

            // Assert
            expect(superConsumeSpy).toHaveBeenCalledWith(socket, { data: 1 });
            expect(consumer.userSignInPublisher.publishUmNotice).not.toHaveBeenCalled();
        });

        it("should publish UM notice when event has multiple eventDetails and the last one has ended", async () => {
            // Arrange
            const baseTime = Date.now();
            const firstEventEndTime = baseTime + 60 * 1000; // First event ends in 60 seconds
            const lastEventEndTime = baseTime - 1000; // Last event ended 1 second ago
            const currentTime = baseTime; // Current time is after last event end time

            consumer.gameData.roundId = 104;
            consumer.serverTimeDiffService.now = currentTime;
            consumer.currentEventService.eventByEventId = {
                104: {
                    eventDetails: [
                        { resultsAvailableTs: new Date(firstEventEndTime) },
                        { resultsAvailableTs: new Date(lastEventEndTime) },
                    ],
                },
            };

            // Act
            await consumer.consume(socket, {});

            // Assert
            expect(consumer.userSignInPublisher.publishUmNotice).toHaveBeenCalledWith(socket, consumer.gameData.umMessages);
        });
    });
});


