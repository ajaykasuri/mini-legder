const listeners = new Set();

const state = {
  isOnline: navigator.onLine,
  isSlow: false,
};

function notify() {
  listeners.forEach((fn) => fn({ ...state }));
}

window.addEventListener('online', () => {
  state.isOnline = true;
  notify();
});

window.addEventListener('offline', () => {
  state.isOnline = false;
  notify();
});

// Called by the axios interceptor after every response. A single slow
// request doesn't mean much on its own, so this just flags "slow" for a
// short window rather than trying to build a rolling average.
let slowTimer = null;
const SLOW_THRESHOLD_MS = 4000;
const SLOW_FLAG_DURATION_MS = 6000;

function reportRequestDuration(ms) {
  if (ms < SLOW_THRESHOLD_MS) return;
  state.isSlow = true;
  notify();
  clearTimeout(slowTimer);
  slowTimer = setTimeout(() => {
    state.isSlow = false;
    notify();
  }, SLOW_FLAG_DURATION_MS);
}

function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function getState() {
  return { ...state };
}

export { subscribe, getState, reportRequestDuration };
