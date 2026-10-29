import { revalidatePath } from "next/cache";

// Every cached page that shows a restaurant's menu. A page path revalidates
// only that page, not the routes under it, so the printable sheet is listed
// on its own; without it a reprint after a publish showed the old prices.
export function revalidateMenu(slug: string): void {
  revalidatePath(`/m/${slug}`);
  revalidatePath(`/m/${slug}/print`);
}
