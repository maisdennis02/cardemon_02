import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }));

import { revalidateMenu } from "@/lib/menu-cache";

// A page path revalidates only that page (Next 16 revalidatePath docs), so
// the printable sheet must be named too, or it prints old prices after a
// publish (review of 2026-10-26).
describe("revalidateMenu", () => {
  beforeEach(() => revalidatePath.mockClear());

  it("refreshes the menu and its printable sheet", () => {
    revalidateMenu("lanchonete-do-ze");
    expect(revalidatePath).toHaveBeenCalledWith("/m/lanchonete-do-ze");
    expect(revalidatePath).toHaveBeenCalledWith("/m/lanchonete-do-ze/print");
  });
});
