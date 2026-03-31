/**
 * NOVA Agent: Weather Agent
 * Generated from NOVA No-Code Virtual Agents Platform
 * 
 * This code can be run in Node.js or browser environments
 */

// Agent Configuration
const AGENT_CONFIG = {
  name: "Weather Agent",
  createdAt: new Date(),
  nodeCount: 3,
};

// Node Handlers
const nodeHandlers = {
  start_1: async (context) => {
    console.log("🚀 Agent started: Weather Agent");
    return { success: true, next: "llm_2" };
  },
  api_2: async (context) => {
    // API Node - Custom API
    const response = await fetch("/api/custom-api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: "",
        method: "GET"
      })
    });
    const data = await response.json();
    return { success: true, data, next: "node_3" };
  },
  end_3: async (context) => {
    console.log("✅ Agent completed");
    return { success: true, done: true };
  },
};

// Main Agent Runner
async function runAgent(input) {
  const context = { input, state: {}, history: [] };
  let currentNode = "start_1";
  
  while (currentNode && currentNode !== "end_1") {
    const handler = nodeHandlers[currentNode];
    if (!handler) break;
    const result = await handler(context);
    context.history.push({ node: currentNode, result });
    if (result.done) break;
    currentNode = result.next;
  }
  return context;
}

// Helper Functions
async function getWeather(city) {
  const response = await fetch("/api/weather", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ city })
  });
  return await response.json();
}

async function getDirections(origin, destination) {
  const response = await fetch("/api/maps", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "directions", origin, destination })
  });
  return await response.json();
}

async function generateVideo(prompt, userId) {
  const response = await fetch("/api/video", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, userId })
  });
  return await response.json();
}

async function generateAudio(text, userId) {
  const response = await fetch("/api/audio", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, userId })
  });
  return await response.json();
}

module.exports = { runAgent, getWeather, getDirections, generateVideo, generateAudio, AGENT_CONFIG };
