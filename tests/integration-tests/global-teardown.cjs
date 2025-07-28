module.exports = function () {
    globalThis.processStartOddFeed.stop();
    globalThis.processStartService.stdin.pause();
    globalThis.processStartService.kill();
};
