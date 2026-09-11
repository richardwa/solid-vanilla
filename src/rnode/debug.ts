// Debug logger enabled when the bundler injects a DEV flag (e.g. Vite).
export const debug = (name: string, ...msg: any[]) => {
  // @ts-ignore
  if (import.meta.env.DEV) {
    console.debug(name, ...msg);
  }
};
