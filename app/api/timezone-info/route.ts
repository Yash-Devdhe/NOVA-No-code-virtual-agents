import { NextResponse } from "next/server";

function extractTimezone(value: string) {
  const trimmed = value.trim();
  const slashMatch = trimmed.match(/[A-Za-z_]+\/[A-Za-z_]+(?:\/[A-Za-z_]+)?/);
  if (slashMatch) return slashMatch[0];

  const mapped: Record<string, string> = {
    kolkata: "Asia/Kolkata",
    delhi: "Asia/Kolkata",
    mumbai: "Asia/Kolkata",
    london: "Europe/London",
    tokyo: "Asia/Tokyo",
    paris: "Europe/Paris",
    sydney: "Australia/Sydney",
    dubai: "Asia/Dubai",
    newyork: "America/New_York",
    "new york": "America/New_York",
  };

  return mapped[trimmed.toLowerCase()] || null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const timezone = extractTimezone(String(body.timezone || body.prompt || body.input || ""));

    if (!timezone) {
      return NextResponse.json(
        { error: "Enter a timezone like Asia/Kolkata or America/New_York." },
        { status: 400 }
      );
    }

    const response = await fetch(`https://worldtimeapi.org/api/timezone/${encodeURIComponent(timezone)}`, {
      cache: "no-store",
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || "Failed to fetch timezone data");
    }

    return NextResponse.json({
      ...data,
      text: [
        `Timezone: ${data.timezone}`,
        `Datetime: ${data.datetime}`,
        `UTC offset: ${data.utc_offset}`,
        `Day of week: ${data.day_of_week}`,
        `Day of year: ${data.day_of_year}`,
      ].join("\n"),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch timezone info" },
      { status: 500 }
    );
  }
}
