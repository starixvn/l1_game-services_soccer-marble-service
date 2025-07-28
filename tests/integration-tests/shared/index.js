export const CONFIGURED_DATE = new Date();


export const INCOMING = 5;

export const FLOW = {
    scheduleStart: 5,
    h1OddAvailable: 0,
    h1ScheduleStart: 15,
    h1ResultAvailable: 20,
    h2OddAvailable: 20,
    h2ScheduleStart: 30,
    h2ResultAvailable: 35
}

export function dateWithOffset(date, offset) {
    return new Date(date.getTime() + offset * 1000);
}