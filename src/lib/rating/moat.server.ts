export type MoatSource = {
  name: "MoatScan" | "InvestMoat";
  score: number;
  href: string;
  note: string;
};

export type MoatRead = {
  score: number;
  sources: MoatSource[];
  gap: boolean;
};

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

function stripTags(html: string): string[] {
  const withoutScripts = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
  const text = withoutScripts
    .replace(/<[^>]+>/g, "\n")
    .replace(/&/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/"/g, '"')
    .replace(/&#39;/g, "'");
  return text
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function parseInvestMoat(html: string, symbol: string): MoatSource | null {
  const lines = stripTags(html);
  for (let i = 0; i < lines.length - 5; i += 1) {
    if (lines[i] !== "Moat" || lines[i + 2] !== "Growth" || lines[i + 4] !== "Val") continue;
    const moat = Number(lines[i + 1]);
    const growth = Number(lines[i + 3]);
    const value = Number(lines[i + 5]);
    if ([moat, growth, value].every((n) => Number.isInteger(n) && n >= 0 && n <= 100) && moat > 0) {
      return {
        name: "InvestMoat",
        score: moat,
        href: `https://www.investmoat.com/stocks/${encodeURIComponent(symbol)}`,
        note: `moat pillar ${moat}/100 (their growth ${growth}, valuation ${value} are not reused here)`,
      };
    }
  }
  return null;
}

function unescapeFlight(html: string): string {
  return html.replace(/\\"/g, '"').replace(/\\u0026/g, "&");
}

function parseMoatScan(html: string, symbol: string): MoatSource | null {
  const flat = unescapeFlight(html);
  const needle = `canonicalTicker":"${symbol}"`;
  const indexes: number[] = [];
  let from = 0;
  while (from < flat.length) {
    const at = flat.indexOf(needle, from);
    if (at < 0) break;
    indexes.push(at);
    from = at + needle.length;
  }
  let best: { score: number; rating: string; trend: string; distance: number } | null = null;
  for (const index of indexes) {
    const window = flat.slice(Math.max(0, index - 900), index + 1800);
    const scoreMatch = window.match(/finalMoatScore":(\d+)/);
    if (!scoreMatch) continue;
    const score = Number(scoreMatch[1]);
    if (!Number.isFinite(score) || score < 0 || score > 100) continue;
    const rating = window.match(/moatRating":"([^"]+)"/)?.[1] ?? "";
    const trend = window.match(/moatTrend":"([^"]+)"/)?.[1] ?? "";
    const scoreAt = window.indexOf("finalMoatScore");
    const tickerAt = window.indexOf(needle);
    const distance = Math.abs(scoreAt - tickerAt);
    if (!best || distance < best.distance) best = { score, rating, trend, distance };
  }
  if (!best || best.distance > 1200) return null;
  const bits = [best.rating, best.trend].filter(Boolean).join(", ");
  return {
    name: "MoatScan",
    score: best.score,
    href: `https://moatscan-ai.com/analysis/${encodeURIComponent(symbol)}`,
    note: bits ? `${best.score}/100, ${bits}` : `${best.score}/100`,
  };
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html" },
      signal: AbortSignal.timeout(12000),
      redirect: "follow",
    });
    if (!response.ok) return null;
    return await response.text();
  } catch (error) {
    console.error("[meridian] moat", url, error);
    return null;
  }
}

export async function fetchMoat(symbol: string): Promise<MoatRead | null> {
  const [scanHtml, investHtml] = await Promise.all([
    fetchText(`https://moatscan-ai.com/analysis/${encodeURIComponent(symbol)}`),
    fetchText(`https://www.investmoat.com/stocks/${encodeURIComponent(symbol)}`),
  ]);
  const sources = [
    scanHtml ? parseMoatScan(scanHtml, symbol) : null,
    investHtml ? parseInvestMoat(investHtml, symbol) : null,
  ].filter((source): source is MoatSource => source != null);
  if (!sources.length) return null;
  const score = Math.round(sources.reduce((total, source) => total + source.score, 0) / sources.length);
  const gap = sources.length === 2 && Math.abs(sources[0]!.score - sources[1]!.score) >= 20;
  return { score, sources, gap };
}
