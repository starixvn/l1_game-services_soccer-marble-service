import { HalfConfigType, MatchConfigType } from "../match-configs";
import { ResultType, SettlementResultType } from "../models/rounds";
import Chance from "chance";
import crypto from "crypto";
import { DEFAULT_NUMBER_OF_VIDEOS, OVER_UNDER_VALUE } from "../constants";
import { secureShuffle, secureWeightedPick } from "sc-core-rng";

type DataResultType = {
    numberOfVideos: Record<string, number>;
    matchConfig: MatchConfigType;
};

export const generateResult = (data: DataResultType): ResultType => {
    const chance = new Chance();
    const numberOfVideos = data.numberOfVideos || DEFAULT_NUMBER_OF_VIDEOS;

    const firstHalf = generateResultForHalf(data.matchConfig.firstHalfConfig);
    const secondHalf = generateResultForHalf(data.matchConfig.secondHalfConfig);
    const videoInfo = getVideoInfoFromResult(firstHalf, secondHalf, numberOfVideos);
    const homeWinsOnDraw = chance.bool();
    const penalty = generatePenaltyResult(homeWinsOnDraw);

    return {
        firstHalf,
        secondHalf,
        ...videoInfo,
        overUnderValue: OVER_UNDER_VALUE,
        homeWinsOnDraw,
        penalty,
    };
};

export const generateResultFromAdminRawResult = (roundResult: ResultType, numberOfVideos: Record<string, number>): ResultType => {
    const firstHalf = roundResult.firstHalf || "0";
    const secondHalf = roundResult.secondHalf || "0";
    const videoInfo = getVideoInfoFromResult(firstHalf, secondHalf, numberOfVideos);
    const penalty = generatePenaltyResult(roundResult.homeWinsOnDraw);

    return {
        firstHalf,
        secondHalf,
        homeWinsOnDraw: roundResult.homeWinsOnDraw,
        penalty,
        ...videoInfo,
        overUnderValue: OVER_UNDER_VALUE,
    };
};

export const getSettlementResult = (roundResult: ResultType): SettlementResultType => {
    const { firstHalf, secondHalf } = roundResult;

    const firstHalfHomeGoals = firstHalf.split("H").length - 1;
    const firstHalfAwayGoals = firstHalf.split("A").length - 1;

    const secondHalfHomeGoals = secondHalf.split("H").length - 1;
    const secondHalfAwayGoals = secondHalf.split("A").length - 1;

    const homeGoals = firstHalfHomeGoals + secondHalfHomeGoals;
    const awayGoals = firstHalfAwayGoals + secondHalfAwayGoals;

    const isOver = homeGoals + awayGoals > roundResult.overUnderValue;
    const isOdd = (homeGoals + awayGoals) % 2 === 1;

    const home = homeGoals > awayGoals;
    const away = awayGoals > homeGoals;
    const draw = homeGoals === awayGoals;
    const over = isOver;
    const under = !isOver;
    const odd = isOdd;
    const even = !isOdd;

    return {
        home: home,
        away: away,
        draw: draw,
        over: over,
        under: under,
        odd: odd,
        even: even,
        homeLive: home,
        awayLive: away,
        drawLive: draw,
        evenLive: even,
        oddLive: odd,
        overLive: over,
        underLive: under,
    };
};

export const generateRawResultForHash = () => {};

const generateResultForHalf = (halfConfig: HalfConfigType) => {
    const scoreResult = getScoreFromScoreRate(halfConfig.scoreRate);

    const [homeGoals, awayGoals] = scoreResult.split("-").map(Number);
    const sequence = Array(homeGoals).fill("H").concat(Array(awayGoals).fill("A"));

    const result = secureShuffle(sequence).join("");

    return result || "0";
};

export const getScoreFromScoreRate = (scoreRate: Record<string, number>) => {
    const score = Object.keys(scoreRate);
    const rate = Object.values(scoreRate);

    return secureWeightedPick(score, rate);
};

const getVideoInfoFromResult = (firstHalf: string, secondHalf: string, numberOfVideos: Record<string, number>) => {
    const firstHalfVideo = generateVideoName(firstHalf, numberOfVideos);
    const secondHalfVideo = generateVideoName(secondHalf, numberOfVideos, false, firstHalfVideo);

    return {
        firstHalfVideo,
        secondHalfVideo,
    };
};

export const generateVideoName = (result: string, numberOfVideos: Record<string, number>, videoDefault = false, ignoredVideo = "") => {
    const chance = new Chance();
    const currentNumberOfVideos = numberOfVideos[result] || DEFAULT_NUMBER_OF_VIDEOS[result];
    let videoIndex = videoDefault ? 0 : chance.integer({ min: 1, max: currentNumberOfVideos }) - 1;
    let videoName = crypto.createHash("sha256").update(`${result}-${videoIndex}`).digest("hex");

    if (videoName === ignoredVideo && !videoDefault) {
        videoIndex = (videoIndex + 1) % currentNumberOfVideos;
        videoName = crypto.createHash("sha256").update(`${result}-${videoIndex}`).digest("hex");
    }

    return videoName;
};

const generatePenaltyResult = (homeWinsOnDraw: boolean) => {
    const chance = new Chance();
    const maxLosingPenalty = 4;
    const losingTeamPenalty = chance.integer({ min: 0, max: maxLosingPenalty });
    const difference = losingTeamPenalty === maxLosingPenalty ? 1 : chance.integer({ min: 1, max: 2 });
    const winningTeamPenalty = losingTeamPenalty + difference;

    return homeWinsOnDraw ? { home: winningTeamPenalty, away: losingTeamPenalty } : { home: losingTeamPenalty, away: winningTeamPenalty };
};
