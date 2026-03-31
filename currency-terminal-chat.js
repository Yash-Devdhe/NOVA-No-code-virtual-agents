#!/usr/bin/env node
/* eslint-disable no-console */

const readline = require("readline");

const BASE_CURRENCY = "INR";
const PRIMARY_API = `https://api.exchangerate-api.com/v4/latest/${BASE_CURRENCY}`;
const FALLBACK_API = `https://open.er-api.com/v1/latest/${BASE_CURRENCY}`;

function normalizeInput(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function extractCodes(value) {
  return normalizeInput(value).toUpperCase().match(/\b[A-Z]{3}\b/g) || [];
}

function extractAmount(value) {
  const match = normalizeInput(value).match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 1;
}

function parseCurrencyPrompt(input) {
  const cleaned = normalizeInput(input);
  const upper = cleaned.toUpperCase();
  const codes = extractCodes(upper);
  const amount = extractAmount(cleaned);

  if (/^(help|\?)$/i.test(cleaned)) {
    return { kind: "help" };
  }

  if (codes.length === 1) {
    return { kind: "target", amount, target: codes[0] };
  }

  if (/^(all|rates|rate)$/i.test(cleaned)) {
    return { kind: "rates" };
  }

  return null;
}

async function fetchRates() {
  let response = await fetch(PRIMARY_API, { cache: "no-store" });
  if (!response.ok) {
    response = await fetch(FALLBACK_API, { cache: "no-store" });
  }

  const data = await response.json();
  if (!response.ok || !data?.rates) {
    throw new Error(data?.error || data?.message || `Failed to fetch live rates for ${BASE_CURRENCY}`);
  }

  return data;
}

function formatRates(rates) {
  const sample = Object.entries(rates)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 12)
    .map(([code, rate]) => `${BASE_CURRENCY} -> ${code}: ${rate}`);

  return [
    `[Currency Exchange Agent]`,
    `Base currency: ${BASE_CURRENCY}`,
    `Live sample rates:`,
    ...sample,
  ].join("\n");
}

function formatConversion(amount, target, rate) {
  return [
    `[Currency Exchange Agent]`,
    `${amount} ${BASE_CURRENCY} = ${(amount * rate).toFixed(2)} ${target}`,
    `Live rate: 1 ${BASE_CURRENCY} = ${rate} ${target}`,
  ].join("\n");
}

function printHelp() {
  console.log("Currency Exchange Agent Terminal Chat");
  console.log("Type directly in terminal for live data.");
  console.log("");
  console.log("Examples:");
  console.log("USD");
  console.log("EUR");
  console.log("300 USD");
  console.log("rates");
  console.log("");
  console.log("Type 'exit' to quit.\n");
}

async function handleInput(input) {
  const parsed = parseCurrencyPrompt(input);

  if (!parsed) {
    return [
      `[Currency Exchange Agent]`,
      "Enter a target currency like USD or EUR, or an amount like 300 USD.",
    ].join("\n");
  }

  if (parsed.kind === "help") {
    return null;
  }

  const data = await fetchRates();
  const rates = data.rates || {};

  if (parsed.kind === "target") {
    const rate = rates[parsed.target];
    if (typeof rate !== "number") {
      throw new Error(`Target currency ${parsed.target} was not found for base ${BASE_CURRENCY}`);
    }
    return formatConversion(parsed.amount, parsed.target, rate);
  }

  return formatRates(rates);
}

async function main() {
  if (!process.stdin.isTTY) {
    console.log("Currency Exchange Agent Terminal Chat");
    console.log("Interactive chat needs a real terminal.");
    console.log("Run this file with: node currency-terminal-chat.js");
    return;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "> ",
  });

  printHelp();
  rl.prompt();

  rl.on("line", async (line) => {
    const input = normalizeInput(line);

    if (!input) {
      rl.prompt();
      return;
    }

    if (["exit", "quit"].includes(input.toLowerCase())) {
      rl.close();
      return;
    }

    if (["help", "?"].includes(input.toLowerCase())) {
      printHelp();
      rl.prompt();
      return;
    }

    try {
      const output = await handleInput(input);
      if (output) {
        console.log(`\n${output}\n`);
      }
    } catch (error) {
      console.log(`\nError: ${error instanceof Error ? error.message : String(error)}\n`);
    }

    rl.prompt();
  });

  rl.on("close", () => {
    console.log("Currency Exchange Agent closed.");
  });
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { handleInput, parseCurrencyPrompt, fetchRates };
