import { NextResponse } from "next/server";

function extractIp(prompt: string) {
  const match = prompt.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
  return match?.[0] || "";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const ip = extractIp(String(body.ip || body.prompt || body.input || ""));
    const endpoint = ip ? `https://ipapi.co/${ip}/json/` : "https://ipapi.co/json/";
    const response = await fetch(endpoint, { cache: "no-store" });
    const data = await response.json();

    if (!response.ok || data?.error) {
      throw new Error(data?.reason || "Failed to fetch IP location");
    }

    return NextResponse.json({
      ...data,
      text: [
        `IP: ${data.ip}`,
        `City: ${data.city || "Unknown"}`,
        `Region: ${data.region || "Unknown"}`,
        `Country: ${data.country_name || "Unknown"}`,
        `Org: ${data.org || "Unknown"}`,
        `Timezone: ${data.timezone || "Unknown"}`,
      ].join("\n"),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch IP location" },
      { status: 500 }
    );
  }
}
