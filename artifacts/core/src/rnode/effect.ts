import { observers } from "../signal";

// Runs fn while tracking the signals it reads: every signal read inside fn
// subscribes fn, and each subscription's unsubscribe handle is passed to
// onCleanup (RNode uses it to dispose effects on unmount / re-render).
export function runEffect<T>(
  fn: () => T,
  onCleanup: (clear: () => void) => void,
): T {
  observers.push((signal) => {
    const clear = signal.on(fn);
    onCleanup(clear);
  });
  const val = fn();
  observers.pop();
  return val;
}
