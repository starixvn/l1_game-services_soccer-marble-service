export const PRE_MATCH_BET_CHOICES = {
    home: "home",
    away: "away",
    draw: "draw",
    over: "over",
    under: "under",
    odd: "odd",
    even: "even",
};

export const LIVE_BET_CHOICES = {
    homeLive: "homeLive",
    awayLive: "awayLive",
    drawLive: "drawLive",
    overLive: "overLive",
    underLive: "underLive",
    oddLive: "oddLive",
    evenLive: "evenLive",
};

export const BET_CHOICES = {
    ...PRE_MATCH_BET_CHOICES,
    ...LIVE_BET_CHOICES,
};

export const ODDS_TYPE = {
    ...BET_CHOICES,
};

export const BET_CHOICE_ENUM = {
    [PRE_MATCH_BET_CHOICES.home]: 1,
    [PRE_MATCH_BET_CHOICES.away]: 2,
    [PRE_MATCH_BET_CHOICES.draw]: 3,
    [PRE_MATCH_BET_CHOICES.over]: 4,
    [PRE_MATCH_BET_CHOICES.under]: 5,
    [PRE_MATCH_BET_CHOICES.odd]: 6,
    [PRE_MATCH_BET_CHOICES.even]: 7,
    [LIVE_BET_CHOICES.homeLive]: 8,
    [LIVE_BET_CHOICES.awayLive]: 9,
    [LIVE_BET_CHOICES.drawLive]: 10,
    [LIVE_BET_CHOICES.overLive]: 11,
    [LIVE_BET_CHOICES.underLive]: 12,
    [LIVE_BET_CHOICES.oddLive]: 13,
    [LIVE_BET_CHOICES.evenLive]: 14,
};

export const DEFAULT_MARGIN_BASE = 0.02;

export const OVER_UNDER_VALUE = 4.5;

export const IS_DEV_ENV = process.env.NODE_ENV === "development";

export const GAME_NAME = "marblefootball2";

export const MODEL_NAME_PREFIX = IS_DEV_ENV ? `${GAME_NAME}_dev` : `${GAME_NAME}`;

export const DEFAULT_NUMBER_OF_VIDEOS: Record<string, number> = {
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
    H: 19,
};

export const DEFAULT_TOURNAMENT_CODES = {
    code: "UCL",
    teams: ["MCI", "RMA", "BAR", "LIV", "ARS", "FCB", "INT", "LEV", "AVL", "ATA", "BVB", "JUV", "PSG", "SLB", "ATM", "MIL"],
};
