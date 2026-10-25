// A finite camera transition, independent of the paused walking/environment loop.
export function createFocusTransition(
  request: (callback: FrameRequestCallback) => number = requestAnimationFrame,
  cancel: (id: number) => void = cancelAnimationFrame,
  now: () => number = () => performance.now(),
) {
  let pending: { frame: number; resolve: (completed: boolean) => void } | null = null;
  const stop = () => {
    if (!pending) return;
    cancel(pending.frame);
    pending.resolve(false);
    pending = null;
  };
  return {
    cancel: stop,
    move(update: (progress: number) => void, reduced: boolean): Promise<boolean> {
      stop();
      if (reduced) { update(1); return Promise.resolve(true); }
      return new Promise(resolve => {
        const start = now();
        const transition = { frame: 0, resolve };
        pending = transition;
        const tick = (time: number) => {
          if (pending !== transition) return;
          const t = Math.min(1, Math.max(0, (time - start) / 700));
          update(t * t * (3 - 2 * t));
          if (t === 1) { pending = null; resolve(true); }
          else transition.frame = request(tick);
        };
        transition.frame = request(tick);
      });
    },
  };
}
