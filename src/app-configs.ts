const appConfigs = {
    hostingPort: 5000,
    apiSettings: {
        enabledApi: true,
        apiUrl: "https://l1-proxy1.lumigame.com/game-api",
        authUrl: "https://l1-auth1.lumigame.com",
        client: {
            id: "game-server",
            secret: "gameserver@20luminet&",
        },
        useAuthenticate: true,
        requestTimeout: 5000,
        placeBetTimeout: 2000,
        enabledApiLogs: true,
    },
    socketOptions: {
        pingInterval: 60 * 1000,
        pingTimeout: 60 * 1000,
        transports: ["websocket"],
        allowUpgrades: false,
        perMessageDeflate: false,
        maxRequestsPerInterval: 100, // default 1000
        rateLimitInterval: 10 * 1000, // default 10 * 1000
    },
    enabledLogs: true,
    database: {
        url: "mongodb://lmn_backend:LmnBackend@10.10.50.12:39101,10.10.50.13:39101,10.10.50.14:39101/?replicaSet=L1pLocal&appName=marblefootball2",
        options: {
            dbName: "minigame",
            useNewUrlParser: true,
            useUnifiedTopology: true,
            auto_reconnect: true,
        },
    },
    sentry: {
        sentryUrl: "https://3711f3082699411a8716a3221ca1fd9e@sentry.lumigame.com/89",
        logIdentifier: "MarbleFootBall2-Dev",
        env: "DEV",
    },
    authenticateSettings: {
        url: "https://l1-auth1.lumigame.com",
        id: "game-services",
        secret: "gameservices@20luminet&",
        requestTimeout: 10000,
        useAuthenticate: true,
        audiences: ["api", "admin-api"],
    },
    userServiceSettings: {
        url: "https://l1-proxy1.lumigame.com/user",
    },
    adminSecretKey: "asWDEerfOIdgsdqRTFabvmgh",
    metrics: {
        enable: true,
        secretKey: "6c1f0f28-70f2-46ae-b031-22624a6cd8df",
    },
    enableMsgpackParser: false,
    gameManagementApiSettings: {
        BASE: "https://l1-proxy1.lumigame.com/game-management-service",
    },
    disableCors: true,
    otel: {
        system: "SG",
        enabled: true,
        endpoint: "http://10.10.50.69:4318/v1/traces",
    },
    liveStreamServer: "https://d1aof1lwumql9k.cloudfront.net/114_STAGING/",
    gameResultSettings: {
        baseUrl: "https://l1-result1.lumigame.com",
        id: "Game Service",
        key: "58148de3-b895-4f6b-82de-a35eed1b4b28",
    },
    proxyServer: {
        enabled: false,
        url: "",
    },
    cache: {
        ttl: 1000 * 60 * 5,
    },
};

export default appConfigs;
