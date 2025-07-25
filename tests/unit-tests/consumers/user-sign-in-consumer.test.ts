import { UserSignInConsumer } from "../../../src/consumers/user-sign-in-cosumer";
import { TableUserSignInConsumer } from "sc-game-base/src/table/event-consumers";
import { TableUserSignInPublisher } from "sc-game-base/src/table/event-publishers";
import { TableGameDefinition, TableGameData } from "sc-game-base/src/table";
import { Socket } from "socket.io";
import GameData from "../../../src/game-data";
import * as gameTimingHelper from "../../../src/helpers/game-timing";

jest.mock("../../../src/helpers/game-timing");

const mockedGameTimingHelper = gameTimingHelper as jest.Mocked<typeof gameTimingHelper>;

describe("UserSignInConsumer", () => {
    let userSignInConsumer: UserSignInConsumer;
    let mockDefinition: jest.Mocked<TableGameDefinition>;
    let mockGameData: jest.Mocked<GameData>;
    let mockUserSignInPublisher: jest.Mocked<TableUserSignInPublisher>;
    let mockPlayGamePermissionValidator: any;
    let mockAppConfigs: any;
    let mockGameManagementApiClientFactory: any;
    let mockSocketClient: jest.Mocked<Socket>;
    let mockPayload: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockDefinition = {} as jest.Mocked<TableGameDefinition>;
        mockGameData = {
            umMessages: { time: new Date(), message: "test message", displayKind: "info", gameName: "test", messages: {} }
        } as unknown as jest.Mocked<GameData>;
        mockUserSignInPublisher = {
            publishUmNotice: jest.fn()
        } as unknown as jest.Mocked<TableUserSignInPublisher>;
        mockPlayGamePermissionValidator = {};
        mockAppConfigs = {};
        mockGameManagementApiClientFactory = {
            instance: jest.fn()
        };
        mockSocketClient = {} as jest.Mocked<Socket>;
        mockPayload = { some: "payload" };

        userSignInConsumer = new UserSignInConsumer(
            mockDefinition,
            mockGameData,
            mockUserSignInPublisher,
            mockPlayGamePermissionValidator,
            mockAppConfigs,
            mockGameManagementApiClientFactory
        );

        mockedGameTimingHelper.isOddFeedAvailable.mockReturnValue(true);
    });

    it("should inherit from TableUserSignInConsumer", () => {
        // Assert
        expect(userSignInConsumer instanceof TableUserSignInConsumer).toBeTruthy();
    });

    describe("consume", () => {
        describe("when odd feed is not available", () => {
            it("should publish um notice and return early", async () => {
                // Arrange
                mockedGameTimingHelper.isOddFeedAvailable.mockReturnValue(false);
                const superConsumeSpy = jest.spyOn(TableUserSignInConsumer.prototype, "consume").mockResolvedValue();

                // Act
                await userSignInConsumer.consume(mockSocketClient, mockPayload);

                // Assert
                expect(mockedGameTimingHelper.isOddFeedAvailable).toHaveBeenCalledWith(mockGameData);
                expect(mockUserSignInPublisher.publishUmNotice).toHaveBeenCalledWith(mockSocketClient, mockGameData.umMessages);
                expect(superConsumeSpy).not.toHaveBeenCalled();
            });

            it("should call isOddFeedAvailable with gameData", async () => {
                // Arrange
                mockedGameTimingHelper.isOddFeedAvailable.mockReturnValue(false);

                // Act
                await userSignInConsumer.consume(mockSocketClient, mockPayload);

                // Assert
                expect(mockedGameTimingHelper.isOddFeedAvailable).toHaveBeenCalledWith(mockGameData);
            });

            it("should call publishUmNotice with socket client and um messages", async () => {
                // Arrange
                mockedGameTimingHelper.isOddFeedAvailable.mockReturnValue(false);

                // Act
                await userSignInConsumer.consume(mockSocketClient, mockPayload);

                // Assert
                expect(mockUserSignInPublisher.publishUmNotice).toHaveBeenCalledWith(mockSocketClient, mockGameData.umMessages);
            });
        });

        describe("when odd feed is available", () => {
            it("should call super.consume with socket client and payload", async () => {
                // Arrange
                mockedGameTimingHelper.isOddFeedAvailable.mockReturnValue(true);
                const superConsumeSpy = jest.spyOn(TableUserSignInConsumer.prototype, "consume").mockResolvedValue();

                // Act
                await userSignInConsumer.consume(mockSocketClient, mockPayload);

                // Assert
                expect(superConsumeSpy).toHaveBeenCalledWith(mockSocketClient, mockPayload);
            });

            it("should not call publishUmNotice when odd feed is available", async () => {
                // Arrange
                mockedGameTimingHelper.isOddFeedAvailable.mockReturnValue(true);
                jest.spyOn(TableUserSignInConsumer.prototype, "consume").mockResolvedValue();

                // Act
                await userSignInConsumer.consume(mockSocketClient, mockPayload);

                // Assert
                expect(mockUserSignInPublisher.publishUmNotice).not.toHaveBeenCalled();
            });

            it("should return result from super.consume", async () => {
                // Arrange
                mockedGameTimingHelper.isOddFeedAvailable.mockReturnValue(true);
                jest.spyOn(TableUserSignInConsumer.prototype, "consume").mockResolvedValue();

                // Act
                const result = await userSignInConsumer.consume(mockSocketClient, mockPayload);

                // Assert
                expect(result).toBeUndefined();
            });
        });

        describe("edge cases", () => {
            it("should handle undefined umMessages", async () => {
                // Arrange
                (mockGameData as any).umMessages = undefined;
                mockedGameTimingHelper.isOddFeedAvailable.mockReturnValue(false);

                // Act
                await userSignInConsumer.consume(mockSocketClient, mockPayload);

                // Assert
                expect(mockUserSignInPublisher.publishUmNotice).toHaveBeenCalledWith(mockSocketClient, undefined);
            });

            it("should handle null umMessages", async () => {
                // Arrange
                (mockGameData as any).umMessages = null;
                mockedGameTimingHelper.isOddFeedAvailable.mockReturnValue(false);

                // Act
                await userSignInConsumer.consume(mockSocketClient, mockPayload);

                // Assert
                expect(mockUserSignInPublisher.publishUmNotice).toHaveBeenCalledWith(mockSocketClient, null);
            });

            it("should handle empty umMessages", async () => {
                // Arrange
                (mockGameData as any).umMessages = { time: new Date(), message: "", displayKind: "info", gameName: "", messages: {} };
                mockedGameTimingHelper.isOddFeedAvailable.mockReturnValue(false);

                // Act
                await userSignInConsumer.consume(mockSocketClient, mockPayload);

                // Assert
                expect(mockUserSignInPublisher.publishUmNotice).toHaveBeenCalledWith(mockSocketClient, { time: new Date(), message: "", displayKind: "info", gameName: "", messages: {} });
            });

            it("should handle undefined payload", async () => {
                // Arrange
                mockedGameTimingHelper.isOddFeedAvailable.mockReturnValue(true);
                const superConsumeSpy = jest.spyOn(TableUserSignInConsumer.prototype, "consume").mockResolvedValue();

                // Act
                await userSignInConsumer.consume(mockSocketClient, undefined);

                // Assert
                expect(superConsumeSpy).toHaveBeenCalledWith(mockSocketClient, undefined);
            });

            it("should handle null payload", async () => {
                // Arrange
                mockedGameTimingHelper.isOddFeedAvailable.mockReturnValue(true);
                const superConsumeSpy = jest.spyOn(TableUserSignInConsumer.prototype, "consume").mockResolvedValue();

                // Act
                await userSignInConsumer.consume(mockSocketClient, null);

                // Assert
                expect(superConsumeSpy).toHaveBeenCalledWith(mockSocketClient, null);
            });

            it("should handle empty payload", async () => {
                // Arrange
                mockedGameTimingHelper.isOddFeedAvailable.mockReturnValue(true);
                const superConsumeSpy = jest.spyOn(TableUserSignInConsumer.prototype, "consume").mockResolvedValue();

                // Act
                await userSignInConsumer.consume(mockSocketClient, {});

                // Assert
                expect(superConsumeSpy).toHaveBeenCalledWith(mockSocketClient, {});
            });
        });
    });
});
