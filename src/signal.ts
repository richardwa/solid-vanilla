export const observers: Array<(s: Signal<unknown>) => void> = [];

export class Signal<T> {
  val: T;
  old?: T;
  subscribers: Set<() => void>;

  constructor(initial: T) {
    this.val = initial;
    this.subscribers = new Set();
  }

  set(newVal: T, forceTrigger = false) {
    if (newVal === this.val) {
      if (forceTrigger) this.trigger();
      return;
    }
    this.old = this.val;
    this.val = newVal;
    this.trigger();
  }

  trigger() {
    this.subscribers.forEach((fn) => fn());
  }

  get() {
    if (observers.length > 0) {
      const last = observers[observers.length - 1];
      last(this);
    }
    return this.val;
  }

  prev() {
    return this.old;
  }

  on(fn: () => void, now = false) {
    this.subscribers.add(fn);
    if (now) fn();
    // allow caller a handle on unregister
    return () => this.subscribers.delete(fn);
  }
}

type SignalFunc = {
  <T>(): Signal<T | undefined>;
  <T>(param: T): Signal<T>;
};
export const signal: SignalFunc = <T>(v?: T) => {
  return new Signal(v);
};

export type OptionalSignal<T> = T | Signal<T> | (() => T);
export const getValue = <T>(
  optionalSignal?: OptionalSignal<T>,
): T | undefined => {
  if (optionalSignal == null) return optionalSignal;
  if (optionalSignal instanceof Signal) {
    return optionalSignal.get();
  }
  if (typeof optionalSignal === "function") {
    // @ts-ignore
    return optionalSignal();
  }

  return optionalSignal;
};
