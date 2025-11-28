import { Event } from "odds-feed-client";

interface EventEndedArgs {
    event: Event;
    now: number;
}

export function isEventEnded({ event, now }: EventEndedArgs) {
    if (!event.eventDetails) {
        return true;
    }

    if (event.eventDetails.length === 0) {
        return true;
    }
    const lastIndex = event.eventDetails.length - 1;
    const currEventEndTime = 
        new Date(event?.eventDetails[lastIndex].resultsAvailableTs)
            .getTime();
    return now > currEventEndTime;
}