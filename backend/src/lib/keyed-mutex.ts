/**
 * Minimal per-key async mutex.
 *
 * Guarantees that two telemetry packets affecting the same transformer never
 * run localization concurrently — the incident-grouper's read-then-create
 * sequence is race-free within a single backend instance. (Multi-instance
 * deployments need a distributed lock or a DB unique constraint instead;
 * see DECISIONS.md.)
 */
export class KeyedMutex {
  private tails = new Map<string, Promise<unknown>>();

  async run<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const previous = this.tails.get(key) ?? Promise.resolve();

    const next = previous.then(fn, fn);

    // Keep the chain alive regardless of outcome.
    this.tails.set(
      key,
      next.catch((error) => {
        console.error(`KeyedMutex[${key}] task failed:`, error);
      }),
    );

    return next;
  }
}

export const transformerMutex = new KeyedMutex();
