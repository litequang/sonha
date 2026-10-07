import { useState, useEffect } from 'react';

export type SyncState = 'online' | 'offline' | 'syncing' | 'synced';

export interface SyncStatusInfo {
  state: SyncState;
  label: string;
  isOnline: boolean;
  hasPendingWrites: boolean;
  fromCache: boolean;
}

// Global listener registry so any Firestore snapshot can update pending write status
let pendingWritesCount = 0;
const listeners = new Set<(status: SyncStatusInfo) => void>();

function notifyAll(isOnline: boolean, hasPending: boolean, fromCache: boolean = false) {
  let state: SyncState = 'synced';
  if (!isOnline) {
    state = 'offline';
  } else if (hasPending) {
    state = 'syncing';
  } else {
    state = 'synced';
  }

  const label =
    state === 'offline'
      ? 'Ngoại tuyến (Offline)'
      : state === 'syncing'
      ? 'Đang đồng bộ...'
      : 'Đã đồng bộ';

  const info: SyncStatusInfo = {
    state,
    label,
    isOnline,
    hasPendingWrites: hasPending,
    fromCache,
  };

  listeners.forEach(fn => fn(info));
}

export function updateSnapshotMetadata(metadata: { hasPendingWrites?: boolean; fromCache?: boolean }) {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const hasPending = !!metadata.hasPendingWrites;
  const fromCache = !!metadata.fromCache;
  pendingWritesCount = hasPending ? 1 : 0;
  notifyAll(isOnline, hasPending, fromCache);
}

export function useSyncStatus(): SyncStatusInfo {
  const [status, setStatus] = useState<SyncStatusInfo>(() => {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    return {
      state: isOnline ? 'synced' : 'offline',
      label: isOnline ? 'Đã đồng bộ' : 'Ngoại tuyến (Offline)',
      isOnline,
      hasPendingWrites: false,
      fromCache: !isOnline,
    };
  });

  useEffect(() => {
    const handleOnline = () => {
      notifyAll(true, pendingWritesCount > 0);
    };
    const handleOffline = () => {
      notifyAll(false, pendingWritesCount > 0);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    listeners.add(setStatus);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      listeners.delete(setStatus);
    };
  }, []);

  return status;
}
