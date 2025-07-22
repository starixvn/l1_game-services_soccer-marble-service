import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import GameData from "../game-data";

export interface LoginCreds {
    operatorId: string;
    password: string;
}

export interface LoginResponse {
    access_token: string;
}

export interface ScheduleResponseItem {
    eventID: number;
    eventNameAKey: string;
    eventNameBKey: string;
    scheduleStartTs: Date;
    productCode: string;
    productTypeKey: string;
}

export interface EventRequest {
    eventID: number;
}

export interface EventResponse extends ScheduleResponseItem {
    eventDetails: EventDetail[];
}

export interface EventDetail {
    eventID: number;
    oddsAvailableTs: Date;
    scheduleStartTs: Date;
    resultsAvailableTs: Date;
    hasResult: boolean;
    goalInfo: string;
    playlist: string;
    result: string;
    markets: Market[];
}

export interface Market {
    marketID: number;
    marketNameKey: string;
    marketName: string;
    selections: MarketSelection[];
}

export interface MarketSelection {
    price?: number;
    point?: number;
    settlementStatus?: string;
    selectionID: number;
    selectionNameLongKey: string;
    name: string;
    betChoice: string;
}

export enum PATHS {
    LOGIN = "/api/login",
    SCHEDULE = "/api/schedule",
    EVENT = "/api/events",
}

export class OddFeedConsumer {
    gameData: GameData;
    private readonly baseUrl: string;
    private accessToken?: string;
    private readonly axiosClient: AxiosInstance;
    private readonly publicAxiosClient: AxiosInstance;
    private readonly operator: {
        operatorId: string;
        password: string;
    }

    constructor(container: any) {
        this.gameData = container.gameData;
        this.operator = container.appConfigs.oddFeed.operator;
        this.baseUrl = container.appConfigs.oddFeed.baseUrl;
        this.axiosClient = axios.create({
            baseURL: this.baseUrl,
        });
        this.publicAxiosClient = axios.create({
            baseURL: this.baseUrl,
        });
        this.axiosClient.interceptors.request.use(this.onRequestSuccess.bind(this));
        this.axiosClient.interceptors.response.use(this.onResponseSuccess.bind(this), this.onResponseError.bind(this));
    }

    async getSchedule(): Promise<ScheduleResponseItem[]> {
        const response = await this.axiosClient.get<ScheduleResponseItem[]>(`${this.baseUrl}${PATHS.SCHEDULE}`);
        return response.data;
    }

    async getEvent(request: EventRequest): Promise<EventResponse> {
        const response = await this.axiosClient.get<EventResponse>(PATHS.EVENT, {
            params: { eventID: request.eventID },
        });
        return response.data;
    }

    private async login(): Promise<LoginResponse> {
        const response = await this.publicAxiosClient.post<LoginResponse>(`${this.baseUrl}${PATHS.LOGIN}`, this.operator);
        this.accessToken = response.data.access_token;
        return response.data;
    }

    private async onRequestSuccess(config: InternalAxiosRequestConfig) {
        if (this.accessToken) {
            config.headers.Authorization = `Bearer ${this.accessToken}`;
        } else {
            await this.login();
        }
        return config;
    }

    private async onResponseSuccess(response: AxiosResponse) {
        return response;
    }

    private async onResponseError(error: AxiosError) {
        const errStatusCode = error.response?.status;
        if (errStatusCode !== 401 || error?.config?.url?.includes('refresh') || error?.config?.url?.includes('login')) {
            const errMessage = error.response?.data ?? error?.response ?? error;
            return Promise.reject(new Error(JSON.stringify(errMessage, null, 2)));
        }
        return this.retryRequest(error);
    }

    private async retryRequest(error: AxiosError) {
        const originalConfig = error.config as AxiosRequestConfig;
        try {
            await this.login();
            return this.axiosClient(originalConfig);
        } catch{
            return Promise.reject(error);
        }
    }
}