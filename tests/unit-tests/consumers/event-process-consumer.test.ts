import { EventProcessConsumer, ProcessingEventContext } from "../../../src/consumers/event-process-consumer";
import { SchedulerConsumer } from "../../../src/consumers/scheduler-consumer";
import { OddFeedConsumer, ScheduleResponseItem, EventResponse, EventDetail } from "../../../src/consumers/odd-feed-consumer";
import GameData from "../../../src/game-data";
import { GameStatusPublisher, RunningRoundInfoPublisher } from "../../../src/publishers";
import * as eventIdHelper from "../../../src/helpers/eventid";
import * as gameTimingHelper from "../../../src/helpers/game-timing";
import SettleGameRoundConsumer from "../../../src/consumers/settle-game-round-consumer";

jest.mock("../../../src/helpers/eventid");
jest.mock("../../../src/helpers/game-timing");
jest.mock("../../../src/publishers");

const mockedEventIdHelper = eventIdHelper as jest.Mocked<typeof eventIdHelper>;
const mockedGameTimingHelper = gameTimingHelper as jest.Mocked<typeof gameTimingHelper>;

describe("EventProcessConsumer", () => {
    let eventProcessConsumer: EventProcessConsumer;
    let mockGameData: jest.Mocked<GameData>;
    let mockSchedulerConsumer: jest.Mocked<SchedulerConsumer>;
    let mockOddFeedConsumer: jest.Mocked<OddFeedConsumer>;
    let mockGameStatusPublisher: jest.Mocked<GameStatusPublisher>;
    let mockRunningRoundInfoPublisher: jest.Mocked<RunningRoundInfoPublisher>;
    let mockSettleGameRoundConsumer: jest.Mocked<SettleGameRoundConsumer>;
    let mockContainer: {
        gameData: jest.Mocked<GameData>;
        schedulerConsumer: jest.Mocked<SchedulerConsumer>;
        oddFeedConsumer: jest.Mocked<OddFeedConsumer>;
        appConfigs: {
            oddFeed: {
                gameId: number;
            };
        };
        gameStatusPublisher: jest.Mocked<GameStatusPublisher>;
        runningRoundInfoPublisher: jest.Mocked<RunningRoundInfoPublisher>;
        settleGameRoundConsumer: jest.Mocked<SettleGameRoundConsumer>;
    };

    const mockScheduleResponseItem: ScheduleResponseItem = {
        eventID: 12345,
        eventNameAKey: "Team A",
        eventNameBKey: "Team B",
        scheduleStartTs: new Date(Date.now() + 60000),
        productCode: "SOCCER",
        productTypeKey: "MATCH"
    };

    const mockEventDetail: EventDetail = {
        eventID: 12345,
        scheduleStartTs: new Date(Date.now() + 60000),
        oddsAvailableTs: new Date(Date.now() + 30000),
        resultsAvailableTs: new Date(Date.now() + 120000),
        hasResults: false,
        playlist: "test-playlist",
        goalInfo: "test-goal-info",
        result: "1:0",
        markets: [
            {
                marketID: 1,
                marketNameKey: "match_result",
                marketName: "Match Result",
                selections: [
                    { 
                        betChoice: "home", 
                        price: 2.0,
                        point: 1.5,
                        settlementStatus: "active",
                        selectionID: 1,
                        selectionNameLongKey: "home_team",
                        name: "Home Team"
                    },
                    { 
                        betChoice: "away", 
                        price: 3.0,
                        point: 2.0,
                        settlementStatus: "active",
                        selectionID: 2,
                        selectionNameLongKey: "away_team",
                        name: "Away Team"
                    },
                    { 
                        betChoice: "draw", 
                        price: 2.5,
                        point: 1.8,
                        settlementStatus: "active",
                        selectionID: 3,
                        selectionNameLongKey: "draw",
                        name: "Draw"
                    }
                ]
            }
        ]
    };

    const mockEventResponse: EventResponse = {
        eventID: 12345,
        eventNameAKey: "Team A",
        eventNameBKey: "Team B",
        scheduleStartTs: new Date(Date.now() + 60000),
        productCode: "SOCCER",
        productTypeKey: "MATCH",
        eventDetails: [mockEventDetail]
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockGameData = {
            disabled: false,
            oddFeedGames: {
                123: {
                    rounds: {},
                    currentRound: undefined,
                    currentEventDetailIndex: undefined
                }
            },
            roundId: 0,
            remainingTime: 0,
            dynamicOdds: {},
            betChoicePoints: {}
        } as Partial<GameData> as GameData;

        mockSchedulerConsumer = {
            schedule: jest.fn()
        } as unknown as jest.Mocked<SchedulerConsumer>;

        mockOddFeedConsumer = {
            getSchedule: jest.fn(),
            getEvent: jest.fn()
        } as unknown as jest.Mocked<OddFeedConsumer>;

        mockGameStatusPublisher = {
            publishStartPlacingBetStatus: jest.fn(),
            publishEndPlacingBetStatus: jest.fn(),
            publishOdds: jest.fn(),
            publishMatch: jest.fn(),
            publishToAllUsers: jest.fn()
        } as unknown as jest.Mocked<GameStatusPublisher>;

        mockRunningRoundInfoPublisher = {
            publishToAllUsers: jest.fn()
        } as unknown as jest.Mocked<RunningRoundInfoPublisher>;

        mockSettleGameRoundConsumer = {
            settleSpecificRound: jest.fn()
        } as unknown as jest.Mocked<SettleGameRoundConsumer>;

        mockContainer = {
            gameData: mockGameData,
            schedulerConsumer: mockSchedulerConsumer,
            oddFeedConsumer: mockOddFeedConsumer,
            appConfigs: {
                oddFeed: {
                    gameId: 123
                }
            },
            gameStatusPublisher: mockGameStatusPublisher,
            runningRoundInfoPublisher: mockRunningRoundInfoPublisher,
            settleGameRoundConsumer: mockSettleGameRoundConsumer
        };

        eventProcessConsumer = new EventProcessConsumer(mockContainer);

        mockedEventIdHelper.extractGameId.mockReturnValue(123);
        mockedEventIdHelper.extractRoundId.mockReturnValue(456);
        mockedEventIdHelper.getCurrentMatch.mockReturnValue(mockEventDetail);
        mockedGameTimingHelper.getEventOffset.mockImplementation((date: Date, offset?: number) => {
            if (offset !== undefined) {
                return new Date(date.getTime() + offset);
            }
            return date;
        });
    });

    describe("init", () => {
        it("should initialize game data with gameId and oddFeedGames structure", async () => {
            // Arrange
            mockGameData.gameId = undefined;
            mockGameData.oddFeedGames = {};

            // Act
            await eventProcessConsumer.init();

            // Assert
            expect(mockGameData.gameId).toBe(123);
        });

        it("should create oddFeedGames structure for gameId", async () => {
            // Arrange
            mockGameData.gameId = undefined;
            mockGameData.oddFeedGames = {};

            // Act
            await eventProcessConsumer.init();

            // Assert
            expect(mockGameData.oddFeedGames[123]).toEqual({
                rounds: {}
            });
        });
    });

    describe("proceed", () => {
        describe("game disabled", () => {
            it("should do nothing when game is disabled", async () => {
                // Arrange
                mockGameData.disabled = true;

                // Act
                await eventProcessConsumer.proceed();

                // Assert
                expect(mockOddFeedConsumer.getSchedule).not.toHaveBeenCalled();
            });
        });

        describe("game enabled", () => {
            it("should process each event in pulled schedule", async () => {
                // Arrange
                const mockSchedule = [mockScheduleResponseItem];
                mockOddFeedConsumer.getSchedule.mockResolvedValue(mockSchedule);
                mockOddFeedConsumer.getEvent.mockResolvedValue(mockEventResponse);

                // Act
                await eventProcessConsumer.proceed();

                // Assert
                expect(mockOddFeedConsumer.getSchedule).toHaveBeenCalledTimes(1);
            });

            it("should call getEvent for each schedule item", async () => {
                // Arrange
                const mockSchedule = [mockScheduleResponseItem];
                mockOddFeedConsumer.getSchedule.mockResolvedValue(mockSchedule);
                mockOddFeedConsumer.getEvent.mockResolvedValue(mockEventResponse);

                // Act
                await eventProcessConsumer.proceed();

                // Assert
                expect(mockOddFeedConsumer.getEvent).toHaveBeenCalledWith({ eventID: 12345 });
            });
        });
    });

    describe("processEvent", () => {
        describe("no game id match", () => {
            it("should return early when game id does not match", async () => {
                // Arrange
                mockedEventIdHelper.extractGameId.mockReturnValue(999);

                // Act
                await eventProcessConsumer.processEvent(mockScheduleResponseItem);

                // Assert
                expect(mockOddFeedConsumer.getEvent).not.toHaveBeenCalled();
            });
        });

        describe("event in the past", () => {
            it("should skip event when schedule start time is in the past", async () => {
                // Arrange
                const pastEvent = { ...mockScheduleResponseItem, scheduleStartTs: new Date(Date.now() - 60000) };

                // Act
                await eventProcessConsumer.processEvent(pastEvent);

                // Assert
                expect(mockOddFeedConsumer.getEvent).not.toHaveBeenCalled();
            });
        });

        describe("event already processed", () => {
            it("should return early when event is already processed", async () => {
                // Arrange
                mockGameData.oddFeedGames[123] = {
                    rounds: { 456: mockEventResponse }
                };

                // Act
                await eventProcessConsumer.processEvent(mockScheduleResponseItem);

                // Assert
                expect(mockOddFeedConsumer.getEvent).not.toHaveBeenCalled();
            });
        });

        describe("new event", () => {
            it("should call getEvent for new event", async () => {
                // Arrange
                mockOddFeedConsumer.getEvent.mockResolvedValue(mockEventResponse);

                // Act
                await eventProcessConsumer.processEvent(mockScheduleResponseItem);

                // Assert
                expect(mockOddFeedConsumer.getEvent).toHaveBeenCalledWith({ eventID: 12345 });
            });

            it("should store event in game data", async () => {
                // Arrange
                mockOddFeedConsumer.getEvent.mockResolvedValue(mockEventResponse);

                // Act
                await eventProcessConsumer.processEvent(mockScheduleResponseItem);

                // Assert
                expect(mockGameData.oddFeedGames[123].rounds[456]).toEqual(mockEventResponse);
            });

            it("should schedule all event timings", async () => {
                // Arrange
                mockOddFeedConsumer.getEvent.mockResolvedValue(mockEventResponse);

                // Act
                await eventProcessConsumer.processEvent(mockScheduleResponseItem);

                // Assert
                expect(mockSchedulerConsumer.schedule).toHaveBeenCalledTimes(5);
            });
        });
    });

    describe("updateAndGetRemainingTime", () => {
        it("should return 0 when no current round", () => {
            // Arrange
            mockGameData.oddFeedGames[123] = { rounds: {}, currentRound: undefined };

            // Act
            const result = eventProcessConsumer.updateAndGetRemainingTime();

            // Assert
            expect(result).toBe(0);
        });

        it("should return 0 when no last round result available time", () => {
            // Arrange
            const incompleteEventDetail = { ...mockEventDetail, resultsAvailableTs: undefined as any };
            const incompleteEventResponse = { ...mockEventResponse, eventDetails: [incompleteEventDetail] };
            mockGameData.oddFeedGames[123] = {
                currentRound: 456,
                rounds: {
                    456: incompleteEventResponse
                }
            };

            // Act
            const result = eventProcessConsumer.updateAndGetRemainingTime();

            // Assert
            expect(result).toBe(0);
        });

        it("should calculate remaining time correctly", () => {
            // Arrange
            const futureTime = new Date(Date.now() + 60000);
            const eventDetailWithFutureTime = { ...mockEventDetail, resultsAvailableTs: futureTime };
            const eventResponseWithFutureTime = { ...mockEventResponse, eventDetails: [eventDetailWithFutureTime] };
            mockGameData.oddFeedGames[123] = {
                currentRound: 456,
                rounds: {
                    456: eventResponseWithFutureTime
                }
            };

            // Act
            const result = eventProcessConsumer.updateAndGetRemainingTime();

            // Assert
            expect(result).toBeGreaterThan(0);
        });

        it("should update game data remaining time", () => {
            // Arrange
            const futureTime = new Date(Date.now() + 60000);
            const eventDetailWithFutureTime = { ...mockEventDetail, resultsAvailableTs: futureTime };
            const eventResponseWithFutureTime = { ...mockEventResponse, eventDetails: [eventDetailWithFutureTime] };
            mockGameData.oddFeedGames[123] = {
                currentRound: 456,
                rounds: {
                    456: eventResponseWithFutureTime
                }
            };

            // Act
            const result = eventProcessConsumer.updateAndGetRemainingTime();

            // Assert
            expect(mockGameData.remainingTime).toBe(result);
        });
    });

    describe("onScheduleStart", () => {
        it("should update roundId in game data", async () => {
            // Arrange
            const context: ProcessingEventContext = {
                fullEvent: mockEventResponse,
                eventDetail: mockEventDetail,
                index: 0,
                time: new Date()
            };
            mockOddFeedConsumer.getEvent.mockResolvedValue(mockEventResponse);

            // Act
            await eventProcessConsumer.onScheduleStart(context);

            // Assert
            expect(mockGameData.roundId).toBe(456);
        });

        it("should update current round in oddFeedGames", async () => {
            // Arrange
            const context: ProcessingEventContext = {
                fullEvent: mockEventResponse,
                eventDetail: mockEventDetail,
                index: 0,
                time: new Date()
            };
            mockOddFeedConsumer.getEvent.mockResolvedValue(mockEventResponse);

            // Act
            await eventProcessConsumer.onScheduleStart(context);

            // Assert
            expect(mockGameData.oddFeedGames[123].currentRound).toBe(456);
        });

        it("should update current event detail index", async () => {
            // Arrange
            const context: ProcessingEventContext = {
                fullEvent: mockEventResponse,
                eventDetail: mockEventDetail,
                index: 0,
                time: new Date()
            };
            mockOddFeedConsumer.getEvent.mockResolvedValue(mockEventResponse);

            // Act
            await eventProcessConsumer.onScheduleStart(context);

            // Assert
            expect(mockGameData.oddFeedGames[123].currentEventDetailIndex).toBe(0);
        });

        it("should call syncEventDetail", async () => {
            // Arrange
            const context: ProcessingEventContext = {
                fullEvent: mockEventResponse,
                eventDetail: mockEventDetail,
                index: 0,
                time: new Date()
            };
            mockOddFeedConsumer.getEvent.mockResolvedValue(mockEventResponse);

            // Act
            await eventProcessConsumer.onScheduleStart(context);

            // Assert
            expect(mockOddFeedConsumer.getEvent).toHaveBeenCalledWith({ eventID: 12345 });
        });

        it("should publish start placing bet status", async () => {
            // Arrange
            const context: ProcessingEventContext = {
                fullEvent: mockEventResponse,
                eventDetail: mockEventDetail,
                index: 0,
                time: new Date()
            };
            mockOddFeedConsumer.getEvent.mockResolvedValue(mockEventResponse);

            // Act
            await eventProcessConsumer.onScheduleStart(context);

            // Assert
            expect(mockGameStatusPublisher.publishStartPlacingBetStatus).toHaveBeenCalledTimes(1);
        });

        it("should publish odds", async () => {
            // Arrange
            const context: ProcessingEventContext = {
                fullEvent: mockEventResponse,
                eventDetail: mockEventDetail,
                index: 0,
                time: new Date()
            };
            mockOddFeedConsumer.getEvent.mockResolvedValue(mockEventResponse);

            // Act
            await eventProcessConsumer.onScheduleStart(context);

            // Assert
            expect(mockGameStatusPublisher.publishOdds).toHaveBeenCalledTimes(1);
        });

        it("should publish match information", async () => {
            // Arrange
            const context: ProcessingEventContext = {
                fullEvent: mockEventResponse,
                eventDetail: mockEventDetail,
                index: 0,
                time: new Date()
            };
            mockOddFeedConsumer.getEvent.mockResolvedValue(mockEventResponse);

            // Act
            await eventProcessConsumer.onScheduleStart(context);

            // Assert
            expect(mockGameStatusPublisher.publishMatch).toHaveBeenCalledWith({ home: "Team A", away: "Team B" });
        });
    });

    describe("onOddAvailable", () => {
        describe("first event detail", () => {
            it("should return early for first event detail", async () => {
                // Arrange
                const context: ProcessingEventContext = {
                    fullEvent: mockEventResponse,
                    eventDetail: mockEventDetail,
                    index: 0,
                    time: new Date()
                };

                // Act
                await eventProcessConsumer.onOddAvailable(context);

                // Assert
                expect(mockOddFeedConsumer.getEvent).not.toHaveBeenCalled();
            });
        });

        describe("other event detail", () => {
            it("should update current event detail index", async () => {
                // Arrange
                const context: ProcessingEventContext = {
                    fullEvent: mockEventResponse,
                    eventDetail: mockEventDetail,
                    index: 1,
                    time: new Date()
                };
                mockOddFeedConsumer.getEvent.mockResolvedValue(mockEventResponse);

                // Act
                await eventProcessConsumer.onOddAvailable(context);

                // Assert
                expect(mockGameData.oddFeedGames[123].currentEventDetailIndex).toBe(1);
            });

            it("should call syncEventDetail", async () => {
                // Arrange
                const context: ProcessingEventContext = {
                    fullEvent: mockEventResponse,
                    eventDetail: mockEventDetail,
                    index: 1,
                    time: new Date()
                };
                mockOddFeedConsumer.getEvent.mockResolvedValue(mockEventResponse);

                // Act
                await eventProcessConsumer.onOddAvailable(context);

                // Assert
                expect(mockOddFeedConsumer.getEvent).toHaveBeenCalledWith({ eventID: 12345 });
            });

            it("should publish start placing bet status", async () => {
                // Arrange
                const context: ProcessingEventContext = {
                    fullEvent: mockEventResponse,
                    eventDetail: mockEventDetail,
                    index: 1,
                    time: new Date()
                };
                mockOddFeedConsumer.getEvent.mockResolvedValue(mockEventResponse);

                // Act
                await eventProcessConsumer.onOddAvailable(context);

                // Assert
                expect(mockGameStatusPublisher.publishStartPlacingBetStatus).toHaveBeenCalledTimes(1);
            });

            it("should publish odds", async () => {
                // Arrange
                const context: ProcessingEventContext = {
                    fullEvent: mockEventResponse,
                    eventDetail: mockEventDetail,
                    index: 1,
                    time: new Date()
                };
                mockOddFeedConsumer.getEvent.mockResolvedValue(mockEventResponse);

                // Act
                await eventProcessConsumer.onOddAvailable(context);

                // Assert
                expect(mockGameStatusPublisher.publishOdds).toHaveBeenCalledTimes(1);
            });
        });
    });

    describe("onLockBet", () => {
        it("should publish end placing bet status", async () => {
            // Arrange
            const context: ProcessingEventContext = {
                fullEvent: mockEventResponse,
                eventDetail: mockEventDetail,
                index: 0,
                time: new Date()
            };

            // Act
            await eventProcessConsumer.onLockBet(context);

            // Assert
            expect(mockGameStatusPublisher.publishEndPlacingBetStatus).toHaveBeenCalledTimes(1);
        });
    });

    describe("syncForSettle", () => {
        it("should call syncEventDetail", async () => {
            // Arrange
            mockOddFeedConsumer.getEvent.mockResolvedValue(mockEventResponse);

            // Act
            await eventProcessConsumer.syncForSettle(12345);

            // Assert
            expect(mockOddFeedConsumer.getEvent).toHaveBeenCalledWith({ eventID: 12345 });
        });

        it("should schedule onMatchResultAvailable for last event detail", async () => {
            // Arrange
            mockOddFeedConsumer.getEvent.mockResolvedValue(mockEventResponse);

            // Act
            await eventProcessConsumer.syncForSettle(12345);

            // Assert
            expect(mockSchedulerConsumer.schedule).toHaveBeenCalledWith(
                mockEventDetail.resultsAvailableTs,
                expect.any(Function)
            );
        });
    });

    describe("onMatchResultAvailable", () => {
        describe("not last event detail", () => {
            it("should return early without syncing event detail", async () => {
                // Arrange
                const context: ProcessingEventContext = {
                    fullEvent: { ...mockEventResponse, eventDetails: [mockEventDetail, mockEventDetail] },
                    eventDetail: mockEventDetail,
                    index: 0,
                    time: new Date()
                };

                // Act
                await eventProcessConsumer.onMatchResultAvailable(context);

                // Assert
                expect(mockOddFeedConsumer.getEvent).not.toHaveBeenCalled();
            });

            it("should not call settle specific round", async () => {
                // Arrange
                const context: ProcessingEventContext = {
                    fullEvent: { ...mockEventResponse, eventDetails: [mockEventDetail, mockEventDetail] },
                    eventDetail: mockEventDetail,
                    index: 0,
                    time: new Date()
                };

                // Act
                await eventProcessConsumer.onMatchResultAvailable(context);

                // Assert
                expect(mockSettleGameRoundConsumer.settleSpecificRound).not.toHaveBeenCalled();
            });
        });

        describe("last event detail without results", () => {
            it("should call syncEventDetailForcingResultAvailable", async () => {
                // Arrange
                const context: ProcessingEventContext = {
                    fullEvent: mockEventResponse,
                    eventDetail: mockEventDetail,
                    index: 0,
                    time: new Date()
                };
                const eventWithoutResults = { ...mockEventResponse, eventDetails: [{ ...mockEventDetail, hasResults: false }] };
                mockOddFeedConsumer.getEvent.mockResolvedValue(eventWithoutResults);
                mockGameData.oddFeedGames[123] = {
                    rounds: { 456: eventWithoutResults }
                };

                // Act
                await eventProcessConsumer.onMatchResultAvailable(context);

                // Assert
                expect(mockOddFeedConsumer.getEvent).toHaveBeenCalledWith({ eventID: 12345 });
            });

            it("should not settle when no results available", async () => {
                // Arrange
                const context: ProcessingEventContext = {
                    fullEvent: mockEventResponse,
                    eventDetail: mockEventDetail,
                    index: 0,
                    time: new Date()
                };
                const eventWithoutResults = { ...mockEventResponse, eventDetails: [{ ...mockEventDetail, hasResults: false }] };
                mockOddFeedConsumer.getEvent.mockResolvedValue(eventWithoutResults);
                mockGameData.oddFeedGames[123] = {
                    rounds: { 456: eventWithoutResults }
                };

                // Act
                await eventProcessConsumer.onMatchResultAvailable(context);

                // Assert
                expect(mockSettleGameRoundConsumer.settleSpecificRound).not.toHaveBeenCalled();
            });
        });

        describe("last event detail with results", () => {
            it("should call syncEventDetailForcingResultAvailable", async () => {
                // Arrange
                const context: ProcessingEventContext = {
                    fullEvent: mockEventResponse,
                    eventDetail: mockEventDetail,
                    index: 0,
                    time: new Date()
                };
                const eventWithResults = { ...mockEventResponse, eventDetails: [{ ...mockEventDetail, hasResults: true }] };
                mockOddFeedConsumer.getEvent.mockResolvedValue(eventWithResults);
                mockGameData.oddFeedGames[123] = {
                    rounds: { 456: eventWithResults }
                };

                // Act
                await eventProcessConsumer.onMatchResultAvailable(context);

                // Assert
                expect(mockOddFeedConsumer.getEvent).toHaveBeenCalledWith({ eventID: 12345 });
            });

            it("should settle round when results available", async () => {
                // Arrange
                const context: ProcessingEventContext = {
                    fullEvent: mockEventResponse,
                    eventDetail: mockEventDetail,
                    index: 0,
                    time: new Date()
                };
                const eventWithResults = { ...mockEventResponse, eventDetails: [{ ...mockEventDetail, hasResults: true }] };
                mockOddFeedConsumer.getEvent.mockResolvedValue(eventWithResults);
                mockGameData.oddFeedGames[123] = {
                    rounds: { 456: eventWithResults }
                };

                // Act
                await eventProcessConsumer.onMatchResultAvailable(context);

                // Assert
                expect(mockSettleGameRoundConsumer.settleSpecificRound).toHaveBeenCalledWith(456);
            });
        });
    });

    describe("onLiveStream", () => {
        describe("no current match", () => {
            it("should return early when no current match", async () => {
                // Arrange
                const context: ProcessingEventContext = {
                    fullEvent: mockEventResponse,
                    eventDetail: mockEventDetail,
                    index: 0,
                    time: new Date()
                };
                mockedEventIdHelper.getCurrentMatch.mockReturnValue(null);

                // Act
                await eventProcessConsumer.onLiveStream(context);

                // Assert
                expect(mockOddFeedConsumer.getEvent).not.toHaveBeenCalled();
            });
        });

        describe("no updated current match", () => {
            it("should return early when no updated current match after sync", async () => {
                // Arrange
                const context: ProcessingEventContext = {
                    fullEvent: mockEventResponse,
                    eventDetail: mockEventDetail,
                    index: 0,
                    time: new Date()
                };
                mockedEventIdHelper.getCurrentMatch.mockReturnValueOnce(mockEventDetail).mockReturnValueOnce(null);
                mockOddFeedConsumer.getEvent.mockResolvedValue(mockEventResponse);

                // Act
                await eventProcessConsumer.onLiveStream(context);

                // Assert
                expect(mockRunningRoundInfoPublisher.publishToAllUsers).not.toHaveBeenCalled();
            });
        });

        describe("with updated current match", () => {
            it("should call syncEventDetail", async () => {
                // Arrange
                const context: ProcessingEventContext = {
                    fullEvent: mockEventResponse,
                    eventDetail: mockEventDetail,
                    index: 0,
                    time: new Date()
                };
                mockedEventIdHelper.getCurrentMatch.mockReturnValue(mockEventDetail);
                mockOddFeedConsumer.getEvent.mockResolvedValue(mockEventResponse);

                // Act
                await eventProcessConsumer.onLiveStream(context);

                // Assert
                expect(mockOddFeedConsumer.getEvent).toHaveBeenCalledWith({ eventID: 12345 });
            });

            it("should publish video result to all users", async () => {
                // Arrange
                const context: ProcessingEventContext = {
                    fullEvent: mockEventResponse,
                    eventDetail: mockEventDetail,
                    index: 0,
                    time: new Date()
                };
                mockedEventIdHelper.getCurrentMatch.mockReturnValue(mockEventDetail);
                mockOddFeedConsumer.getEvent.mockResolvedValue(mockEventResponse);

                // Act
                await eventProcessConsumer.onLiveStream(context);

                // Assert
                expect(mockRunningRoundInfoPublisher.publishToAllUsers).toHaveBeenCalledWith({
                    videoResult: {
                        video: mockEventDetail.playlist,
                        timeline: mockEventDetail.goalInfo
                    }
                });
            });
        });
    });

    describe("syncEventDetail", () => {
        it("should call getEvent with eventID", async () => {
            // Arrange
            mockOddFeedConsumer.getEvent.mockResolvedValue(mockEventResponse);

            // Act
            await eventProcessConsumer.syncEventDetail(12345);

            // Assert
            expect(mockOddFeedConsumer.getEvent).toHaveBeenCalledWith({ eventID: 12345 });
        });

        it("should store processed event in game data", async () => {
            // Arrange
            mockOddFeedConsumer.getEvent.mockResolvedValue(mockEventResponse);

            // Act
            await eventProcessConsumer.syncEventDetail(12345);

            // Assert
            expect(mockGameData.oddFeedGames[123].rounds[456]).toEqual(mockEventResponse);
        });

        it("should return processed event", async () => {
            // Arrange
            mockOddFeedConsumer.getEvent.mockResolvedValue(mockEventResponse);

            // Act
            const result = await eventProcessConsumer.syncEventDetail(12345);

            // Assert
            expect(result).toEqual(mockEventResponse);
        });
    });

    describe("syncEventDetailForcingResultAvailable", () => {
        it("should return event when results are available on first attempt", async () => {
            // Arrange
            const eventWithResults = { ...mockEventResponse, eventDetails: [{ ...mockEventDetail, hasResults: true }] };
            mockOddFeedConsumer.getEvent.mockResolvedValue(eventWithResults);

            // Act
            const result = await eventProcessConsumer.syncEventDetailForcingResultAvailable(12345);

            // Assert
            expect(result).toEqual(eventWithResults);
        });

        it("should return null when results are not available after max attempts", async () => {
            // Arrange
            const eventWithoutResults = { ...mockEventResponse, eventDetails: [{ ...mockEventDetail, hasResults: false }] };
            mockOddFeedConsumer.getEvent.mockResolvedValue(eventWithoutResults);

            // Act
            const result = await eventProcessConsumer.syncEventDetailForcingResultAvailable(12345, { maxAttempts: 2, delay: 50 });

            // Assert
            expect(result).toBeNull();
        });

        it("should use default parameters when not provided", async () => {
            // Arrange
            const eventWithoutResults = { ...mockEventResponse, eventDetails: [{ ...mockEventDetail, hasResults: false }] };
            mockOddFeedConsumer.getEvent.mockResolvedValue(eventWithoutResults);

            // Act
            const result = await eventProcessConsumer.syncEventDetailForcingResultAvailable(12345);

            // Assert
            expect(result).toBeNull();
        });
    });

    describe("bet choice points and odds", () => {
        it("should save odds to game data", async () => {
            // Arrange
            const context: ProcessingEventContext = {
                fullEvent: mockEventResponse,
                eventDetail: mockEventDetail,
                index: 0,
                time: new Date()
            };
            mockGameData.oddFeedGames[123].currentRound = 456;
            mockGameData.oddFeedGames[123].currentEventDetailIndex = 0;
            mockGameData.oddFeedGames[123].rounds[456] = mockEventResponse;
            mockOddFeedConsumer.getEvent.mockResolvedValue(mockEventResponse);

            // Act
            await eventProcessConsumer.onScheduleStart(context);

            // Assert
            expect(mockGameData.dynamicOdds).toEqual({
                "0:home": 2.0,
                "0:away": 3.0,
                "0:draw": 2.5
            });
        });

        it("should save points to game data", async () => {
            // Arrange
            const context: ProcessingEventContext = {
                fullEvent: mockEventResponse,
                eventDetail: mockEventDetail,
                index: 0,
                time: new Date()
            };
            mockGameData.oddFeedGames[123].currentRound = 456;
            mockGameData.oddFeedGames[123].currentEventDetailIndex = 0;
            mockGameData.oddFeedGames[123].rounds[456] = mockEventResponse;
            mockOddFeedConsumer.getEvent.mockResolvedValue(mockEventResponse);

            // Act
            await eventProcessConsumer.onScheduleStart(context);

            // Assert
            expect(mockGameData.betChoicePoints).toEqual({
                "0:home": 1.5,
                "0:away": 2.0,
                "0:draw": 1.8
            });
        });

        it("should publish points to all users", async () => {
            // Arrange
            const context: ProcessingEventContext = {
                fullEvent: mockEventResponse,
                eventDetail: mockEventDetail,
                index: 0,
                time: new Date()
            };
            mockGameData.oddFeedGames[123].currentRound = 456;
            mockGameData.oddFeedGames[123].currentEventDetailIndex = 0;
            mockGameData.oddFeedGames[123].rounds[456] = mockEventResponse;
            mockOddFeedConsumer.getEvent.mockResolvedValue(mockEventResponse);

            // Act
            await eventProcessConsumer.onScheduleStart(context);

            // Assert
            expect(mockGameStatusPublisher.publishToAllUsers).toHaveBeenCalledWith({
                points: {
                    "0:home": 1.5,
                    "0:away": 2.0,
                    "0:draw": 1.8
                }
            });
        });
    });
});
