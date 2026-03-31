import { NextResponse } from "next/server";

function extractNumber(prompt: string) {
  const match = prompt.match(/\d+/);
  return match?.[0] || null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const num = extractNumber(String(body.number || body.prompt || body.input || ""));

    if (!num) {
      return NextResponse.json({ error: "Enter a number like 300." }, { status: 400 });
    }

    const response = await fetch(`http://numbersapi.com/${encodeURIComponent(num)}`, {
      cache: "no-store",
    });
    const text = await response.text();

    if (!response.ok) {
      throw new Error("Failed to fetch number fact");
    }

    return NextResponse.json({
      number: Number(num),
      fact: text,
      text,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch number fact" },
      { status: 500 }
    );
  }
}
