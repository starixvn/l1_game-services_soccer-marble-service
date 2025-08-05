//NOSONAR 
import { EventProcessConsumer, ProcessingEventContext } from "../../../src/consumers/event-process-consumer";
import { SchedulerConsumer } from "../../../src/consumers/scheduler-consumer";
import { OddFeedConsumer, ScheduleResponseItem, EventResponse, EventDetail } from "../../../src/consumers/odd-feed-consumer";
import GameData from "../../../src/game-data";
import { GameStatusPublisher, RunningRoundInfoPublisher } from "../../../src/publishers";
import * as eventIdHelper from "../../../src/helpers/eventid";
import * as gameTimingHelper from "../../../src/helpers/game-timing";
import SettleGameRoundConsumer from "../../../src/consumers/settle-game-round-consumer";
import axios from "axios";

jest.mock("../../../src/helpers/eventid");
jest.mock("../../../src/helpers/game-timing");
jest.mock("../../../src/publishers");
jest.mock("axios");

const mockedEventIdHelper = eventIdHelper as jest.Mocked<typeof eventIdHelper>;
const mockedGameTimingHelper = gameTimingHelper as jest.Mocked<typeof gameTimingHelper>;
const mockedAxios = axios as jest.Mocked<typeof axios>;

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
            appConfigs: any;
            gameStatusPublisher: jest.Mocked<GameStatusPublisher>;
            runningRoundInfoPublisher: jest.Mocked<RunningRoundInfoPublisher>;
            settleGameRoundConsumer: jest.Mocked<SettleGameRoundConsumer>;
            bot?: { reset: jest.MockedFunction<() => void> };
            logService: { logError: jest.MockedFunction<(message: string) => void> };
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
                hedgeBetExclusion: ["draw"],
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
            betChoicePoints: {},
            dynamicHedgeBetGroups: [] as Array<Set<string>>,
            videoResult: undefined
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

        const mockBot = {
            reset: jest.fn()
        };

        mockContainer = {
            gameData: mockGameData,
            schedulerConsumer: mockSchedulerConsumer,
            oddFeedConsumer: mockOddFeedConsumer,
            appConfigs: {
                oddFeed: {
                    gameId: 123
                },
                liveStreamServer: "https://live-stream-server.com",
                proxyServer: {
                    enabled: false,
                    url: ""
                }
            } as any,
            gameStatusPublisher: mockGameStatusPublisher,
            runningRoundInfoPublisher: mockRunningRoundInfoPublisher,
            settleGameRoundConsumer: mockSettleGameRoundConsumer,
            bot: mockBot,
            logService: {
                logError: jest.fn()
            }
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

    describe("checkGameStatus", () => {
        it("should set proceedEvent to true", async () => {
            // Arrange
            mockGameData.proceedEvent = false;

            // Act
            await eventProcessConsumer.checkGameStatus();

            // Assert
            expect(mockGameData.proceedEvent).toBe(true);
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
        it("should set proceedEvent to true when schedule is empty", async () => {
            // Arrange
            mockOddFeedConsumer.getSchedule.mockResolvedValue([]);

            // Act
            await eventProcessConsumer.proceed();

            // Assert
            expect(mockGameData.proceedEvent).toBe(true);
        });

        it("should set proceedEvent to true when schedule is null", async () => {
            // Arrange
            mockOddFeedConsumer.getSchedule.mockResolvedValue(null as any);

            // Act
            await eventProcessConsumer.proceed();

            // Assert
            expect(mockGameData.proceedEvent).toBe(true);
        });

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

            it("should schedule timings for multiple event details", async () => {
                // Arrange
                const eventWithMultipleDetails = {
                    ...mockEventResponse,
                    eventDetails: [mockEventDetail, { ...mockEventDetail, eventID: 12346 }]
                };
                mockOddFeedConsumer.getEvent.mockResolvedValue(eventWithMultipleDetails);

                // Act
                await eventProcessConsumer.processEvent(mockScheduleResponseItem);

                // Assert
                expect(mockSchedulerConsumer.schedule).toHaveBeenCalledTimes(9);
            });

            it("should schedule lockbet timing with correct offset", async () => {
                // Arrange
                mockOddFeedConsumer.getEvent.mockResolvedValue(mockEventResponse);

                // Act
                await eventProcessConsumer.processEvent(mockScheduleResponseItem);

                // Assert
                expect(mockSchedulerConsumer.schedule).toHaveBeenCalledWith(
                    expect.any(Date),
                    expect.any(Function),
                    { key: 'lockbet' }
                );
            });

            it("should schedule results available timing", async () => {
                // Arrange
                mockOddFeedConsumer.getEvent.mockResolvedValue(mockEventResponse);

                // Act
                await eventProcessConsumer.processEvent(mockScheduleResponseItem);

                // Assert
                expect(mockSchedulerConsumer.schedule).toHaveBeenCalledWith(
                    expect.any(Date),
                    expect.any(Function),
                    { key: 'resultsAvailable' }
                );
            });
        });
    });

    describe("updateAndGetRemainingTime", () => {
        it("should return 0 when no current round", () => {
            // Arrange
            mockGameData.oddFeedGames[123] = { rounds: {}, currentRound: undefined };

            // Act
            const result = eventProcessConsumer.updateRemainingTime();

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
            const result = eventProcessConsumer.updateRemainingTime();

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
            const result = eventProcessConsumer.updateRemainingTime();

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
            const result = eventProcessConsumer.updateRemainingTime();

            // Assert
            expect(mockGameData.remainingTime).toBe(result);
        });

        it("should return negative time when result time is in the past", () => {
            // Arrange
            const pastTime = new Date(Date.now() - 60000);
            const eventDetailWithPastTime = { ...mockEventDetail, resultsAvailableTs: pastTime };
            const eventResponseWithPastTime = { ...mockEventResponse, eventDetails: [eventDetailWithPastTime] };
            mockGameData.oddFeedGames[123] = {
                currentRound: 456,
                rounds: {
                    456: eventResponseWithPastTime
                }
            };

            // Act
            const result = eventProcessConsumer.updateRemainingTime();

            // Assert
            expect(result).toBeLessThan(0);
        });

        it("should return 0 when current round does not exist", () => {
            // Arrange
            mockGameData.oddFeedGames[123] = {
                currentRound: 456,
                rounds: {}
            };

            // Act
            const result = eventProcessConsumer.updateRemainingTime();

            // Assert
            expect(result).toBe(0);
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

        it("should call bot reset", async () => {
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
            expect(mockContainer.bot?.reset).toHaveBeenCalledTimes(1);
        });

        it("should handle when bot is undefined", async () => {
            // Arrange
            const context: ProcessingEventContext = {
                fullEvent: mockEventResponse,
                eventDetail: mockEventDetail,
                index: 0,
                time: new Date()
            };
            mockOddFeedConsumer.getEvent.mockResolvedValue(mockEventResponse);
            mockContainer.bot = undefined;

            // Act
            await eventProcessConsumer.onScheduleStart(context);

            // Assert
            expect(mockGameStatusPublisher.publishStartPlacingBetStatus).toHaveBeenCalledTimes(1);
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
                expect.any(Function),
                { key: 'resultsAvailable' }
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

            it("should call checkGameStatus when isRegularResultEvent is true", async () => {
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
                const checkGameStatusSpy = jest.spyOn(eventProcessConsumer, 'checkGameStatus');

                // Act
                await eventProcessConsumer.onMatchResultAvailable(context, { isRegularResultEvent: true });

                // Assert
                expect(checkGameStatusSpy).toHaveBeenCalledTimes(1);
            });

            it("should not call checkGameStatus when isRegularResultEvent is false", async () => {
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
                const checkGameStatusSpy = jest.spyOn(eventProcessConsumer, 'checkGameStatus');

                // Act
                await eventProcessConsumer.onMatchResultAvailable(context, { isRegularResultEvent: false });

                // Assert
                expect(checkGameStatusSpy).not.toHaveBeenCalled();
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
            beforeEach(() => {
                mockedAxios.get.mockResolvedValue({ 
                    data: { 
                        timeLine: [1, 2, 3], 
                        result: ["H", "A", "H"] 
                    } 
                });
            });

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

            it("should store video result in game data", async () => {
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
                expect(mockGameData.videoResult).toEqual({
                    video: mockEventDetail.playlist,
                    timeline: [1, 2, 3],
                    result: "HAH"
                });
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
                        timeline: [1, 2, 3],
                        result: "HAH"
                    }
                });
            });

            it("should call getVideoTimelineByVideoName with goalInfo", async () => {
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
                expect(mockedAxios.get).toHaveBeenCalledWith(
                    "https://live-stream-server.com/test-goal-info",
                    { httpsAgent: undefined }
                );
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

        it("should retry multiple times when results are not available", async () => {
            // Arrange
            const eventWithoutResults = { ...mockEventResponse, eventDetails: [{ ...mockEventDetail, hasResults: false }] };
            mockOddFeedConsumer.getEvent.mockResolvedValue(eventWithoutResults);

            // Act
            await eventProcessConsumer.syncEventDetailForcingResultAvailable(12345, { maxAttempts: 3, delay: 10 });

            // Assert
            expect(mockOddFeedConsumer.getEvent).toHaveBeenCalledTimes(3);
        });

        it("should return event when results become available on retry", async () => {
            // Arrange
            const eventWithoutResults = { ...mockEventResponse, eventDetails: [{ ...mockEventDetail, hasResults: false }] };
            const eventWithResults = { ...mockEventResponse, eventDetails: [{ ...mockEventDetail, hasResults: true }] };
            mockOddFeedConsumer.getEvent
                .mockResolvedValueOnce(eventWithoutResults)
                .mockResolvedValueOnce(eventWithResults);

            // Act
            const result = await eventProcessConsumer.syncEventDetailForcingResultAvailable(12345, { maxAttempts: 2, delay: 10 });

            // Assert
            expect(result).toEqual(eventWithResults);
        });
    });

    describe("getVideoTimelineByVideoName", () => {
        beforeEach(() => {
            mockedAxios.get.mockResolvedValue({ 
                data: { 
                    timeLine: [1, 2, 3], 
                    result: ["H", "A", "H"],
                    frame: [10, 20, 30]
                } 
            });
        });

        it("should make axios request with correct URL", async () => {
            // Arrange
            const timelineUrl = "test-timeline-url";

            // Act
            const result = await eventProcessConsumer.getVideoTimelineByVideoName(timelineUrl);

            // Assert
            expect(mockedAxios.get).toHaveBeenCalledWith(
                "https://live-stream-server.com/test-timeline-url",
                { httpsAgent: undefined }
            );
            expect(result).toEqual({
                timeLine: [1, 2, 3],
                result: ["H", "A", "H"],
                frame: [10, 20, 30]
            });
        });

        it("should handle proxy when enabled", async () => {
            // Arrange
            mockContainer.appConfigs.proxyServer.enabled = true;
            mockContainer.appConfigs.proxyServer.url = "https://proxy-server.com";
            const timelineUrl = "test-timeline-url";

            // Act
            await eventProcessConsumer.getVideoTimelineByVideoName(timelineUrl);

            // Assert
            expect(mockedAxios.get).toHaveBeenCalledWith(
                "https://live-stream-server.com/test-timeline-url",
                { httpsAgent: expect.any(Object) }
            );
        });

        it("should throw error and log when axios request fails", async () => {
            // Arrange
            const timelineUrl = "test-timeline-url";
            const mockError = new Error("Network error");
            mockedAxios.get.mockRejectedValue(mockError);
            mockGameData.roundId = 123;

            // Act & Assert
            await expect(eventProcessConsumer.getVideoTimelineByVideoName(timelineUrl)).rejects.toThrow("Network error");
            expect(mockContainer.logService.logError).toHaveBeenCalledWith(
                "In match 123, failed to get video timeline https://live-stream-server.com/test-timeline-url with error: Error: Network error"
            );
        });
    });

    describe("publishBetChoiceReady", () => {
        describe("saving bet option to game data", () => {
            it("should do nothing without current event meta", () => {
                // Arrange
                mockGameData.oddFeedGames[123] = {
                    rounds: {},
                    currentRound: undefined,
                    currentEventDetailIndex: undefined
                };

                // Act
                eventProcessConsumer.publishBetChoiceReady();

                // Assert
                expect(mockGameData.dynamicOdds).toEqual({});
                expect(mockGameData.betChoicePoints).toEqual({});
                expect(mockGameData.dynamicHedgeBetGroups).toEqual([]);
            });

            it("should do nothing without current round", () => {
                // Arrange
                mockGameData.oddFeedGames[123] = {
                    rounds: {},
                    currentRound: undefined,
                    currentEventDetailIndex: 0
                };

                // Act
                eventProcessConsumer.publishBetChoiceReady();

                // Assert
                expect(mockGameData.dynamicOdds).toEqual({});
                expect(mockGameData.betChoicePoints).toEqual({});
                expect(mockGameData.dynamicHedgeBetGroups).toEqual([]);
            });

            it("should do nothing without current event detail index", () => {
                // Arrange
                mockGameData.oddFeedGames[123] = {
                    rounds: { 456: mockEventResponse },
                    currentRound: 456,
                    currentEventDetailIndex: undefined
                };

                // Act
                eventProcessConsumer.publishBetChoiceReady();

                // Assert
                expect(mockGameData.dynamicOdds).toEqual({});
                expect(mockGameData.betChoicePoints).toEqual({});
                expect(mockGameData.dynamicHedgeBetGroups).toEqual([]);
            });

            it("should map prematch bet choices correctly", () => {
                // Arrange
                const eventDetailWithPrematchMarkets = {
                    ...mockEventDetail,
                    markets: [
                        {
                            marketID: 1,
                            marketNameKey: "ft_1x2",
                            marketName: "Full Time 1X2",
                            hedgeBetExclusion: ["draw"],
                            selections: [
                                { 
                                    betChoice: "ft_1x2_home", 
                                    price: 2.0,
                                    point: 1.5,
                                    settlementStatus: "active",
                                    selectionID: 1,
                                    selectionNameLongKey: "home_team",
                                    name: "Home Team"
                                },
                                { 
                                    betChoice: "ft_1x2_away", 
                                    price: 3.0,
                                    point: 2.0,
                                    settlementStatus: "active",
                                    selectionID: 2,
                                    selectionNameLongKey: "away_team",
                                    name: "Away Team"
                                },
                                { 
                                    betChoice: "ft_1x2_draw", 
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
                const eventResponseWithPrematchMarkets = {
                    ...mockEventResponse,
                    eventDetails: [eventDetailWithPrematchMarkets]
                };
                mockGameData.oddFeedGames[123] = {
                    rounds: { 456: eventResponseWithPrematchMarkets },
                    currentRound: 456,
                    currentEventDetailIndex: 0
                };

                // Act
                eventProcessConsumer.publishBetChoiceReady();

                // Assert
                expect(mockGameData.dynamicOdds).toEqual({
                    home: 2.0,
                    away: 3.0,
                    draw: 2.5,
                    over: 0,
                    under: 0,
                    odd: 0,
                    even: 0
                });
                expect(mockGameData.betChoicePoints).toEqual({
                    home: 1.5,
                    away: 2.0,
                    draw: 1.8,
                    over: 0,
                    under: 0,
                    odd: 0,
                    even: 0
                });
            });

            it("should map live bet choices correctly", () => {
                // Arrange
                const eventDetailWithLiveMarkets = {
                    ...mockEventDetail,
                    eventID: 12346, // Different event ID to avoid conflicts
                    markets: [
                        {
                            marketID: 1,
                            marketNameKey: "ft_oe",
                            marketName: "Full Time Odd/Even",
                            hedgeBetExclusion: [],
                            selections: [
                                { 
                                    betChoice: "ft_oe_odd", 
                                    price: 1.8,
                                    point: 1.2,
                                    settlementStatus: "active",
                                    selectionID: 1,
                                    selectionNameLongKey: "odd",
                                    name: "Odd"
                                },
                                { 
                                    betChoice: "ft_oe_even", 
                                    price: 2.2,
                                    point: 1.8,
                                    settlementStatus: "active",
                                    selectionID: 2,
                                    selectionNameLongKey: "even",
                                    name: "Even"
                                }
                            ]
                        }
                    ]
                };
                const eventResponseWithLiveMarkets = {
                    ...mockEventResponse,
                    eventDetails: [mockEventDetail, eventDetailWithLiveMarkets]
                };
                mockGameData.oddFeedGames[123] = {
                    rounds: { 456: eventResponseWithLiveMarkets },
                    currentRound: 456,
                    currentEventDetailIndex: 1
                };

                // Act
                eventProcessConsumer.publishBetChoiceReady({ isLive: true });

                // Assert
                expect(mockGameData.dynamicOdds).toEqual({
                    homeLive: 0,
                    awayLive: 0,
                    drawLive: 0,
                    overLive: 0,
                    underLive: 0,
                    oddLive: 1.8,
                    evenLive: 2.2
                });
                expect(mockGameData.betChoicePoints).toEqual({
                    homeLive: 0,
                    awayLive: 0,
                    drawLive: 0,
                    overLive: 0,
                    underLive: 0,
                    oddLive: 1.2,
                    evenLive: 1.8
                });
            });

            it("should not add hedge bet group for excluded bet choice in market", () => {
                // Arrange
                const eventDetailWithExcludedHedgeBet = {
                    ...mockEventDetail,
                    markets: [
                        {
                            marketID: 1,
                            marketNameKey: "ft_1x2",
                            marketName: "Full Time 1X2",
                            hedgeBetExclusion: ["ft_1x2_draw"],
                            selections: [
                                { 
                                    betChoice: "ft_1x2_home", 
                                    price: 2.0,
                                    point: 1.5,
                                    settlementStatus: "active",
                                    selectionID: 1,
                                    selectionNameLongKey: "home_team",
                                    name: "Home Team"
                                },
                                { 
                                    betChoice: "ft_1x2_draw", 
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
                const eventResponseWithExcludedHedgeBet = {
                    ...mockEventResponse,
                    eventDetails: [eventDetailWithExcludedHedgeBet]
                };
                mockGameData.oddFeedGames[123] = {
                    rounds: { 456: eventResponseWithExcludedHedgeBet },
                    currentRound: 456,
                    currentEventDetailIndex: 0
                };

                // Act
                eventProcessConsumer.publishBetChoiceReady();

                // Assert
                expect(mockGameData.dynamicHedgeBetGroups).toEqual([
                    new Set(["home"])
                ]);
            });

            it("should not add empty hedge bet group to list", () => {
                // Arrange
                const eventDetailWithUnmappedSelections = {
                    ...mockEventDetail,
                    markets: [
                        {
                            marketID: 1,
                            marketNameKey: "unknown_market",
                            marketName: "Unknown Market",
                            hedgeBetExclusion: [],
                            selections: [
                                { 
                                    betChoice: "unknown_selection", 
                                    price: 2.0,
                                    point: 1.5,
                                    settlementStatus: "active",
                                    selectionID: 1,
                                    selectionNameLongKey: "unknown",
                                    name: "Unknown"
                                }
                            ]
                        }
                    ]
                };
                const eventResponseWithUnmappedSelections = {
                    ...mockEventResponse,
                    eventDetails: [eventDetailWithUnmappedSelections]
                };
                mockGameData.oddFeedGames[123] = {
                    rounds: { 456: eventResponseWithUnmappedSelections },
                    currentRound: 456,
                    currentEventDetailIndex: 0
                };

                // Act
                eventProcessConsumer.publishBetChoiceReady();

                // Assert
                expect(mockGameData.dynamicHedgeBetGroups).toEqual([]);
            });

            it("should only add bet choice that is in the mapper const", () => {
                // Arrange
                const eventDetailWithMixedSelections = {
                    ...mockEventDetail,
                    markets: [
                        {
                            marketID: 1,
                            marketNameKey: "ft_1x2",
                            marketName: "Full Time 1X2",
                            hedgeBetExclusion: [],
                            selections: [
                                { 
                                    betChoice: "ft_1x2_home", 
                                    price: 2.0,
                                    point: 1.5,
                                    settlementStatus: "active",
                                    selectionID: 1,
                                    selectionNameLongKey: "home_team",
                                    name: "Home Team"
                                },
                                { 
                                    betChoice: "unknown_selection", 
                                    price: 3.0,
                                    point: 2.0,
                                    settlementStatus: "active",
                                    selectionID: 2,
                                    selectionNameLongKey: "unknown",
                                    name: "Unknown"
                                }
                            ]
                        }
                    ]
                };
                const eventResponseWithMixedSelections = {
                    ...mockEventResponse,
                    eventDetails: [eventDetailWithMixedSelections]
                };
                mockGameData.oddFeedGames[123] = {
                    rounds: { 456: eventResponseWithMixedSelections },
                    currentRound: 456,
                    currentEventDetailIndex: 0
                };

                // Act
                eventProcessConsumer.publishBetChoiceReady();

                // Assert
                expect(mockGameData.dynamicOdds).toEqual({
                    home: 2.0,
                    away: 0,
                    draw: 0,
                    over: 0,
                    under: 0,
                    odd: 0,
                    even: 0
                });
                expect(mockGameData.betChoicePoints).toEqual({
                    home: 1.5,
                    away: 0,
                    draw: 0,
                    over: 0,
                    under: 0,
                    odd: 0,
                    even: 0
                });
            });

            describe("should leave default odd 0 for bet choice that is not in the market", () => {
                it("prematch", () => {
                    // Arrange
                    const eventDetailWithLimitedMarkets = {
                        ...mockEventDetail,
                        markets: [
                            {
                                marketID: 1,
                                marketNameKey: "ft_1x2",
                                marketName: "Full Time 1X2",
                                hedgeBetExclusion: [],
                                selections: [
                                    { 
                                        betChoice: "ft_1x2_home", 
                                        price: 2.0,
                                        point: 1.5,
                                        settlementStatus: "active",
                                        selectionID: 1,
                                        selectionNameLongKey: "home_team",
                                        name: "Home Team"
                                    }
                                ]
                            }
                        ]
                    };
                    const eventResponseWithLimitedMarkets = {
                        ...mockEventResponse,
                        eventDetails: [eventDetailWithLimitedMarkets]
                    };
                    mockGameData.oddFeedGames[123] = {
                        rounds: { 456: eventResponseWithLimitedMarkets },
                        currentRound: 456,
                        currentEventDetailIndex: 0
                    };

                    // Act
                    eventProcessConsumer.publishBetChoiceReady();

                    // Assert
                    expect(mockGameData.dynamicOdds).toEqual({
                        home: 2.0,
                        away: 0,
                        draw: 0,
                        over: 0,
                        under: 0,
                        odd: 0,
                        even: 0
                    });
                });

                it("live", () => {
                    // Arrange
                    const eventDetailWithLimitedLiveMarkets = {
                        ...mockEventDetail,
                        markets: [
                            {
                                marketID: 1,
                                marketNameKey: "ft_oe",
                                marketName: "Full Time Odd/Even",
                                hedgeBetExclusion: [],
                                selections: [
                                    { 
                                        betChoice: "ft_oe_odd", 
                                        price: 1.8,
                                        point: 1.2,
                                        settlementStatus: "active",
                                        selectionID: 1,
                                        selectionNameLongKey: "odd",
                                        name: "Odd"
                                    }
                                ]
                            }
                        ]
                    };
                    const eventResponseWithLimitedLiveMarkets = {
                        ...mockEventResponse,
                        eventDetails: [mockEventDetail, eventDetailWithLimitedLiveMarkets]
                    };
                    mockGameData.oddFeedGames[123] = {
                        rounds: { 456: eventResponseWithLimitedLiveMarkets },
                        currentRound: 456,
                        currentEventDetailIndex: 1
                    };

                    // Act
                    eventProcessConsumer.publishBetChoiceReady({ isLive: true });

                    // Assert
                    expect(mockGameData.dynamicOdds).toEqual({
                        homeLive: 0,
                        awayLive: 0,
                        drawLive: 0,
                        overLive: 0,
                        underLive: 0,
                        oddLive: 1.8,
                        evenLive: 0
                    });
                });
            });
        });

        describe("publish bet choice points", () => {
            it("should publish bet choice points to all users", () => {
                // Arrange
                const eventDetailWithSelections = {
                    ...mockEventDetail,
                    markets: [
                        {
                            marketID: 1,
                            marketNameKey: "ft_1x2",
                            marketName: "Full Time 1X2",
                            hedgeBetExclusion: [],
                            selections: [
                                { 
                                    betChoice: "ft_1x2_home", 
                                    price: 2.0,
                                    point: 1.5,
                                    settlementStatus: "active",
                                    selectionID: 1,
                                    selectionNameLongKey: "home_team",
                                    name: "Home Team"
                                }
                            ]
                        }
                    ]
                };
                const eventResponseWithSelections = {
                    ...mockEventResponse,
                    eventDetails: [eventDetailWithSelections]
                };
                mockGameData.oddFeedGames[123] = {
                    rounds: { 456: eventResponseWithSelections },
                    currentRound: 456,
                    currentEventDetailIndex: 0
                };

                // Act
                eventProcessConsumer.publishBetChoiceReady();

                // Assert
                expect(mockGameStatusPublisher.publishToAllUsers).toHaveBeenCalledWith({
                    points: {
                        home: 1.5,
                        away: 0,
                        draw: 0,
                        over: 0,
                        under: 0,
                        odd: 0,
                        even: 0
                    }
                });
            });
        });

        describe("publish odds", () => {
            it("should publish odds when dynamic odds exist", () => {
                // Arrange
                const eventDetailWithSelections = {
                    ...mockEventDetail,
                    markets: [
                        {
                            marketID: 1,
                            marketNameKey: "ft_1x2",
                            marketName: "Full Time 1X2",
                            hedgeBetExclusion: [],
                            selections: [
                                { 
                                    betChoice: "ft_1x2_home", 
                                    price: 2.0,
                                    point: 1.5,
                                    settlementStatus: "active",
                                    selectionID: 1,
                                    selectionNameLongKey: "home_team",
                                    name: "Home Team"
                                }
                            ]
                        }
                    ]
                };
                const eventResponseWithSelections = {
                    ...mockEventResponse,
                    eventDetails: [eventDetailWithSelections]
                };
                mockGameData.oddFeedGames[123] = {
                    rounds: { 456: eventResponseWithSelections },
                    currentRound: 456,
                    currentEventDetailIndex: 0
                };

                // Act
                eventProcessConsumer.publishBetChoiceReady();

                // Assert
                expect(mockGameStatusPublisher.publishOdds).toHaveBeenCalledWith({
                    home: 2.0,
                    away: 0,
                    draw: 0,
                    over: 0,
                    under: 0,
                    odd: 0,
                    even: 0
                });
            });

            it("should not publish odds when dynamic odds do not exist", () => {
                // Arrange
                mockGameData.oddFeedGames[123] = {
                    rounds: {},
                    currentRound: undefined,
                    currentEventDetailIndex: undefined
                };

                // Act
                eventProcessConsumer.publishBetChoiceReady();

                // Assert
                expect(mockGameStatusPublisher.publishOdds).toHaveBeenCalledWith({});
            });
        });

        describe("publish start placing bet status", () => {
            it("should publish start placing bet status", () => {
                // Arrange
                const eventDetailWithSelections = {
                    ...mockEventDetail,
                    markets: [
                        {
                            marketID: 1,
                            marketNameKey: "ft_1x2",
                            marketName: "Full Time 1X2",
                            hedgeBetExclusion: [],
                            selections: [
                                { 
                                    betChoice: "ft_1x2_home", 
                                    price: 2.0,
                                    point: 1.5,
                                    settlementStatus: "active",
                                    selectionID: 1,
                                    selectionNameLongKey: "home_team",
                                    name: "Home Team"
                                }
                            ]
                        }
                    ]
                };
                const eventResponseWithSelections = {
                    ...mockEventResponse,
                    eventDetails: [eventDetailWithSelections]
                };
                mockGameData.oddFeedGames[123] = {
                    rounds: { 456: eventResponseWithSelections },
                    currentRound: 456,
                    currentEventDetailIndex: 0
                };

                // Act
                eventProcessConsumer.publishBetChoiceReady();

                // Assert
                expect(mockGameStatusPublisher.publishStartPlacingBetStatus).toHaveBeenCalledTimes(1);
            });
        });
    });
});
