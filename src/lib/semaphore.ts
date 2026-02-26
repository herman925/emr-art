/** Counting semaphore — limits concurrent async operations. */
export function createSemaphore(max: number) {
  let running = 0;
  const queue: Array<() => void> = [];

  const acquire = (): Promise<void> =>
    new Promise((resolve) => {
      if (running < max) { running++; resolve(); }
      else queue.push(() => { running++; resolve(); });
    });

  const release = () => {
    running = Math.max(0, running - 1);
    queue.shift()?.();
  };

  return { acquire, release };
}
