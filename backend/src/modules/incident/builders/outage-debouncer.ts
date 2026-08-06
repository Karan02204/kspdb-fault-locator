/**
 * Implements the documented Candidate Observation Window
 * (see DECISIONS.md "Fault Detection Debounce Strategy").
 *
 * When a power_lost signal arrives for a transformer, localization is NOT
 * run immediately. The transformer enters a short observation window during
 * which additional telemetry (duplicates, out-of-order retries, restoration)
 * is allowed to arrive. Only after the window elapses is the outage
 * re-evaluated and (if still dark) escalated into incidents/tickets.
 *
 * A power_restored signal cancels the pending window and triggers immediate
 * processing so restoration is reflected at once.
 *
 * In-memory by design: the demo runs a single backend instance. If the
 * backend scales horizontally, this must move to a shared store
 * (documented in DECISIONS.md).
 */
export class OutageDebouncer {
  private static readonly DEFAULT_WINDOW_MS = 30 * 1000;

  private timers = new Map<string, NodeJS.Timeout>();

  /** Deadline of the pending observation window per key. */
  private deadlines = new Map<string, number>();

  schedule(
    key: string,
    run: () => Promise<unknown>,
    delayMs: number = OutageDebouncer.DEFAULT_WINDOW_MS,
  ): void {
    // Keep the FIRST deadline: a storm of dark packets must not keep
    // sliding the window open forever.
    const existing = this.deadlines.get(key);

    if (existing && existing > Date.now()) {
      return;
    }

    this.cancel(key);

    const deadline = Date.now() + delayMs;

    this.deadlines.set(key, deadline);

    const timer = setTimeout(() => {
      this.timers.delete(key);

      this.deadlines.delete(key);

      Promise.resolve(run()).catch((error) => {
        console.error(`Outage debounce run failed for ${key}:`, error);
      });
    }, delayMs);

    this.timers.set(key, timer);
  }

  cancel(key: string): void {
    const timer = this.timers.get(key);

    if (timer) {
      clearTimeout(timer);

      this.timers.delete(key);
    }

    this.deadlines.delete(key);
  }

  cancelByPrefix(prefix: string): void {
    for (const key of this.timers.keys()) {
      if (key.startsWith(prefix)) {
        this.cancel(key);
      }
    }
  }

  isPending(key: string): boolean {
    const deadline = this.deadlines.get(key);

    return deadline !== undefined && deadline > Date.now();
  }
}

/** Process-wide singleton so telemetry, simulator and heartbeat monitor share one window. */
export const outageDebouncer = new OutageDebouncer();
