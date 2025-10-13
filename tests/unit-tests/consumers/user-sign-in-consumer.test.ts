import { UserSignInConsumer } from "../../../src/consumers/user-sign-in-consumer";
import { TableUserSignInConsumer } from "sc-game-base/src/table/event-consumers";

describe("UserSignInConsumer", () => {
    let consumer: UserSignInConsumer & {
        userSignInPublisher: any;
        gameData: any;
        currentEventService: any;
    };
    const definition: any = {};
    const playGamePermissionValidator: any = {};
    const appConfigs: any = {};
    const gameManagementApiClientFactory: any = { instance: jest.fn().mockReturnValue({}) };
    const socket: any = { id: "sock1" };

    beforeEach(() => {
        consumer = Object.create(UserSignInConsumer.prototype) as any;
        consumer.userSignInPublisher = { publishUmNotice: jest.fn() };
        consumer.gameData = { umMessages: { code: "UM" }, roundId: undefined };
        consumer.currentEventService = { eventByEventId: {} };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("constructor", () => {
        it("should set currentEventService", () => {
            // Arrange
            const gameData = { umMessages: {} } as any;
            const publisher = { publishUmNotice: jest.fn() } as any;
            const currentEventService = { tag: "svc" } as any;

            // Act
            const instance = new UserSignInConsumer({
                definition,
                gameData,
                userSignInPublisher: publisher,
                playGamePermissionValidator,
                appConfigs,
                gameManagementApiClientFactory: { instance: jest.fn().mockReturnValue({}) },
                currentEventService,
            } as any);

            // Assert
            expect(instance.currentEventService).toBe(currentEventService);
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
            consumer.gameData.roundId = 101;
            consumer.currentEventService.eventByEventId = {
                101: {
                    eventDetails: [
                        { resultsAvailableTs: new Date(Date.now() - 1000) },
                    ],
                },
            };

            // Act
            await consumer.consume(socket, {});

            // Assert
            expect(consumer.userSignInPublisher.publishUmNotice).toHaveBeenCalledWith(socket, consumer.gameData.umMessages);
        });

        it("should call super.consume when odd feed is available", async () => {
            // Arrange
            consumer.gameData.roundId = 102;
            consumer.currentEventService.eventByEventId = {
                102: {
                    eventDetails: [
                        { resultsAvailableTs: new Date(Date.now() + 60 * 1000) },
                    ],
                },
            };
            const superConsumeSpy = jest.spyOn(TableUserSignInConsumer.prototype as any, "consume").mockResolvedValue(undefined as any);

            // Act
            await consumer.consume(socket, { data: 1 });

            // Assert
            expect(superConsumeSpy).toHaveBeenCalledWith(socket, { data: 1 });
        });
    });
});


