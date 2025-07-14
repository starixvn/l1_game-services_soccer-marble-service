// NOSONAR

import { DEFAULT_NUMBER_OF_VIDEOS } from "../constants";
import appConfigs from "../app-configs";
import { generateVideoName } from "../helpers/result-helper";
import fs from "fs";
import path from "path";

function saveFiles(filename: string, data: string) {
    const dirname = path.dirname(filename);
    const filePath = path.join(dirname, "src", "timelines", filename);

    fs.writeFile(filePath, data, (err) => {
        if (err) {
            console.error("Error writing data to file", err);
        } else {
            console.log(`File saved as ${filename}`);
        }
    });
}

async function getVideoTimeline(videoName: string): Promise<number[]> {
    const url = new URL(`${videoName}.json`, appConfigs.liveStreamServer);

    try {
        const response = await fetch(url);

        if (!response.ok) {
            console.log(`Failed to fetch video timeline ${url} with error: ${response.status}`);
            return [];
        }

        const data = await response.json();

        return data.timeLine;
    } catch (error) {
        console.log(`Failed to get video timeline ${url} with error: ${error}`);
        return [];
    }
}

async function getEventTimeline(videoName: string): Promise<number[]> {
    const url = new URL(`event_${videoName}.json`, appConfigs.liveStreamServer);

    try {
        const response = await fetch(url);

        if (!response.ok) {
            console.log(`Failed to fetch video timeline ${url} with error: ${response.status}`);
            return [];
        }

        return response.json();
    } catch (error) {
        console.log(`Failed to get video timeline ${url} with error: ${error}`);
        return [];
    }
}

async function fetchDefaultEventTimelines() {
    const eventTimelines = {} as Record<string, number[]>;

    for (const key in DEFAULT_NUMBER_OF_VIDEOS) {
        const videoName = generateVideoName(key, {}, true);
        const timeline = await getEventTimeline(videoName);
        eventTimelines[`${videoName}_${key}`] = timeline;
    }

    console.log("eventTimelines: \n", eventTimelines);
    saveFiles("event-timelines.json", JSON.stringify(eventTimelines));
    console.log("Done saving event timelines");
}

async function fetchDefaultVideoTimelines() {
    const videoTimelines = {} as Record<string, number[]>;

    for (const key in DEFAULT_NUMBER_OF_VIDEOS) {
        const videoName = generateVideoName(key, {}, true);
        const timeline = await getVideoTimeline(videoName);
        videoTimelines[`${videoName}_${key}`] = timeline;
    }

    console.log("videoTimelines: \n", videoTimelines);
    saveFiles("video-timelines.json", JSON.stringify(videoTimelines));
    console.log("Done saving video timelines");
}

fetchDefaultVideoTimelines();
fetchDefaultEventTimelines();