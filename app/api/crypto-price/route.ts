import { NextResponse } from "next/server";

function extractCoin(prompt: string) {
  const normalized = prompt.trim().toLowerCase();
  const known = ["bitcoin", "ethereum", "dogecoin", "solana", "ripple", "cardano", "tron"];
  const found = known.find((coin) => normalized.includes(coin));
  return found || normalized.replace(/^price\s+/i, "").replace(/^crypto\s+/i, "").trim() || null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const coin = extractCoin(String(body.coin || body.prompt || body.input || ""));

    if (!coin) {
      return NextResponse.json({ error: "Enter a crypto name like bitcoin or ethereum." }, { status: 400 });
    }

    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(
        coin
      )}&vs_currencies=usd,inr,eur`,
      { cache: "no-store" }
    );
    const data = await response.json();
    const info = data?.[coin];

    if (!response.ok || !info) {
      throw new Error("Crypto not found");
    }

    return NextResponse.json({
      coin,
      rates: info,
      text: [
        `Crypto: ${coin}`,
        `USD: ${info.usd ?? "n/a"}`,
        `INR: ${info.inr ?? "n/a"}`,
        `EUR: ${info.eur ?? "n/a"}`,
      ].join("\n"),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch crypto price" },
      { status: 500 }
    );
  }
}
