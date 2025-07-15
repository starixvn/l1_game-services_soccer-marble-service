import axios, { AxiosError, AxiosInstance, AxiosResponse } from "axios";
import { OddFeedConsumer, LoginResponse, ScheduleResponseItem, EventRequest, EventResponse, PATHS } from "../../../src/consumers/odd-feed-consumer";
import GameData from "../../../src/game-data";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("OddFeedConsumer", () => {
    let oddFeedConsumer: OddFeedConsumer;
    let mockGameData: jest.Mocked<GameData>;
    let mockAxiosClient: jest.Mocked<AxiosInstance>;
    let mockPublicAxiosClient: jest.Mocked<AxiosInstance>;
    let mockContainer: any;

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockGameData = {
            oddFeedGames: {},
        } as any;

        mockAxiosClient = Object.assign(jest.fn(), {
            get: jest.fn(),
            post: jest.fn(),
            interceptors: {
                request: {
                    use: jest.fn(),
                },
                response: {
                    use: jest.fn(),
                },
            },
        }) as any;

        mockPublicAxiosClient = {
            post: jest.fn(),
        } as any;

        mockedAxios.create.mockReturnValueOnce(mockAxiosClient);
        mockedAxios.create.mockReturnValueOnce(mockPublicAxiosClient);

        mockContainer = {
            gameData: mockGameData,
            appConfigs: {
                oddFeed: {
                    operator: {
                        operatorId: "test-operator",
                        password: "test-password",
                    },
                    baseUrl: "https://test-api.com",
                },
            },
        };

        oddFeedConsumer = new OddFeedConsumer(mockContainer);
    });

    describe("constructor", () => {
        it("should initialize with correct properties", () => {
            expect(oddFeedConsumer.gameData).toBe(mockGameData);
            expect((oddFeedConsumer as any).operator).toEqual({
                operatorId: "test-operator",
                password: "test-password",
            });
            expect((oddFeedConsumer as any).baseUrl).toBe("https://test-api.com");
            expect(mockedAxios.create).toHaveBeenCalledTimes(2);
            expect(mockAxiosClient.interceptors.request.use).toHaveBeenCalled();
            expect(mockAxiosClient.interceptors.response.use).toHaveBeenCalled();
        });
    });

    describe("getSchedule", () => {
        it("should return schedule data", async () => {
            // Arrange
            const mockScheduleData: ScheduleResponseItem[] = [
                {
                    eventID: 1,
                    eventNameAKey: "Team A",
                    eventNameBKey: "Team B",
                    scheduleStartTs: new Date(),
                    productCode: "SOCCER",
                    productTypeKey: "MATCH",
                },
            ];

            const mockResponse: AxiosResponse<ScheduleResponseItem[]> = {
                data: mockScheduleData,
                status: 200,
                statusText: "OK",
                headers: {},
                config: {} as any,
            };

            mockAxiosClient.get.mockResolvedValue(mockResponse);

            // Act
            const result = await oddFeedConsumer.getSchedule();

            // Assert
            expect(mockAxiosClient.get).toHaveBeenCalledWith("https://test-api.com/api/schedule");
            expect(result).toBe(mockScheduleData);
        });
    });

    describe("getEvent", () => {
        it("should return event data", async () => {
            // Arrange
            const mockEventData: EventResponse = {
                eventID: 1,
                eventNameAKey: "Team A",
                eventNameBKey: "Team B",
                scheduleStartTs: new Date(),
                productCode: "SOCCER",
                productTypeKey: "MATCH",
                eventDetails: [],
            };

            const mockResponse: AxiosResponse<EventResponse> = {
                data: mockEventData,
                status: 200,
                statusText: "OK",
                headers: {},
                config: {} as any,
            };

            mockAxiosClient.get.mockResolvedValue(mockResponse);

            const eventRequest: EventRequest = { eventID: 1 };
            // Act
            const result = await oddFeedConsumer.getEvent(eventRequest);

            // Assert
            expect(mockAxiosClient.get).toHaveBeenCalledWith("/api/events", {
                params: { eventID: 1 },
            });
            expect(result).toBe(mockEventData);
        });
    });

    describe("login", () => {
        it("should login and set access token", async () => {
            // Arrange
            const mockLoginResponse: LoginResponse = {
                access_token: "test-access-token",
            };

            const mockResponse: AxiosResponse<LoginResponse> = {
                data: mockLoginResponse,
                status: 200,
                statusText: "OK",
                headers: {},
                config: {} as any,
            };

            mockPublicAxiosClient.post.mockResolvedValue(mockResponse);

            // Act
            const result = await (oddFeedConsumer as any).login();

            // Assert
            expect(mockPublicAxiosClient.post).toHaveBeenCalledWith(
                "https://test-api.com/api/login",
                {
                    operatorId: "test-operator",
                    password: "test-password",
                }
            );
            expect((oddFeedConsumer as any).accessToken).toBe("test-access-token");
            expect(result).toBe(mockLoginResponse);
        });
    });

    describe("onRequestSuccess", () => {
        it("should add authorization header when access token exists", async () => {
            // Arrange
            (oddFeedConsumer as any).accessToken = "test-token";
            const mockConfig = {
                headers: {},
            };

            // Act
            const result = await (oddFeedConsumer as any).onRequestSuccess(mockConfig);

            // Assert
            expect(result.headers.Authorization).toBe("Bearer test-token");
        });

        it("should call login when access token does not exist", async () => {
            // Arrange
            const mockConfig = {
                headers: {},
            };

            const loginSpy = jest.spyOn(oddFeedConsumer as any, "login").mockResolvedValue({} as any);

            // Act
            await (oddFeedConsumer as any).onRequestSuccess(mockConfig);

            // Assert
            expect(loginSpy).toHaveBeenCalled();
        });
    });

    describe("onResponseSuccess", () => {
        it("should return response unchanged", async () => {
            // Arrange
            const mockResponse = { data: "test" } as AxiosResponse;

            // Act
            const result = await (oddFeedConsumer as any).onResponseSuccess(mockResponse);

            // Assert
            expect(result).toBe(mockResponse);
        });
    });

    describe("onResponseError", () => {
        it("should reject with error message for non-401 errors", async () => {
            // Arrange
            const mockError = {
                response: {
                    status: 500,
                    data: "Internal Server Error",
                },
                config: {
                    url: "/api/test",
                },
            } as AxiosError;

            // Act & Assert
            await expect((oddFeedConsumer as any).onResponseError(mockError)).rejects.toThrow();
        });

        it("should reject with error message for 401 errors on login endpoint", async () => {
            // Arrange
            const mockError = {
                response: {
                    status: 401,
                    data: "Unauthorized",
                },
                config: {
                    url: "/api/login",
                },
            } as AxiosError;

            // Act & Assert
            await expect((oddFeedConsumer as any).onResponseError(mockError)).rejects.toThrow();
        });

        it("should reject with error message for 401 errors on refresh endpoint", async () => {
            // Arrange
            const mockError = {
                response: {
                    status: 401,
                    data: "Unauthorized",
                },
                config: {
                    url: "/api/refresh",
                },
            } as AxiosError;

            // Act & Assert
            await expect((oddFeedConsumer as any).onResponseError(mockError)).rejects.toThrow();
        });

        it("should retry request for 401 errors on other endpoints", async () => {
            // Arrange
            const mockError = {
                response: {
                    status: 401,
                    data: "Unauthorized",
                },
                config: {
                    url: "/api/schedule",
                },
            } as AxiosError;

            const retrySpy = jest.spyOn(oddFeedConsumer as any, "retryRequest").mockResolvedValue({} as any);

            // Act
            await (oddFeedConsumer as any).onResponseError(mockError);

            // Assert
            expect(retrySpy).toHaveBeenCalledWith(mockError);
        });
    });

    describe("retryRequest", () => {
        it("should retry request after successful login", async () => {
            // Arrange
            const mockError = {
                config: {
                    url: "/api/schedule",
                },
            } as AxiosError;

            const mockResponse = { data: "success" } as AxiosResponse;

            const loginSpy = jest.spyOn(oddFeedConsumer as any, "login").mockResolvedValue({} as any);
            ((mockAxiosClient as unknown) as jest.Mock).mockResolvedValue(mockResponse);

            // Act
            const result = await (oddFeedConsumer as any).retryRequest(mockError);

            // Assert
            expect(loginSpy).toHaveBeenCalled();
            expect(((mockAxiosClient as unknown) as jest.Mock)).toHaveBeenCalledWith(mockError.config);
            expect(result).toBe(mockResponse);
        });

        it("should reject with original error when login fails", async () => {
            // Arrange
            const mockError = {
                config: {
                    url: "/api/schedule",
                },
            } as AxiosError;

            const loginSpy = jest.spyOn(oddFeedConsumer as any, "login").mockRejectedValue(new Error("Login failed"));

            // Act & Assert
            await expect((oddFeedConsumer as any).retryRequest(mockError)).rejects.toBe(mockError);
            expect(loginSpy).toHaveBeenCalled();
        });
    });

    describe("PATHS enum", () => {
        it("should have correct path values", () => {
            expect(PATHS.LOGIN).toBe("/api/login");
            expect(PATHS.SCHEDULE).toBe("/api/schedule");
            expect(PATHS.EVENT).toBe("/api/events");
        });
    });
});
