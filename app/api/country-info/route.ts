import { NextResponse } from "next/server";

function extractCountry(prompt: string) {
  return prompt
    .replace(/^country\s+/i, "")
    .replace(/^info\s+/i, "")
    .trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const country = extractCountry(String(body.country || body.prompt || body.input || ""));

    if (!country) {
      return NextResponse.json({ error: "Enter a country name." }, { status: 400 });
    }

    const response = await fetch(
      `https://restcountries.com/v3.1/name/${encodeURIComponent(country)}?fullText=true`,
      { cache: "no-store" }
    );
    const data = await response.json();
    const item = Array.isArray(data) ? data[0] : data;

    if (!response.ok || !item) {
      throw new Error(item?.message || "Country not found");
    }

    return NextResponse.json({
      country: item,
      text: [
        `${item.name?.common} ${item.flag || ""}`.trim(),
        `Official name: ${item.name?.official || "Unknown"}`,
        `Capital: ${item.capital?.[0] || "Unknown"}`,
        `Population: ${item.population || "Unknown"}`,
        `Region: ${item.region || "Unknown"} / ${item.subregion || "Unknown"}`,
        `Currencies: ${
          item.currencies
            ? Object.entries(item.currencies)
                .map(([code, value]: [string, any]) => `${code} (${value?.name || ""})`)
                .join(", ")
            : "Unknown"
        }`,
        `Languages: ${
          item.languages ? Object.values(item.languages).join(", ") : "Unknown"
        }`,
      ].join("\n"),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch country info" },
      { status: 500 }
    );
  }
}
