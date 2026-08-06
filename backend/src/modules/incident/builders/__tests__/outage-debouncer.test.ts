import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { OutageDebouncer } from "../outage-debouncer.js";

describe("OutageDebouncer (30s observation window)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("runs the callback after the observation window elapses", () => {
    const debouncer = new OutageDebouncer();

    const run = vi.fn();

    debouncer.schedule("DT-1", run, 30_000);

    expect(run).not.toHaveBeenCalled();

    vi.advanceTimersByTime(29_000);

    expect(run).not.toHaveBeenCalled();

    vi.advanceTimersByTime(2_000);

    expect(run).toHaveBeenCalledTimes(1);
  });

  it("cancels the pending run when power returns", () => {
    const debouncer = new OutageDebouncer();

    const run = vi.fn();

    debouncer.schedule("DT-1", run, 30_000);

    debouncer.cancel("DT-1");

    vi.advanceTimersByTime(60_000);

    expect(run).not.toHaveBeenCalled();
  });

  it("keeps the FIRST deadline when more dark packets arrive (window does not slide forever)", () => {
    const debouncer = new OutageDebouncer();

    const run = vi.fn();

    debouncer.schedule("DT-1", run, 30_000);

    vi.advanceTimersByTime(10_000);

    // A storm of additional dark events must NOT extend the pending window.
    for (let i = 0; i < 5; i++) {
      debouncer.schedule("DT-1", run, 30_000);
    }

    vi.advanceTimersByTime(20_000); // 30s after the first event

    expect(run).toHaveBeenCalledTimes(1);

    // And without new events nothing fires again.
    vi.advanceTimersByTime(60_000);

    expect(run).toHaveBeenCalledTimes(1);
  });
});
