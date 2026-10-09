import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAutosaver, type AutosaveStatus } from "@/lib/autosave";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function setup(save: (v: string) => Promise<void>) {
  const statuses: AutosaveStatus[] = [];
  const saver = createAutosaver<string>({ save, onStatus: (s) => statuses.push(s) });
  return { saver, statuses };
}

describe("createAutosaver", () => {
  it("saves once per pause, with the last value", async () => {
    const save = vi.fn(async () => {});
    const { saver, statuses } = setup(save);
    saver.push("a");
    await vi.advanceTimersByTimeAsync(500);
    saver.push("b");
    await vi.advanceTimersByTimeAsync(500);
    saver.push("c");
    await vi.advanceTimersByTimeAsync(2000);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith("c");
    expect(statuses.at(-1)).toBe("saved");
    expect(statuses).toContain("pending");
    expect(statuses).toContain("saving");
  });

  it("retries a failed save with the latest value", async () => {
    const save = vi.fn<(v: string) => Promise<void>>().mockRejectedValueOnce(new Error("offline")).mockResolvedValue();
    const { saver, statuses } = setup(save);
    saver.push("a");
    await vi.advanceTimersByTimeAsync(2000);
    expect(statuses.at(-1)).toBe("error");
    saver.push("b");
    await vi.advanceTimersByTimeAsync(5000);
    expect(save).toHaveBeenLastCalledWith("b");
    expect(statuses.at(-1)).toBe("saved");
  });

  it("retries on its own after a failure with no new edit", async () => {
    const save = vi.fn<(v: string) => Promise<void>>().mockRejectedValueOnce(new Error("offline")).mockResolvedValue();
    const { saver, statuses } = setup(save);
    saver.push("a");
    await vi.advanceTimersByTimeAsync(2000);
    await vi.advanceTimersByTimeAsync(5000);
    expect(save).toHaveBeenCalledTimes(2);
    expect(statuses.at(-1)).toBe("saved");
  });

  it("settle waits for the save in flight and drops what is pending", async () => {
    let finish!: () => void;
    const save = vi.fn((v: string) => (v === "a" ? new Promise<void>((r) => (finish = r)) : Promise.resolve()));
    const { saver } = setup(save);
    saver.push("a");
    await vi.advanceTimersByTimeAsync(2000);
    saver.push("b");
    let settled = false;
    const done = saver.settle().then(() => (settled = true));
    await vi.advanceTimersByTimeAsync(0);
    expect(settled).toBe(false);
    finish();
    await done;
    await vi.advanceTimersByTimeAsync(10_000);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).not.toHaveBeenCalledWith("b");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("settle does not throw when the save in flight fails", async () => {
    const save = vi.fn(() => Promise.reject(new Error("offline")));
    const { saver } = setup(save);
    saver.push("a");
    await vi.advanceTimersByTimeAsync(2000);
    await expect(saver.settle()).resolves.toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("dispose cancels a pending save", async () => {
    const save = vi.fn(async () => {});
    const { saver } = setup(save);
    saver.push("a");
    saver.dispose();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(save).not.toHaveBeenCalled();
  });
});
