export default {
    hostingPort: 5000,
    apiSettings: {
        enabledApi: true,
        apiUrl: "http://l2-game-api-sit-service:5000",
        authUrl: "http://l2-auth-api-sit-service:5000",
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
        url: "mongodb://lmn_backend:LmnBackend%40517@10.99.99.53:39230,10.99.99.54:39230,10.99.99.188:39230,10.99.99.187:39230/?replicaSet=SabaL2SIT&appName=marblefootball2",
        options: {
            dbName: "minigame",
            useNewUrlParser: true,
            useUnifiedTopology: true,
            auto_reconnect: true,
        },
    },
    sentry: {
        sentryUrl: "http://8ac47fca6d3e4a41908896a64ef201ac@10.2.190.51:9009/53",
        logIdentifier: "MarbleFootBall2",
        env: "SIT",
    },
    authenticateSettings: {
        url: "http://l2-auth-api-sit-service:5000",
        id: "game-services",
        secret: "gameservices@20luminet&",
        requestTimeout: 10000,
        useAuthenticate: true,
        audiences: ["api", "admin-api"],
    },
    userServiceSettings: {
        url: "http://l2-user-service-sit-service:5000",
    },
    adminSecretKey: "asWDEerfOIdgsdqRTFabvmgh",
    metrics: {
        enable: true,
        secretKey: "6c1f0f28-70f2-46ae-b031-22624a6cd8df",
    },
    enableMsgpackParser: true,
    gameManagementApiSettings: {
        BASE: "http://l2-game-management-service-sit-service:5000",
    },
    otel: {
        system: "VG2",
        enabled: true,
        endpoint: "http://10.2.190.51:4318/v1/traces",
    },
    liveStreamServer: "https://d1aof1lwumql9k.cloudfront.net/114_STAGING/",
    gameResultSettings: {
        baseUrl: "http://l2-game-result-sit-service:5000",
        id: "Game Service",
        key: "422541af-80aa-4524-97c8-62f643ac923e",
    },
    proxyServer: {
        enabled: true,
        url: "http://lisasqd.nebula.prod:8801",
    },
    cache: {
        ttl: 1000 * 60 * 5,
    },
};
