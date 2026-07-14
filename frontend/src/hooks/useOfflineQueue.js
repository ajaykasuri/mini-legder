import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useNetworkStatus } from './useNetworkStatus';
import { getQueue, addToQueue, updateQueueItem, removeFromQueue } from '../utils/offlineQueue';

export function useOfflineQueue({ onSynced }) {
  const { isOnline } = useNetworkStatus();
  const [queue, setQueue] = useState(getQueue());
  const syncingRef = useRef(false);

  const refresh = useCallback(() => setQueue(getQueue()), []);

  const queueTransaction = useCallback(
    (values) => {
      addToQueue(values);
      refresh();
      toast('⏳ Offline — saved locally, will sync when back online', { icon: '📶' });
    },
    [refresh]
  );

  // Syncs every 'pending' item in order. A blocked item (423) is marked
  // 'needs-attention' and left in the queue — per the design, one blocked
  // item should NOT stop the rest of the queue from syncing.
  const syncQueue = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;

    const pendingItems = getQueue().filter((item) => item.status === 'pending');
    if (pendingItems.length === 0) {
      syncingRef.current = false;
      return;
    }

    let syncedCount = 0;
    let attentionCount = 0;

    for (const item of pendingItems) {
      try {
        await api.post('/transactions', item.values);
        removeFromQueue(item.localId);
        syncedCount += 1;
      } catch (err) {
        if (err.response?.status === 423) {
          updateQueueItem(item.localId, { status: 'needs-attention', lockInfo: err.response.data });
          attentionCount += 1;
        } else {
          // Any other failure (server error, still offline, etc.) — leave it
          // 'pending' and stop; we'll retry the whole batch next time we're online.
          break;
        }
      }
    }

    refresh();
    if (syncedCount > 0) {
      toast.success(`✅ Synced ${syncedCount} offline transaction${syncedCount > 1 ? 's' : ''}`);
      onSynced?.();
    }
    if (attentionCount > 0) {
      toast(`⚠️ ${attentionCount} offline transaction${attentionCount > 1 ? 's' : ''} need your attention`, {
        icon: '🔒',
      });
    }
    syncingRef.current = false;
  }, [refresh, onSynced]);

  // Auto-sync the moment we come back online.
  useEffect(() => {
    if (isOnline) {
      syncQueue();
    }
  }, [isOnline, syncQueue]);

  const resolveQueueItem = useCallback(
    async (localId) => {
      const item = getQueue().find((q) => q.localId === localId);
      if (!item) return;
      await api.post('/transactions', item.values);
      removeFromQueue(item.localId);
      refresh();
      toast.success('✅ Resolved and synced');
      onSynced?.();
    },
    [refresh, onSynced]
  );

  const discardQueueItem = useCallback(
    (localId) => {
      removeFromQueue(localId);
      refresh();
    },
    [refresh]
  );

  return { queue, queueTransaction, resolveQueueItem, discardQueueItem, isOnline };
}
