import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import '../../styles/network-banner.css';

export default function NetworkBanner() {
  const { isOnline, isSlow } = useNetworkStatus();

  if (isOnline && !isSlow) return null;

  return (
    <div className={`network-banner ${isOnline ? 'slow' : 'offline'}`}>
      {isOnline ? '🐢 Slow connection detected — requests may take longer than usual.' : '📡 No internet connection — working offline. Changes will sync automatically once you\'re back.'}
    </div>
  );
}
