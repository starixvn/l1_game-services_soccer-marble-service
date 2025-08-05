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

export const DEFAULT_ODD_PREMATCH_ODDS = {
    [PRE_MATCH_BET_CHOICES.home]: 0,
    [PRE_MATCH_BET_CHOICES.away]: 0,
    [PRE_MATCH_BET_CHOICES.draw]: 0,
    [PRE_MATCH_BET_CHOICES.over]: 0,
    [PRE_MATCH_BET_CHOICES.under]: 0,
    [PRE_MATCH_BET_CHOICES.odd]: 0,
    [PRE_MATCH_BET_CHOICES.even]: 0,
};

export const DEFAULT_ODD_LIVE_ODDS = {  
    [LIVE_BET_CHOICES.homeLive]: 0,
    [LIVE_BET_CHOICES.awayLive]: 0,
    [LIVE_BET_CHOICES.drawLive]: 0,
    [LIVE_BET_CHOICES.overLive]: 0,
    [LIVE_BET_CHOICES.underLive]: 0,
    [LIVE_BET_CHOICES.oddLive]: 0,
    [LIVE_BET_CHOICES.evenLive]: 0,
};

export const ODD_FEED_TO_BET_CHOICE_MAP: Record<string, string> = {
    '0:ft_1x2_home': PRE_MATCH_BET_CHOICES.home,
    '0:ft_1x2_away': PRE_MATCH_BET_CHOICES.away,
    '0:ft_1x2_draw': PRE_MATCH_BET_CHOICES.draw,
    '0:ft_oe_even': PRE_MATCH_BET_CHOICES.even,
    '0:ft_oe_odd': PRE_MATCH_BET_CHOICES.odd,
    '0:ft_ou_over': PRE_MATCH_BET_CHOICES.over,
    '0:ft_ou_under': PRE_MATCH_BET_CHOICES.under,
    '1:ft_oe_odd': LIVE_BET_CHOICES.oddLive,
    '1:ft_oe_even': LIVE_BET_CHOICES.evenLive,
    '1:ft_ou_over': LIVE_BET_CHOICES.overLive,
    '1:ft_ou_under': LIVE_BET_CHOICES.underLive
}

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

export const GAME_NAME = "soccermarble";

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

export type BetChoiceSelection = {
    [K in keyof typeof BET_CHOICES]: string;
};

export const LOCKBET_OFFSET = -3000;

export const EVENT_OFFSET = 0;