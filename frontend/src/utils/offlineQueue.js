const QUEUE_KEY = 'ledger_offline_queue';

// Queue item shape:
// { localId, values, status: 'pending' | 'needs-attention', lockInfo? }
//   - 'pending'         → not yet synced, will retry automatically when back online
//   - 'needs-attention' → sync attempted, got blocked by the spending lock,
//                         waiting for the user to resolve it manually

function readQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function getQueue() {
  return readQueue();
}

export function addToQueue(values) {
  const queue = readQueue();
  const item = { localId: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`, values, status: 'pending' };
  queue.push(item);
  writeQueue(queue);
  return item;
}

export function updateQueueItem(localId, patch) {
  const queue = readQueue().map((item) => (item.localId === localId ? { ...item, ...patch } : item));
  writeQueue(queue);
}

export function removeFromQueue(localId) {
  writeQueue(readQueue().filter((item) => item.localId !== localId));
}
