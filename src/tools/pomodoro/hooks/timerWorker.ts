// timerWorker.ts - Web Worker for Pomodoro Timer
let timerInterval: ReturnType<typeof setInterval> | null = null;
let startTime: number;
let timeLeft: number;

self.onmessage = (event: MessageEvent) => {
  const { type, payload } = event.data;

  if (type === "START") {
    startTime = Date.now();
    timeLeft = payload.timeLeft;

    timerInterval = setInterval(() => {
      const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
      const newTimeLeft = Math.max(0, timeLeft - elapsedTime);

      self.postMessage({ type: "TICK", timeLeft: newTimeLeft });

      if (newTimeLeft === 0) {
        clearInterval(timerInterval!);
        self.postMessage({ type: "COMPLETE" });
      }
    }, 1000);
  }

  if (type === "STOP") {
    clearInterval(timerInterval!);
    timerInterval = null;
  }
};
