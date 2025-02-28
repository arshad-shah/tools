import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { updateTimer } from "../store";
import { TimerState } from "../../../types/PomodoroTypes";


interface UsePomodoroTimerProps {
  timer: TimerState;
  handleTimerComplete: () => void;
  formatTime: (seconds: number) => string;
}

const usePomodoroTimer = ({ timer, handleTimerComplete, formatTime }: UsePomodoroTimerProps): void => {
  const dispatch = useDispatch();
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    if (typeof Worker !== "undefined") {
      workerRef.current = new Worker(new URL("./timerWorker.ts", import.meta.url), { type: "module" });

      workerRef.current.onmessage = (event: MessageEvent) => {
        const { type, timeLeft } = event.data;

        if (type === "TICK") {
          dispatch(updateTimer({ timeLeft }));
          document.title = `Pomodoro - ${timer.mode === "work" ? "Work" : "Break"} - ${formatTime(timeLeft)}`;
        }

        if (type === "COMPLETE") {
          handleTimerComplete();
        }
      };
    }

    return () => {
      workerRef.current?.terminate();
    };
  }, [dispatch, handleTimerComplete, formatTime, timer.mode]);

  useEffect(() => {
    if (workerRef.current) {
      if (timer.isActive) {
        workerRef.current.postMessage({ type: "START", payload: { timeLeft: timer.timeLeft } });
      } else {
        workerRef.current.postMessage({ type: "STOP" });
      }
    }
  }, [timer.isActive]);

  return;
};

export default usePomodoroTimer;