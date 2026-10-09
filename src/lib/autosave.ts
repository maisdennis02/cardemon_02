// Debounced saving for the menu builder: one write per pause in editing, a
// retry when the network drops, and a way to stand down before publishing.
// Framework-free so its timing can be tested with fake timers.

export type AutosaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

export function createAutosaver<T>(opts: {
  save: (value: T) => Promise<void>;
  delayMs?: number;
  retryMs?: number;
  onStatus: (status: AutosaveStatus) => void;
}) {
  const { save, delayMs = 2000, retryMs = 5000, onStatus } = opts;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let latest: { value: T } | null = null;
  let inFlight: Promise<void> | null = null;
  let stopped = false;

  function schedule(ms: number) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(run, ms);
  }

  async function run() {
    timer = null;
    if (stopped || !latest) return;
    if (inFlight) {
      // Never two writes at once: try again once this one lands.
      schedule(delayMs);
      return;
    }
    const { value } = latest;
    latest = null;
    onStatus("saving");
    inFlight = save(value);
    try {
      await inFlight;
      if (!stopped && !latest) onStatus("saved");
    } catch {
      if (stopped) return;
      latest ??= { value };
      onStatus("error");
      schedule(retryMs);
    } finally {
      inFlight = null;
    }
  }

  return {
    push(value: T) {
      if (stopped) return;
      latest = { value };
      onStatus("pending");
      schedule(delayMs);
    },
    // Before publishing: drop whatever has not started and wait for the write
    // in flight, so no older draft can land after the publish.
    async settle(): Promise<void> {
      if (timer) clearTimeout(timer);
      timer = null;
      latest = null;
      await inFlight?.catch(() => {});
      if (timer) clearTimeout(timer);
      timer = null;
      latest = null;
    },
    dispose() {
      stopped = true;
      if (timer) clearTimeout(timer);
      timer = null;
    },
  };
}
