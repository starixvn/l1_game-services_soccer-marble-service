import http from "http";
import url from "url";
import { INCOMING, FLOW, dateWithOffset, CONFIGURED_DATE } from "../shared/index.js";

const calculateSettlementStatus = (result, betChoice, point) => {
  const [homeGoals, awayGoals] = result.split(':').map(Number);
  const totalGoals = homeGoals + awayGoals;
  const goalDifference = homeGoals - awayGoals;
  
  const settlementHandlers = {
    ft_hdp_home: () => (goalDifference + point) > 0 ? 'W' : 'L',
    ft_hdp_away: () => (goalDifference + point) < 0 ? 'W' : 'L',
    h1_hdp_home: () => (goalDifference + point) > 0 ? 'W' : 'L',
    h1_hdp_away: () => (goalDifference + point) < 0 ? 'W' : 'L',
    ft_ou_over: () => totalGoals > point ? 'W' : 'L',
    ft_ou_under: () => totalGoals < point ? 'W' : 'L',
    h1_ou_over: () => totalGoals > point ? 'W' : 'L',
    h1_ou_under: () => totalGoals < point ? 'W' : 'L',
    ft_oe_even: () => totalGoals % 2 === 0 ? 'W' : 'L',
    ft_oe_odd: () => totalGoals % 2 === 1 ? 'W' : 'L',
    h1_oe_even: () => totalGoals % 2 === 0 ? 'W' : 'L',
    h1_oe_odd: () => totalGoals % 2 === 1 ? 'W' : 'L',
    ft_1x2_home: () => goalDifference > 0 ? 'W' : 'L',
    ft_1x2_away: () => goalDifference < 0 ? 'W' : 'L',
    ft_1x2_draw: () => goalDifference === 0 ? 'W' : 'L',
    h1_1x2_home: () => goalDifference > 0 ? 'W' : 'L',
    h1_1x2_away: () => goalDifference < 0 ? 'W' : 'L',
    h1_1x2_draw: () => goalDifference === 0 ? 'W' : 'L'
  };
  
  const handler = settlementHandlers[betChoice];
  return handler ? handler() : 'P';
};

