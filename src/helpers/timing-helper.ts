import { MarbleEvent } from "../features/shared-types";

interface EventEndedArgs {
    event: MarbleEvent;
    now: number;
}

export function isEventEnded({ event, now }: EventEndedArgs) {
    if (!event.eventDetails) {
        return true;
    }

    if (event.eventDetails.length === 0) {
        return true;
    }
    const currEventEndTime = new Date(event.scheduleEndTs).getTime();
    return now > currEventEndTime;
}