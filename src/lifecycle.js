function createLifecycle(options = {}) {
  const listeners = new Map();
  const logger = options.logger;

  function on(eventName, handler) {
    if (!listeners.has(eventName)) {
      listeners.set(eventName, new Set());
    }
    listeners.get(eventName).add(handler);

    return () => off(eventName, handler);
  }

  function once(eventName, handler) {
    const offHandler = on(eventName, async (payload) => {
      offHandler();
      return handler(payload);
    });
  }

  function off(eventName, handler) {
    const set = listeners.get(eventName);
    if (!set) {
      return;
    }
    set.delete(handler);
    if (!set.size) {
      listeners.delete(eventName);
    }
  }

  async function emit(eventName, payload) {
    const handlers = listeners.get(eventName);
    if (!handlers || !handlers.size) {
      return [];
    }

    const results = await Promise.allSettled(
      Array.from(handlers).map((handler) => handler(payload))
    );

    if (logger) {
      results.forEach((result) => {
        if (result.status === 'rejected') {
          logger.error(`Lifecycle handler failed for ${eventName}`, result.reason);
        }
      });
    }

    return results;
  }

  return {
    on,
    once,
    off,
    emit
  };
}

module.exports = { createLifecycle };