const eventsSampleData = (date) =>  ({
    "eventID": 8594229587181,
    "eventNameAKey": "clb_por",
    "eventNameBKey": "clb_psg",
    "operatorGameId": "158",
    "theme": "2001",
    "eventDetails": [
      {
        "eventID": 8594229587181,
        "oddsAvailableTs": dateWithOffset(date, FLOW.h1OddAvailable + INCOMING).toISOString(),
        "scheduleStartTs": dateWithOffset(date, FLOW.h1ScheduleStart + INCOMING).toISOString(),
        "resultsAvailableTs": dateWithOffset(date, FLOW.h1ResultAvailable + INCOMING).toISOString(),
        "hasResults": true,
        "goalInfo": "https://d10r8t0fxmjzn1.cloudfront.net/2001/2c84c0e039498d0a290ea4936a8db19078a668281f4a0080e6f816b71c20c5fe.json",
        "playlist": "https://d10r8t0fxmjzn1.cloudfront.net/2001/2c84c0e039498d0a290ea4936a8db19078a668281f4a0080e6f816b71c20c5fe.mp4",
        "result": "2:0",
        "markets": [
          {
            "marketID": 1,
            "marketNameKey": "MARKET_HANDICAP",
            "marketName": "Handicap",
            "selections": [
              {
                "price": 1.81,
                "point": 1.5,
                "settlementStatus": calculateSettlementStatus("2:0", "ft_hdp_home", 1.5),
                "selectionID": 1,
                "column": 1,
                "selectionOrder": 1,
                "selectionNameLongKey": "HOME_WIN",
                "betChoice": "ft_hdp_home"
              },
              {
                "price": 2.22,
                "point": -1.5,
                "settlementStatus": calculateSettlementStatus("2:0", "ft_hdp_away", -1.5),
                "selectionID": 2,
                "column": 2,
                "selectionOrder": 1,
                "selectionNameLongKey": "AWAY_WIN",
                "betChoice": "ft_hdp_away"
              }
            ]
          },
          {
            "marketID": 2,
            "marketNameKey": "MARKET_1H_HANDICAP",
            "marketName": "1H Handicap",
            "selections": [
              {
                "price": 2.12,
                "point": 0.5,
                "settlementStatus": calculateSettlementStatus("2:0", "h1_hdp_home", 0.5),
                "selectionID": 3,
                "column": 1,
                "selectionOrder": 1,
                "selectionNameLongKey": "HOME_WIN",
                "betChoice": "h1_hdp_home"
              },
              {
                "price": 1.89,
                "point": -0.5,
                "settlementStatus": calculateSettlementStatus("2:0", "h1_hdp_away", -0.5),
                "selectionID": 4,
                "column": 2,
                "selectionOrder": 1,
                "selectionNameLongKey": "AWAY_WIN",
                "betChoice": "h1_hdp_away"
              }
            ]
          },
          {
            "marketID": 3,
            "marketNameKey": "MARKET_OVER_UNDER",
            "marketName": "Over/Under",
            "selections": [
              {
                "price": 1.67,
                "point": 4.5,
                "settlementStatus": calculateSettlementStatus("2:0", "ft_ou_over", 4.5),
                "selectionID": 5,
                "column": 1,
                "selectionOrder": 1,
                "selectionNameLongKey": "OVER",
                "betChoice": "ft_ou_over"
              },
              {
                "price": 2.48,
                "point": 4.5,
                "settlementStatus": calculateSettlementStatus("2:0", "ft_ou_under", 4.5),
                "selectionID": 6,
                "column": 2,
                "selectionOrder": 1,
                "selectionNameLongKey": "UNDER",
                "betChoice": "ft_ou_under"
              }
            ]
          },
          {
            "marketID": 4,
            "marketNameKey": "MARKET_1H_OVER_UNDER",
            "marketName": "1H Over/Under",
            "selections": [
              {
                "price": 2.53,
                "point": 2.5,
                "settlementStatus": calculateSettlementStatus("2:0", "h1_ou_over", 2.5),
                "selectionID": 7,
                "column": 1,
                "selectionOrder": 1,
                "selectionNameLongKey": "OVER",
                "betChoice": "h1_ou_over"
              },
              {
                "price": 1.65,
                "point": 2.5,
                "settlementStatus": calculateSettlementStatus("2:0", "h1_ou_under", 2.5),
                "selectionID": 8,
                "column": 2,
                "selectionOrder": 1,
                "selectionNameLongKey": "UNDER",
                "betChoice": "h1_ou_under"
              }
            ]
          },
          {
            "marketID": 5,
            "marketNameKey": "MARKET_EVEN_ODD",
            "marketName": "Odd/Even",
            "selections": [
              {
                "price": 2,
                "point": 0,
                "settlementStatus": calculateSettlementStatus("2:0", "ft_oe_even", 0),
                "selectionID": 9,
                "column": 1,
                "selectionOrder": 1,
                "selectionNameLongKey": "EVEN",
                "betChoice": "ft_oe_even"
              },
              {
                "price": 1.99,
                "point": 0,
                "settlementStatus": calculateSettlementStatus("2:0", "ft_oe_odd", 0),
                "selectionID": 10,
                "column": 2,
                "selectionOrder": 1,
                "selectionNameLongKey": "ODD",
                "betChoice": "ft_oe_odd"
              }
            ]
          },
          {
            "marketID": 6,
            "marketNameKey": "MARKET_1H_EVEN_ODD",
            "marketName": "1H Odd/Even",
            "selections": [
              {
                "price": 1.86,
                "point": 0,
                "settlementStatus": calculateSettlementStatus("2:0", "h1_oe_even", 0),
                "selectionID": 11,
                "column": 1,
                "selectionOrder": 1,
                "selectionNameLongKey": "EVEN",
                "betChoice": "h1_oe_even"
              },
              {
                "price": 2.16,
                "point": 0,
                "settlementStatus": calculateSettlementStatus("2:0", "h1_oe_odd", 0),
                "selectionID": 12,
                "column": 2,
                "selectionOrder": 1,
                "selectionNameLongKey": "ODD",
                "betChoice": "h1_oe_odd"
              }
            ]
          },
          {
            "marketID": 7,
            "marketNameKey": "MARKET_1X2",
            "marketName": "1X2",
            "hedgeBetExclusion": [
              "ft_1x2_draw"
            ],
            "selections": [
              {
                "price": 4.5,
                "point": 0,
                "settlementStatus": calculateSettlementStatus("2:0", "ft_1x2_home", 0),
                "selectionID": 13,
                "column": 1,
                "selectionOrder": 1,
                "selectionNameLongKey": "HOME",
                "betChoice": "ft_1x2_home"
              },
              {
                "price": 1.59,
                "point": 0,
                "settlementStatus": calculateSettlementStatus("2:0", "ft_1x2_away", 0),
                "selectionID": 14,
                "column": 2,
                "selectionOrder": 1,
                "selectionNameLongKey": "AWAY",
                "betChoice": "ft_1x2_away"
              },
              {
                "price": 6.58,
                "point": 0,
                "settlementStatus": calculateSettlementStatus("2:0", "ft_1x2_draw", 0),
                "selectionID": 15,
                "column": 3,
                "selectionOrder": 1,
                "selectionNameLongKey": "TIE",
                "betChoice": "ft_1x2_draw"
              }
            ]
          },
          {
            "marketID": 8,
            "marketNameKey": "MARKET_1H_1X2",
            "marketName": "1H 1X2",
            "hedgeBetExclusion": [
              "h1_1x2_draw"
            ],
            "selections": [
              {
                "price": 3.89,
                "point": 0,
                "settlementStatus": calculateSettlementStatus("2:0", "h1_1x2_home", 0),
                "selectionID": 16,
                "column": 1,
                "selectionOrder": 1,
                "selectionNameLongKey": "HOME",
                "betChoice": "h1_1x2_home"
              },
              {
                "price": 1.89,
                "point": 0,
                "settlementStatus": calculateSettlementStatus("2:0", "h1_1x2_away", 0),
                "selectionID": 17,
                "column": 2,
                "selectionOrder": 1,
                "selectionNameLongKey": "AWAY",
                "betChoice": "h1_1x2_away"
              },
              {
                "price": 4.65,
                "point": 0,
                "settlementStatus": calculateSettlementStatus("2:0", "h1_1x2_draw", 0),
                "selectionID": 18,
                "column": 3,
                "selectionOrder": 1,
                "selectionNameLongKey": "TIE",
                "betChoice": "h1_1x2_draw"
              }
            ]
          }
        ]
      },
      {
        "eventID": 8594229587181,
        "oddsAvailableTs": dateWithOffset(date, FLOW.h2OddAvailable + INCOMING).toISOString(),
        "scheduleStartTs": dateWithOffset(date, FLOW.h2ScheduleStart + INCOMING).toISOString(),
        "resultsAvailableTs": dateWithOffset(date, FLOW.h2ResultAvailable + INCOMING).toISOString(),
        "hasResults": true,
        "goalInfo": "https://d10r8t0fxmjzn1.cloudfront.net/2001/f72b92e718c7819a30c7877411c3b9ca74526b98c99d0008e3fe3dd139d6d433.json",
        "playlist": "https://d10r8t0fxmjzn1.cloudfront.net/2001/f72b92e718c7819a30c7877411c3b9ca74526b98c99d0008e3fe3dd139d6d433.mp4",
        "markets": [
          {
            "marketID": 1,
            "marketNameKey": "MARKET_HANDICAP",
            "marketName": "Handicap",
            "selections": [
              {
                "price": 2.21,
                "point": 0.5,
                "settlementStatus": calculateSettlementStatus("1:0", "ft_hdp_home", 0.5),
                "selectionID": 1,
                "column": 1,
                "selectionOrder": 1,
                "selectionNameLongKey": "HOME_WIN",
                "betChoice": "ft_hdp_home"
              },
              {
                "price": 1.82,
                "point": -0.5,
                "settlementStatus": calculateSettlementStatus("1:0", "ft_hdp_away", -0.5),
                "selectionID": 2,
                "column": 2,
                "selectionOrder": 1,
                "selectionNameLongKey": "AWAY_WIN",
                "betChoice": "ft_hdp_away"
              }
            ]
          },
          {
            "marketID": 3,
            "marketNameKey": "MARKET_OVER_UNDER",
            "marketName": "Over/Under",
            "selections": [
              {
                "price": 1.89,
                "point": 4.5,
                "settlementStatus": calculateSettlementStatus("1:0", "ft_ou_over", 4.5),
                "selectionID": 5,
                "column": 1,
                "selectionOrder": 1,
                "selectionNameLongKey": "OVER",
                "betChoice": "ft_ou_over"
              },
              {
                "price": 2.11,
                "point": 4.5,
                "settlementStatus": calculateSettlementStatus("1:0", "ft_ou_under", 4.5),
                "selectionID": 6,
                "column": 2,
                "selectionOrder": 1,
                "selectionNameLongKey": "UNDER",
                "betChoice": "ft_ou_under"
              }
            ]
          },
          {
            "marketID": 5,
            "marketNameKey": "MARKET_EVEN_ODD",
            "marketName": "Odd/Even",
            "selections": [
              {
                "price": 2.01,
                "point": 0,
                "settlementStatus": calculateSettlementStatus("1:0", "ft_oe_even", 0),
                "selectionID": 9,
                "column": 1,
                "selectionOrder": 1,
                "selectionNameLongKey": "EVEN",
                "betChoice": "ft_oe_even"
              },
              {
                "price": 1.98,
                "point": 0,
                "settlementStatus": calculateSettlementStatus("1:0", "ft_oe_odd", 0),
                "selectionID": 10,
                "column": 2,
                "selectionOrder": 1,
                "selectionNameLongKey": "ODD",
                "betChoice": "ft_oe_odd"
              }
            ]
          }
        ],
        "result": "1:0"
      }
    ],
    "scheduleStartTs": dateWithOffset(date, FLOW.scheduleStart + INCOMING).toISOString(),
    "productCode": "SM_CLUB_WC_25",
    "productTypeKey": "MARBLE"
  })

