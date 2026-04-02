#!/usr/bin/env node
/* eslint-disable no-console */

const BASE_URL = process.env.NOVA_AGENT_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== "undefined" ? window.location.origin : process.env.RENDER_EXTERNAL_URL ? `https://${process.env.RENDER_EXTERNAL_URL}` : "http://localhost:3000");

const ROUTES = {
  currency: {
    key: "currency",
    agentName: "Currency Exchange Agent",
    url: "/api/currency-all",
    examples: ["INR", "USD", "currency INR", "convert 300 INR USD"],
  },
  time: {
    key: "time",
    agentName: "Time Zone Agent",
    url: "/api/timezone-info",
    examples: ["Asia/Kolkata", "time Asia/Kolkata", "time London"],
  },
  weather: {
    key: "weather",
    agentName: "Weather Agent",
    url: "/api/location-intel",
    examples: ["weather mumbai", "mumbai", "Paris, France"],
  },
  country: {
    key: "country",
    agentName: "Country Info Agent",
    url: "/api/country-info",
    examples: ["country india", "india"],
  },
  crypto: {
    key: "crypto",
    agentName: "Crypto Price Agent",
    url: "/api/crypto-price",
    examples: ["crypto bitcoin", "bitcoin", "ethereum"],
  },
  ip: {
    key: "ip",
    agentName: "IP Location Agent",
    url: "/api/ip-location",
    examples: ["ip 8.8.8.8", "8.8.8.8"],
  },
  joke: {
    key: "joke",
    agentName: "Joke Agent",
    url: "/api/random-joke",
    examples: ["joke", "funny"],
  },
  number: {
    key: "number",
    agentName: "Number Fact Agent",
    url: "/api/number-fact",
    examples: ["number 300", "300"],
  },
};

const KNOWN_COUNTRIES = new Set([
  "india",
  "usa",
  "united states",
  "uk",
  "united kingdom",
  "france",
  "germany",
  "japan",
  "china",
  "canada",
  "australia",
  "brazil",
  "russia",
  "italy",
  "spain",
  "mexico",
]);

function normalizePrompt(input) {
  return input.trim().replace(/\s+/g, " ");
}

function stripCommandPrefix(input, commands) {
  let output = input;
  for (const command of commands) {
    const pattern = new RegExp(`^${command}\\s+`, "i");
    if (pattern.test(output)) {
      output = output.replace(pattern, "");
      break;
    }
  }
  return output.trim();
}

function routeForInput(input) {
  const trimmed = normalizePrompt(input);
  const lower = trimmed.toLowerCase();

  if (!trimmed) {
    return null;
  }

  if (/^(help|\?)$/i.test(trimmed)) {
    return { kind: "help" };
  }

  if (/^[A-Z]{3}$/.test(trimmed.toUpperCase()) || /\b(currency|convert|exchange|rate|rates)\b/i.test(trimmed)) {
    return {
      ...ROUTES.currency,
      body: { prompt: stripCommandPrefix(trimmed, ["currency", "convert", "exchange", "rate", "rates"]) || trimmed },
    };
  }

  if (/[A-Za-z_]+\/[A-Za-z_]+(?:\/[A-Za-z_]+)?/.test(trimmed) || /^(time|timezone)\b/i.test(trimmed)) {
    return {
      ...ROUTES.time,
      body: { prompt: stripCommandPrefix(trimmed, ["time", "timezone"]) || trimmed },
    };
  }

  if (/^(ip)\b/i.test(trimmed) || /\b(?:\d{1,3}\.){3}\d{1,3}\b/.test(trimmed)) {
    return {
      ...ROUTES.ip,
      body: { prompt: stripCommandPrefix(trimmed, ["ip"]) || trimmed },
    };
  }

  if (/\b(joke|funny|laugh)\b/i.test(trimmed)) {
    return {
      ...ROUTES.joke,
      body: { prompt: trimmed },
    };
  }

  if (/(bitcoin|ethereum|dogecoin|solana|ripple|cardano|tron|crypto)\b/i.test(trimmed)) {
    return {
      ...ROUTES.crypto,
      body: { prompt: stripCommandPrefix(trimmed, ["crypto", "coin", "price"]) || trimmed },
    };
  }

  if (/^(number|fact)\b/i.test(trimmed) || (/^-?\d+(?:\.\d+)?$/.test(trimmed) && !trimmed.includes(","))) {
    return {
      ...ROUTES.number,
      body: { prompt: stripCommandPrefix(trimmed, ["number", "fact"]) || trimmed },
    };
  }

  if (/^(weather|forecast|location)\b/i.test(trimmed) || trimmed.includes(",")) {
    return {
      ...ROUTES.weather,
      body: { prompt: stripCommandPrefix(trimmed, ["weather", "forecast", "location"]) || trimmed },
    };
  }

  if (/^(country|info)\b/i.test(trimmed) || KNOWN_COUNTRIES.has(lower)) {
    return {
      ...ROUTES.country,
      body: { prompt: stripCommandPrefix(trimmed, ["country", "info"]) || trimmed },
    };
  }

  return {
    ...ROUTES.weather,
    body: { prompt: trimmed },
  };
}

async function callLocalRoute(path, body) {
  const response = await fetch(new URL(path, BASE_URL), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || `Request failed with ${response.status}`);
  }
  return data;
}

async function main() {
  const readline = (await import("readline/promises")).default;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log("NOVA Terminal Chat");
  console.log("Type a value directly and the matching API agent will answer in this terminal.");
  console.log("Examples: INR, USD, Asia/Kolkata, mumbai, country india, bitcoin, 8.8.8.8, joke, 300");
  console.log("Type 'help' to see commands or 'exit' to quit.\n");

  while (true) {
    const input = (await rl.question("> ")).trim();
    if (!input) continue;
    if (["exit", "quit"].includes(input.toLowerCase())) break;

    try {
      const route = routeForInput(input);
      if (!route) continue;
      if (route.kind === "help") {
        console.log("");
        Object.values(ROUTES).forEach((item) => {
          console.log(`${item.agentName}: ${item.examples.join(" | ")}`);
        });
        console.log("");
        continue;
      }

      const result = await callLocalRoute(route.url, route.body);
      console.log(`\n[${route.agentName}]`);
      console.log((result.text || JSON.stringify(result, null, 2)) + "\n");
    } catch (error) {
      console.error("\nError:", error instanceof Error ? error.message : String(error), "\n");
    }
  }

  rl.close();
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
