// NOSONAR


import crypto from "crypto";
import appConfigs from "../app-configs";
import fs from "fs";
import path from "path";

import { generateVoiceWithEventTimeline } from "../helpers/voices";

type EventTimeline = { timeLine: number[], eventName: string[] }

const NUMBER_OF_VIDEOS: Record<string, number> = {
    AAAA: 2,
    AAAH: 6,
    AAA: 2,
    AAHA: 2,
    AAHH: 2,
    AAH: 2,
    AA: 2,
    AHAA: 3,
    AHAH: 3,
    AHA: 2,
    AHHA: 4,
    AHHH: 5,
    AHH: 2,
    AH: 15,
    A: 15,
    HAAA: 2,
    HAAH: 2,
    HAA: 11,
    HAHA: 2,
    HAHH: 2,
    HAH: 12,
    HA: 2,
    HHAA: 2,
    HHAH: 3,
    HHA: 8,
    HHHA: 2,
    HHHH: 2,
    HHH: 2,
    HH: 4,
    H: 19
  }

const voiceConfig = {
    "draw4": {
      "2": 3,
      "3": 4,
      "4": 2
    },
    "lastGoal": {
      "2": 4,
      "3": 3
    },
    "draw3": {
      "2": 4,
      "3": 5,
      "4": 1
    },
    "draw2": {
      "2": 6,
      "3": 3,
      "4": 1
    },
    "draw1": {
      "1": 2,
      "2": 2,
      "3": 5,
      "4": 1
    },
    "fastGoal": {
      "2": 1,
      "3": 4,
      "4": 1
    },
    "goal5th": {
      "2": 4,
      "3": 2,
      "4": 1
    },
    "goal4th": {
      "2": 4,
      "3": 4,
      "4": 1
    },
    "goal3rd": {
      "2": 3,
      "3": 3,
      "4": 4
    },
    "goal2nd": {
      "2": 3,
      "3": 3,
      "4": 1
    },
    "firstGoal": {
      "1": 1,
      "2": 6,
      "3": 1
    },
    "goal": {
      "1": 4,
      "2": 12,
      "3": 7,
      "4": 1
    },
    "noGoal": {
      "2": 6,
      "3": 4,
      "4": 1
    },
    "save": {
      "1": 1,
      "2": 10,
      "3": 5,
      "4": 2
    }
  }

async function generateVoiceData() {
    const matches = generateMatch();

    for (const [index, match] of matches.entries()) {
        processMatch(match, index);
    }

    console.log("END OF PROCESSING, TOTAL: ", matches.length);
}

function generateAllPossibleResults() {
    const results = [];
    for (const key in NUMBER_OF_VIDEOS) {
        const numberOfVideos = NUMBER_OF_VIDEOS[key];
        for (let i = 0; i < numberOfVideos; i++) {
            results.push(`${key}-${i}`);
        }
    }

    return results;
}

function generateMatch() {
    const results = generateAllPossibleResults();
    
    const matchCombinations = [];
    
    for (const firstHalf of results) {
        for (const secondHalf of results) {
            matchCombinations.push({
                firstHalf,
                secondHalf
            });
        }
    }
    
    return matchCombinations;
}
function processMatch(match: { firstHalf: string, secondHalf: string }, index: number) {
    console.log("MATCH NUMBER : ", index)
    const firstHalfVideoName = getVideoName(match.firstHalf);
    const secondHalfVideoName = getVideoName(match.secondHalf);
    const eventMapObject = readJsonFile("event-map.json");

    const firstHalfTimeline = getVideoTimelineFromObject(eventMapObject, match.firstHalf);
    const secondHalfTimeline = getVideoTimelineFromObject(eventMapObject, match.secondHalf);

    console.log("--------- FIRST HALF ---------");
    console.log("Result: ", match.firstHalf);
    console.log("Video: ", firstHalfVideoName);
    console.log("Events:", firstHalfTimeline.eventName);
    console.log("Timeline:", firstHalfTimeline.timeLine);

    const firstHalfVoiceTimeline = generateVoiceWithEventTimeline({
        eventName: firstHalfTimeline.eventName,
        timeline: firstHalfTimeline.timeLine,
    }, voiceConfig);


    console.log("VOICES:");
    console.log("Voice Events: ", firstHalfVoiceTimeline.voice);
    console.log("Voice Timeline: ", firstHalfVoiceTimeline.timeline);

    console.log("--------- SECOND HALF ---------");
    console.log("Result: ", match.secondHalf);
    console.log("Video: ", secondHalfVideoName);
    console.log("Events:", secondHalfTimeline.eventName);
    console.log("Timeline:", secondHalfTimeline.timeLine);
    const secondHalfVoiceTimeline = generateVoiceWithEventTimeline({
        eventName: secondHalfTimeline.eventName,
        timeline: secondHalfTimeline.timeLine,
        firstHalfVoices: firstHalfVoiceTimeline.voice,
        firstHalfScore: match.firstHalf.split("-")[0]
    }, voiceConfig);
    console.log("VOICES:");
    console.log("Voice Events: ", secondHalfVoiceTimeline.voice);
    console.log("Voice Timeline: ", secondHalfVoiceTimeline.timeline);
}

function getVideoName(indexedResult: string) {
    return crypto.createHash("sha256").update(`${indexedResult}`).digest("hex");
}

function getVideoTimelineFromObject(object: Record<string, EventTimeline>, result: string) {
    return object[result];
}

async function getEventTimeline(videoName: string): Promise<{ timeLine: number[], eventName: string[] }> {
    const url = new URL(`event_${videoName}.json`, appConfigs.liveStreamServer);

    try {
        const response = await fetch(url);

        if (!response.ok) {
            console.log(`Failed to fetch video timeline ${url} with error: ${response.status}`);
            return { timeLine: [], eventName: [] };
        }

        return response.json();
    } catch (error) {
        console.log(`Failed to get video timeline ${url} with error: ${error}`);
        return { timeLine: [], eventName: [] };
    }
}

async function saveAllEventTimeline() {
    console.log("Getting event timeline map from stream server");
    const results = generateAllPossibleResults();
    const resultEventTimelineMap: Record<string, any> = {};
    for (const result of results) {
        const videoName = getVideoName(result);
        const eventTimeline = await getEventTimeline(videoName);
        resultEventTimelineMap[result] = eventTimeline;
    }

    saveFiles("event-map.json", JSON.stringify(resultEventTimelineMap, null, 2));
}

function readJsonFile(filename: string) {
    const dirname = path.dirname(filename);
    const filePath = path.join(dirname, "src", "timelines", filename);
    const data = fs.readFileSync(filePath, "utf8");
    return JSON.parse(data);
}


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
async function main() {
    await saveAllEventTimeline();
    await generateVoiceData();
}

generateVoiceData();