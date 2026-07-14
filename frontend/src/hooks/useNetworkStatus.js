import { useState, useEffect } from 'react';
import { subscribe, getState } from '../services/networkStatus';

export function useNetworkStatus() {
  const [status, setStatus] = useState(getState());

  useEffect(() => {
    return subscribe(setStatus);
  }, []);

  return status; // { isOnline, isSlow }
}
