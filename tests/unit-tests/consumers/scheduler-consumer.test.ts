import { SchedulerConsumer } from "../../../src/consumers/scheduler-consumer";

describe("SchedulerConsumer", () => {
    let scheduler: SchedulerConsumer;
    let originalSetTimeout: typeof setTimeout;
    let setTimeoutMock: jest.Mock;
    let originalDate: typeof Date;
    let originalDateNow: typeof Date.now;
    const FIXED_TIME = 1000000;

    beforeEach(() => {
        scheduler = new SchedulerConsumer();
        setTimeoutMock = jest.fn();
        originalSetTimeout = global.setTimeout;
        (global as any).setTimeout = setTimeoutMock;

        originalDate = global.Date;
        originalDateNow = Date.now;
        const MockDate = class extends Date {
            constructor(...args: any[]) {
                if (args.length === 0) {
                    super(FIXED_TIME);
                } else {
                    super(...(args as [any]));
                }
            }
            static now() {
                return FIXED_TIME;
            }
        };
        (global as any).Date = MockDate;
        Date.now = MockDate.now;
    });

    afterEach(() => {
        (global as any).setTimeout = originalSetTimeout;
        (global as any).Date = originalDate;
        Date.now = originalDateNow;
        jest.restoreAllMocks();
    });

    describe("schedule", () => {
        it("should schedule task with future time", () => {
            // Arrange
            const callback = jest.fn();
            const futureTime = new Date(Date.now() + 1000);

            // Act
            scheduler.schedule(futureTime, callback);

            // Assert
            expect(setTimeoutMock).toHaveBeenCalledTimes(1);
            expect(setTimeoutMock.mock.calls[0][1]).toBe(1000);
        });

        it("should schedule task with past time using 0 delay", () => {
            // Arrange
            const callback = jest.fn();
            const pastTime = new Date(Date.now() - 1000);

            // Act
            scheduler.schedule(pastTime, callback);

            // Assert
            expect(setTimeoutMock).toHaveBeenCalledTimes(1);
            expect(setTimeoutMock.mock.calls[0][1]).toBe(0);
        });

        it("should schedule task with current time using 0 delay", () => {
            // Arrange
            const callback = jest.fn();
            const currentTime = new Date();

            // Act
            scheduler.schedule(currentTime, callback);

            // Assert
            expect(setTimeoutMock).toHaveBeenCalledTimes(1);
            expect(setTimeoutMock.mock.calls[0][1]).toBe(0);
        });

        it("should generate unique id when options key is provided", () => {
            // Arrange
            const callback = jest.fn();
            const futureTime = new Date(Date.now() + 1000);
            const options = { key: "testKey" };

            // Act
            scheduler.schedule(futureTime, callback, options);

            // Assert
            expect(setTimeoutMock).toHaveBeenCalledTimes(1);
        });

        it("should generate unique id using callback name when no options key", () => {
            // Arrange
            const callback = jest.fn();
            Object.defineProperty(callback, 'name', { value: 'testCallback', writable: true });
            const futureTime = new Date(Date.now() + 1000);

            // Act
            scheduler.schedule(futureTime, callback);

            // Assert
            expect(setTimeoutMock).toHaveBeenCalledTimes(1);
        });

        it("should not schedule duplicate task with same id", () => {
            // Arrange
            const callback = jest.fn();
            const futureTime = new Date(Date.now() + 1000);
            const options = { key: "testKey" };

            // Act
            scheduler.schedule(futureTime, callback, options);
            scheduler.schedule(futureTime, callback, options);

            // Assert
            expect(setTimeoutMock).toHaveBeenCalledTimes(1);
        });

        it("should schedule different tasks with different keys", () => {
            // Arrange
            const callback1 = jest.fn();
            const callback2 = jest.fn();
            const futureTime = new Date(Date.now() + 1000);
            const options1 = { key: "key1" };
            const options2 = { key: "key2" };

            // Act
            scheduler.schedule(futureTime, callback1, options1);
            scheduler.schedule(futureTime, callback2, options2);

            // Assert
            expect(setTimeoutMock).toHaveBeenCalledTimes(2);
        });

        it("should schedule different tasks with different times", () => {
            // Arrange
            const callback = jest.fn();
            const futureTime1 = new Date(Date.now() + 1000);
            const futureTime2 = new Date(Date.now() + 2000);
            const options = { key: "testKey" };

            // Act
            scheduler.schedule(futureTime1, callback, options);
            scheduler.schedule(futureTime2, callback, options);

            // Assert
            expect(setTimeoutMock).toHaveBeenCalledTimes(2);
        });

        it("should execute callback with correct arguments", () => {
            // Arrange
            const callback = jest.fn();
            const futureTime = new Date(Date.now() + 1000);

            // Act
            scheduler.schedule(futureTime, callback);
            const scheduledCallback = setTimeoutMock.mock.calls[0][0];
            scheduledCallback("arg1", "arg2");

            // Assert
            expect(callback).toHaveBeenCalledWith("arg1", "arg2");
        });

        it("should return callback result", () => {
            // Arrange
            const callback = jest.fn().mockReturnValue("test result");
            const futureTime = new Date(Date.now() + 1000);

            // Act
            scheduler.schedule(futureTime, callback);
            const scheduledCallback = setTimeoutMock.mock.calls[0][0];
            const result = scheduledCallback();

            // Assert
            expect(result).toBe("test result");
        });

        it("should handle callback that throws error", () => {
            // Arrange
            const error = new Error("Test error");
            const callback = jest.fn().mockImplementation(() => { throw error; });
            const futureTime = new Date(Date.now() + 1000);

            // Act
            scheduler.schedule(futureTime, callback);
            const scheduledCallback = setTimeoutMock.mock.calls[0][0];

            // Assert
            expect(() => scheduledCallback()).toThrow("Test error");
        });

        it("should remove task from internal storage after execution", () => {
            // Arrange
            const callback = jest.fn();
            const futureTime = new Date(Date.now() + 1000);
            const options = { key: "testKey" };

            // Act
            scheduler.schedule(futureTime, callback, options);
            const scheduledCallback = setTimeoutMock.mock.calls[0][0];
            scheduledCallback();

            // Assert
            const tasks = (scheduler as any).tasks;
            const taskId = `testKey-${futureTime.getTime().toString()}`;
            expect(tasks[taskId]).toBeUndefined();
        });

        it("should remove task from internal storage even when callback throws", () => {
            // Arrange
            const error = new Error("Test error");
            const callback = jest.fn().mockImplementation(() => { throw error; });
            const futureTime = new Date(Date.now() + 1000);
            const options = { key: "testKey" };

            // Act
            scheduler.schedule(futureTime, callback, options);
            const scheduledCallback = setTimeoutMock.mock.calls[0][0];

            // Assert
            expect(() => scheduledCallback()).toThrow("Test error");
            const tasks = (scheduler as any).tasks;
            const taskId = `testKey-${futureTime.getTime().toString()}`;
            expect(tasks[taskId]).toBeUndefined();
        });

        it("should handle callback with no name", () => {
            // Arrange
            const callback = jest.fn();
            Object.defineProperty(callback, 'name', { value: '', writable: true });
            const futureTime = new Date(Date.now() + 1000);

            // Act
            scheduler.schedule(futureTime, callback);

            // Assert
            expect(setTimeoutMock).toHaveBeenCalledTimes(1);
        });

        it("should handle callback with undefined name", () => {
            // Arrange
            const callback = jest.fn();
            delete (callback as any).name;
            const futureTime = new Date(Date.now() + 1000);

            // Act
            scheduler.schedule(futureTime, callback);

            // Assert
            expect(setTimeoutMock).toHaveBeenCalledTimes(1);
        });

        it("should handle very large time difference", () => {
            // Arrange
            const callback = jest.fn();
            const farFuture = new Date(Date.now() + 86400000); // 24 hours

            // Act
            scheduler.schedule(farFuture, callback);

            // Assert
            expect(setTimeoutMock).toHaveBeenCalledTimes(1);
            expect(setTimeoutMock.mock.calls[0][1]).toBe(86400000);
        });

        it("should handle very small time difference", () => {
            // Arrange
            const callback = jest.fn();
            const nearFuture = new Date(Date.now() + 1);

            // Act
            scheduler.schedule(nearFuture, callback);

            // Assert
            expect(setTimeoutMock).toHaveBeenCalledTimes(1);
            expect(setTimeoutMock.mock.calls[0][1]).toBe(1);
        });

        it("should handle zero time difference", () => {
            // Arrange
            const callback = jest.fn();
            const currentTime = new Date();

            // Act
            scheduler.schedule(currentTime, callback);

            // Assert
            expect(setTimeoutMock).toHaveBeenCalledTimes(1);
            expect(setTimeoutMock.mock.calls[0][1]).toBe(0);
        });

        it("should handle negative time difference", () => {
            // Arrange
            const callback = jest.fn();
            const pastTime = new Date(Date.now() - 100);

            // Act
            scheduler.schedule(pastTime, callback);

            // Assert
            expect(setTimeoutMock).toHaveBeenCalledTimes(1);
            expect(setTimeoutMock.mock.calls[0][1]).toBe(0);
        });
    });
});
