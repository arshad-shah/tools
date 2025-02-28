// timerWorker.ts - Web Worker for Pomodoro Timer
let timerInterval: ReturnType<typeof setInterval> | null = null;
let startTime: number;
let timeLeft: number;
let isRunning = false; // Track if the timer is active

const log = (message: string, data?: Record<string, unknown>) => {
    console.log(`[TimerWorker] ${message}`, data ? data : '');
};

self.onmessage = (event: MessageEvent) => {
    const { type, payload } = event.data;
    log(`Received message of type: ${type}`, payload);

    if (type === "STOP") {
        if (timerInterval) {
            log('Stopping timer...', {
                currentTime: new Date().toISOString(),
                timerActive: timerInterval !== null
            });
            
            clearInterval(timerInterval);
            timerInterval = null;
            isRunning = false; // Mark timer as stopped

            log('Timer stopped successfully');
        }
    }

    if (type === "START") {
        if (isRunning) {
            log("Timer is already running, ignoring duplicate START request.");
            return; // Prevent multiple intervals
        }

        log('Initializing timer...', {
            currentTime: new Date().toISOString(),
            initialTimeLeft: payload.timeLeft
        });

        startTime = Date.now();
        timeLeft = payload.timeLeft;
        isRunning = true; // Mark timer as active

        log('Timer initialized', { startTime, timeLeft });

        timerInterval = setInterval(() => {
            const currentTime = Date.now();
            const elapsedTime = Math.floor((currentTime - startTime) / 1000);
            const newTimeLeft = Math.max(0, timeLeft - elapsedTime);

            log('Timer tick', {
                currentTime: new Date(currentTime).toISOString(),
                elapsedTime,
                newTimeLeft
            });

            self.postMessage({ type: "TICK", timeLeft: newTimeLeft });

            if (newTimeLeft === 0) {
                log('Timer completed');
                clearInterval(timerInterval!);
                timerInterval = null;
                isRunning = false;
                self.postMessage({ type: "COMPLETE" });
            }
        }, 1000);
    }
};
