// The concierge image script (scripts/concierge-preview.ts) writes and
// publishes a menu so it can screenshot it. It must only ever touch the local
// database named in .env — never whatever DATABASE_URL the shell happens to
// carry (prod, after a concierge-fill run). So it takes the parsed .env and
// deliberately never reads process.env.
export function previewDatabaseUrl(dotenvParsed: Record<string, string>): string {
  const url = dotenvParsed.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não está no .env: o script de imagens só usa o banco local.");
  return url;
}
