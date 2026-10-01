declare module 'pdfjs-dist/build/pdf.worker.mjs' {
  export const WorkerMessageHandler: {
    /** Serves pdf.js's main-thread API over `port` (a MessagePort here). */
    initializeFromPort(port: MessagePort): void;
  };
}
