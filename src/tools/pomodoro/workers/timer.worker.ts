// Web Worker for the Pomodoro timer: counts down off the main thread so
// background-tab throttling does not stall it.
// Protocol: in START { timeLeft } / STOP; out TICK { timeLeft } / COMPLETE.
let timerInterval: ReturnType<typeof setInterval> | null = null;
let startTime: number;
let timeLeft: number;
let isRunning = false; // Track if the timer is active

self.onmessage = (event: MessageEvent) => {
  const { type, payload } = event.data;

  if (type === 'STOP') {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
      isRunning = false; // Mark timer as stopped
    }
  }

  if (type === 'START') {
    if (isRunning) return; // Prevent multiple intervals

    startTime = Date.now();
    timeLeft = payload.timeLeft;
    isRunning = true; // Mark timer as active

    timerInterval = setInterval(() => {
      const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
      const newTimeLeft = Math.max(0, timeLeft - elapsedTime);

      self.postMessage({ type: 'TICK', timeLeft: newTimeLeft });

      if (newTimeLeft === 0) {
        clearInterval(timerInterval!);
        timerInterval = null;
        isRunning = false;
        self.postMessage({ type: 'COMPLETE' });
      }
    }, 1000);
  }
};
