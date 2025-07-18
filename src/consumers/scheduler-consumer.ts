export class SchedulerConsumer {
    private readonly tasks: Record<string, Function> = {};

    public schedule(
        time: Date,
        callback: Function ,
    ): void {
        const now = new Date();
        const diff = time.getTime() - now.getTime();
        const id = time.getTime();
        this.tasks[id] = callback;
        if (diff > 0) {
            setTimeout(this.callbackWithLog(callback, id), diff);
        } else {
            setTimeout(this.callbackWithLog(callback, id), 0);
        }
    }

    private callbackWithLog(callback: Function, id: number) {
        return (...args: any[]) => {
            try {
                const result = callback(...args);
                return result;
            } finally {
                delete this.tasks[id];
            }
        };
    }
}