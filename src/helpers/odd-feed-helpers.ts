import axios from "axios";

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
    resultAvailableTs: Date;
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
}

export enum PATHS {
    LOGIN = "/api/login",
    SCHEDULE = "/api/schedule",
    EVENT = "/api/events",
}

export async function login(baseUrl: string, creds: LoginCreds): Promise<LoginResponse> {
    const response = await axios.post<LoginResponse>(`${baseUrl}${PATHS.LOGIN}`, creds);
    return response.data;
}
export async function getSchedule(baseUrl: string, options: { accessToken: string }): Promise<ScheduleResponseItem[]> {
    const response = await axios.get<ScheduleResponseItem[]>(`${baseUrl}${PATHS.SCHEDULE}`, {
        headers: { Authorization: `Bearer ${options.accessToken}` },
    });
    return response.data;
}
export async function getEvent(baseUrl: string, request: EventRequest, options: { accessToken: string }): Promise<EventResponse> {
    const response = await axios.get<EventResponse>(`${baseUrl}${PATHS.EVENT}`, {
        headers: { Authorization: `Bearer ${options.accessToken}` },
        params: { eventID: request.eventID },
    });
    return response.data;
}