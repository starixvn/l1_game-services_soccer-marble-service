export class SchedulerConsumer {
    private readonly tasks: Record<string, Function> = {};

    public schedule(
        time: Date,
        callback: Function,
        options?: {
            key?: string;
        }
    ): void {
        const now = new Date();
        const diff = time.getTime() - now.getTime();
        const id = options?.key ? `${options.key}-${time.getTime().toString()}` : `${callback.name}-${time.getTime().toString()}`;
        if (this.tasks[id]) {
            return; // avoid duplicate tasks
        }
        this.tasks[id] = callback;
        console.log('scheduled execition ', id);
        if (diff > 0) {
            setTimeout(this.callbackWithLog(callback, id), diff);
        } else {
            setTimeout(this.callbackWithLog(callback, id), 0);
        }
    }

    private callbackWithLog(callback: Function, id: string) {
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