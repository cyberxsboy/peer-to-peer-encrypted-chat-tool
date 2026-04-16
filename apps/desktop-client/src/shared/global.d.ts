export {};

declare global {
  interface Window {
    electron: {
      invoke: (channel: string, ...args: any[]) => Promise<any>;
      on: (channel: string, callback: Function) => () => void;
      off: (channel: string, callback: Function) => void;
    };
    platform: {
      os: string;
      arch: string;
      version: string;
    };
  }
}