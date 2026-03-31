import { NextResponse } from "next/server";

export const runtime = "nodejs";

const PRIMARY_API = "https://api.exchangerate-api.com/v4/latest";
const FALLBACK_API = "https://open.er-api.com/v1/latest";
const CACHE_DURATION = 5 * 60 * 1000;

const currencyCache: Record<string, { timestamp: number; payload: any }> = {};

function validateCurrency(value: string) {
  return /^[A-Z]{3}$/.test(value);
}

function extractCurrencyInput(input: string) {
  const trimmed = input.trim().toUpperCase();
  if (validateCurrency(trimmed)) return trimmed;

  const match = trimmed.match(/\b[A-Z]{3}\b/);
  return match?.[0] || null;
}

async function fetchLatestAll(base: string) {
  const cached = currencyCache[base];
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return { ...cached.payload, provider: "cached" };
  }

  try {
    const response = await fetch(`${PRIMARY_API}/${base}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Primary API returned ${response.status}`);
    const data = await response.json();
    if (!data?.rates) throw new Error("Primary API missing rates");

    const payload = {
      success: true,
      base,
      date: data.date || new Date().toISOString().slice(0, 10),
      rates: data.rates,
      provider: "exchangerate-api",
      timestamp: new Date().toISOString(),
    };

    currencyCache[base] = {
      timestamp: Date.now(),
      payload,
    };

    return payload;
  } catch (primaryError) {
    const response = await fetch(`${FALLBACK_API}/${base}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Fallback API returned ${response.status}`);
    const data = await response.json();
    if (!data?.rates) throw new Error("Fallback API missing rates");

    const payload = {
      success: true,
      base,
      date: data.time_last_update_utc || new Date().toISOString(),
      rates: data.rates,
      provider: "open-er-api-fallback",
      timestamp: new Date().toISOString(),
      warning:
        primaryError instanceof Error
          ? `Primary API failed: ${primaryError.message}`
          : "Primary API failed",
    };

    currencyCache[base] = {
      timestamp: Date.now(),
      payload,
    };

    return payload;
  }
}

function createSummary(base: string, rates: Record<string, number>) {
  const sorted = Object.entries(rates)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 25)
    .map(([code, rate]) => `${base} -> ${code}: ${rate}`);

  return [
    `Base currency: ${base}`,
    `Total currencies: ${Object.keys(rates).length}`,
    "Sample rates:",
    ...sorted,
  ].join("\n");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const base =
      extractCurrencyInput(String(body.base || body.currency || body.prompt || body.input || ""));

    if (!base) {
      return NextResponse.json(
        {
          success: false,
          error: "Enter a valid 3-letter currency code like INR, USD, EUR.",
        },
        { status: 400 }
      );
    }

    const payload = await fetchLatestAll(base);
    return NextResponse.json({
      ...payload,
      text: createSummary(base, payload.rates),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch all currency exchange rates",
      },
      { status: 500 }
    );
  }
}
