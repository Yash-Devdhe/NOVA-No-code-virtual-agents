import { NextResponse } from "next/server";

export async function POST() {
  try {
    const response = await fetch("https://official-joke-api.appspot.com/random_joke", {
      cache: "no-store",
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error("Failed to fetch joke");
    }

    return NextResponse.json({
      ...data,
      text: `${data.setup}\n${data.punchline}`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch joke" },
      { status: 500 }
    );
  }
}