const scheduleSampleData = (date) => ([
    {
      "eventID": 8594229587183,
      "eventNameAKey": "clb_por",
      "operatorGameId": "158",
      "eventNameBKey": "clb_rma",
      "theme": "2001",
      "scheduleStartTs": dateWithOffset(date, FLOW.scheduleStart + INCOMING).toISOString(),
      "productCode": "SM_CLUB_WC_25",
      "productTypeKey": "MARBLE"
    }
  ])

let shouldReturnError = false;
const port = 5999;

const configuredDate = CONFIGURED_DATE;

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    if (parsedUrl.pathname === "/api/login") {
        return login(req, res);
    } 
    if (parsedUrl.pathname === "/api/schedule") {
        return schedule(req, res);
    } 
    if (parsedUrl.pathname === "/api/events") {
        return events(req, res);
    } 
    if (parsedUrl.pathname === "/api/healthcheck") {
        return healthcheck(req, res);
    } 
    if (parsedUrl.pathname === "/api/intentional-error") {
        return intentionalError(req, res);
    } 
    if (parsedUrl.pathname === "/api/restore-intentional-error") {
        return restoreIntentionalError(req, res);
    } 
    else {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Not Found" }));
    }
});

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

// /api/login

function login(req, res) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ access_token: "1234567890" }));
}

function schedule(req, res) {
    const data = shouldReturnError ? [] : scheduleSampleData(configuredDate) ;
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
}

function events(req, res) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(eventsSampleData(configuredDate)));
}

function healthcheck(req, res) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
}

function intentionalError(req, res) {
    shouldReturnError = true;
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
}

function restoreIntentionalError(req, res) {
    shouldReturnError = false;
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
}