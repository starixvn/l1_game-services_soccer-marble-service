import { SchedulerConsumer } from "../../../src/consumers/scheduler-consumer";

describe("SchedulerConsumer", () => {
    let scheduler: SchedulerConsumer;
    let originalSetTimeout: typeof setTimeout;
    let setTimeoutMock: jest.Mock;

    beforeEach(() => {
        scheduler = new SchedulerConsumer();
        setTimeoutMock = jest.fn();
        originalSetTimeout = global.setTimeout;
        (global as any).setTimeout = setTimeoutMock;
    });

    afterEach(() => {
        (global as any).setTimeout = originalSetTimeout;
        jest.restoreAllMocks();
    });

    describe("schedule", () => {
        it("should schedule a task in the future", () => {
            // Arrange
            const callback = jest.fn();
            const future = new Date(Date.now() + 1000);

            // Act
            scheduler.schedule(future, callback);

            // Assert
            expect(setTimeoutMock).toHaveBeenCalledTimes(1);
            expect(typeof setTimeoutMock.mock.calls[0][0]).toBe("function");
            expect(setTimeoutMock.mock.calls[0][1]).toBeGreaterThan(0);
        });

        it("should schedule a task immediately if time is in the past", () => {
            // Arrange
            const callback = jest.fn();
            const past = new Date(Date.now() - 1000);

            // Act
            scheduler.schedule(past, callback);

            // Assert
            expect(setTimeoutMock).toHaveBeenCalledTimes(1);
            expect(setTimeoutMock.mock.calls[0][1]).toBe(0);
        });
    });

    describe("callbackWithLog", () => {
        it("should call the callback and return result", () => {
            // Arrange
            const callback = jest.fn().mockReturnValue("result");
            const id = "test-id";
            const cb = (scheduler as any).callbackWithLog(callback, id);

            // Act
            const result = cb("arg1", "arg2");

            // Assert
            expect(callback).toHaveBeenCalledWith("arg1", "arg2");
            expect(result).toBe("result");
        });

        it("should delete the task after completion", () => {
            // Arrange
            const callback = jest.fn();
            const id = "delete-id";
            (scheduler as any).tasks[id] = callback;
            const cb = (scheduler as any).callbackWithLog(callback, id);

            // Act
            cb();

            // Assert
            expect((scheduler as any).tasks[id]).toBeUndefined();
        });

        it("should always delete task even if callback throws", () => {
            // Arrange
            const callback = jest.fn().mockImplementation(() => { throw new Error("fail"); });
            const id = "fail-id";
            (scheduler as any).tasks[id] = callback;
            const cb = (scheduler as any).callbackWithLog(callback, id);

            // Act & Assert
            expect(() => cb()).toThrow("fail");
            expect((scheduler as any).tasks[id]).toBeUndefined();
        });
    });
});
