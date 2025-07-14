export default {
    hostingPort: 5000,
    apiSettings: {
        enabledApi: true,
        apiUrl: "http://sp-hd-game-api-local-service:5000",
        authUrl: "http://sp-hd-auth-api-local-service:5000",
        client: {
            id: "game-server",
            secret: "gameserver@20luminet&",
        },
        useAuthenticate: true,
        requestTimeout: 10000,
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
        url: "mongodb://hotdog_backend:HotdogBackend@10.10.50.12:39400,10.10.50.13:39400,10.10.50.14:39400/?replicaSet=SPLocal0&appName=marblefootball2",
        options: {
            dbName: "hotdog_minigame",
            useNewUrlParser: true,
            useUnifiedTopology: true,
            auto_reconnect: true,
        },
    },
    sentry: {
        sentryUrl: "https://81e47b9ef0c34ab08c30a8612d9a348e@sentry.lumigame.com/85",
        logIdentifier: "HD-MarbleFootball2",
        env: "LOCAL",
    },
    authenticateSettings: {
        url: "http://sp-hd-auth-api-local-service:5000",
        id: "game-services",
        secret: "gameservices@20luminet&",
        requestTimeout: 10000,
        useAuthenticate: true,
        audiences: ["api", "admin-api"],
    },
    userServiceSettings: {
        url: "http://sp-hd-user-service-local-service:5000",
    },
    adminSecretKey: "asWDEerfOIdgsdqRTFabvmgh",
    metrics: {
        enable: true,
        secretKey: "6c1f0f28-70f2-46ae-b031-22624a6cd8df",
    },
    enableMsgpackParser: false,
    gameManagementApiSettings: {
        BASE: "http://sp-hd-game-management-service-local-service:5000",
    },
    gameResultSettings: {
        baseUrl: "http://sp-hd-game-result-local-service:5000",
        id: "Game Service",
        key: "58148de3-b895-4f6b-82de-a35eed1b4b28",
    },
    disableCors: true,
    cache: {
        ttl: 1000 * 60 * 5,
    },
    proxyServer: {
        enabled: false,
        url: "",
    },
    liveStreamServer: "https://d1aof1lwumql9k.cloudfront.net/114_STAGING/",
};
