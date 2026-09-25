/**
 * Lightweight cross-tab event synchronization utility using standard BroadcastChannel.
 * Provides immediate same-browser refresh for Government Dashboard when Field Crew
 * resolves a complaint or performs a workflow state change.
 */

const CHANNEL_NAME = 'civicpulse_resolution_sync';

export function broadcastResolution(data = {}) {
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel(CHANNEL_NAME);
      channel.postMessage({
        type: 'COMPLAINT_RESOLVED',
        timestamp: Date.now(),
        ...data,
      });
      channel.close();
    }
  } catch (err) {
    // Non-blocking fallback if BroadcastChannel fails or is disabled in environment
    console.debug('BroadcastChannel broadcast failed (safe fallback to polling):', err);
  }
}

export function subscribeToResolutions(callback) {
  if (typeof window === 'undefined' || !('BroadcastChannel' in window)) {
    return () => {};
  }

  try {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (event) => {
      if (event?.data?.type === 'COMPLAINT_RESOLVED') {
        callback(event.data);
      }
    };

    return () => {
      try {
        channel.close();
      } catch (err) {
        // Safe cleanup
      }
    };
  } catch (err) {
    console.debug('BroadcastChannel subscribe failed (safe fallback to polling):', err);
    return () => {};
  }
}
