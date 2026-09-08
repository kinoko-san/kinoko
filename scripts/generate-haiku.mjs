/* ============================================================
   generate-haiku.mjs
   Composes one mushroom-themed haiku (5-7-5) and overwrites
   ../haiku.json. Run daily by GitHub Actions at 00:00 UTC
   (09:00 Asia/Tokyo).

   Requires env ANTHROPIC_API_KEY. Falls back to a local pool
   if the API is unreachable so the shrine always refreshes.
   ============================================================ */

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "haiku.json");

const MODEL = process.env.KINOKO_MODEL || "claude-haiku-4-5-20251001";
const API_KEY = process.env.ANTHROPIC_API_KEY;

/* ---- today's date in Asia/Tokyo ------------------------------- */
function tokyoDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const g = (t) => parts.find((p) => p.type === t).value;
  return `${g("year")}-${g("month")}-${g("day")}`;
}

/* ---- fallback pool ------------------------------------------------ */
const FALLBACK = [
  ["cold rain on the roof", "a white cap pushes through mulch", "the network wakes up"],
  ["under the cedar", "a ring of small brown buttons", "yesterday they weren't"],
  ["spores drift through lamplight", "each one a possible city", "none of them will grow"],
  ["the log has softened", "orange shelves climb toward the rain", "the tree keeps giving"],
  ["morning fog, and then", "a scarlet dome in wet leaves", "gone by afternoon"],
  ["mycelium hums", "beneath the parking lot, patient", "older than the road"],
  ["chanterelle gold", "hidden where the moss is thick", "I walk past it twice"],
  ["black trumpet, so dark", "it is a hole in the ground", "the forest exhales"],
  ["puffball in the field", "one kick and a summer's worth", "of smoke on the wind"],
  ["rain-slick and swollen", "the cap splits along one seam", "releasing the dark"],
  ["fairy ring at dawn", "the grass remembers a shape", "the fungus forgot"],
  ["shiitake unfurl", "on the oak we cut last year", "the dead wood still speaks"],
];

function fallbackFor(dateISO) {
  const doy = Math.floor(
    (Date.parse(dateISO + "T00:00:00Z") - Date.parse(dateISO.slice(0, 4) + "-01-01T00:00:00Z")) /
      86400000
  );
  return FALLBACK[doy % FALLBACK.length];
}

/* ---- Claude call ------------------------------------------------- */
async function compose() {
  if (!API_KEY) throw new Error("ANTHROPIC_API_KEY not set");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 256,
      temperature: 1,
      system:
        "You are Kinoko-san, keeper of a daily mushroom haiku shrine. " +
        "Compose ONE haiku in English, three lines, roughly 5-7-5 syllables. " +
        "Every haiku is about mushrooms, fungi, spores, mycelium, decay, or " +
        "the forest floor. Concrete sensory image; a seasonal or temporal turn; " +
        "quiet, a little uncanny, in the spirit of Ghost in the Shell's rain. " +
        "No title, no notes, no explanation. " +
        'Respond with ONLY minified JSON: {"lines":["...","...","..."]}',
      messages: [
        {
          role: "user",
          content:
            "Compose today's mushroom haiku. Date (Asia/Tokyo): " + tokyoDate(),
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }

  const data = await res.json();
  const text = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("no JSON in model reply: " + text.slice(0, 200));
  const parsed = JSON.parse(match[0]);
  const lines = (parsed.lines || [])
    .map((l) => String(l).trim())
    .filter(Boolean);
  if (lines.length !== 3) {
    throw new Error("expected 3 lines, got " + lines.length);
  }
  return lines;
}

/* ---- main -------------------------------------------------------- */
const date = tokyoDate();

let prevCycle = 0;
try {
  const prev = JSON.parse(await readFile(OUT, "utf8"));
  if (Number.isFinite(prev.cycle)) prevCycle = prev.cycle;
} catch {
  /* first run */
}

let lines;
let source = "claude:" + MODEL;
try {
  lines = await compose();
} catch (err) {
  console.error("compose failed, using fallback:", err.message);
  lines = fallbackFor(date);
  source = "fallback";
}

const payload = {
  date,
  cycle: prevCycle + 1,
  lines,
  source,
  generated_at: new Date().toISOString(),
};

await writeFile(OUT, JSON.stringify(payload, null, 2) + "\n", "utf8");
console.log("wrote", OUT);
console.log(lines.join(" / "));
