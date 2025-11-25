import { SystemNotification, EventDetailNotification, OddsFeedEventName, OddsFeedEventSource } from "odds-feed-client";
import { MarbleEvent } from "../container-registry";
import GameData from "../../game-data";

interface StreamingServiceContainer {   
    oddsFeedEventSource: OddsFeedEventSource<MarbleEvent>;
    gameData: GameData;
}

export class StreamingService {
    private readonly oddsFeedEventSource: OddsFeedEventSource<MarbleEvent>;
    private readonly gameData: GameData;
    private readonly boundHandleEventDetailUpComing: (notification: EventDetailNotification) => void;
    private readonly boundHandleEventCleanup: (notification: SystemNotification) => void;
    private _currentPlaylistByEventId: Record<string, string> = {};

    constructor(container: StreamingServiceContainer) {
        this.oddsFeedEventSource = container.oddsFeedEventSource;
        this.gameData = container.gameData;
        this.boundHandleEventDetailUpComing = this.handleEventDetailUpComing.bind(this);
        this.boundHandleEventCleanup = this.handleEventCleanup.bind(this);
    }

    get currentPlaylist() {
        const roundId = this.gameData.roundId;
        return this._currentPlaylistByEventId[roundId];
    }

    init() {
        this.oddsFeedEventSource.eventDetailOn(OddsFeedEventName.EventDetailUpComing, this.boundHandleEventDetailUpComing);
    }

    dispose() {
        this.oddsFeedEventSource.eventDetailOff(OddsFeedEventName.EventDetailUpComing, this.boundHandleEventDetailUpComing);
        this.oddsFeedEventSource.cleanupOn(this.boundHandleEventCleanup);
    }

    handleEventDetailUpComing({ event, index }: EventDetailNotification) {
        this._currentPlaylistByEventId[event.eventID] = event.eventDetails[index].playlist;
    }

    handleEventCleanup({ eventID }: SystemNotification) {
        delete this._currentPlaylistByEventId[eventID];
    }
}