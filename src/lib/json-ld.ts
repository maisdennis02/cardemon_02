// Serialize an object as JSON safe for embedding inside an inline <script>
// element. JSON.stringify alone is NOT safe — it leaves `<` unescaped, so a
// value like "</script>" terminates the surrounding <script> tag and any
// remaining content runs as HTML/JS (classic XSS via JSON-LD).
//
// We escape `<`, `>`, `&`, and the U+2028 / U+2029 separators (the last two
// historically break JS parsers when embedded inline) by emitting their JSON
// `\uXXXX` form. JSON.parse decodes them back, so consumers (Google's parser
// included) see the original characters; the raw HTML never does.
export function jsonLdScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
