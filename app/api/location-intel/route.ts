import { NextResponse } from "next/server";

type ParsedLocation = {
  city: string;
  country?: string;
};

type GeoResult = {
  name: string;
  country?: string;
  country_code?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
};

function parseLocationInput(input: string): ParsedLocation | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const normalized = trimmed
    .replace(/^(weather|forecast|time|timezone|air quality|aqi|sunrise|sunset|country info|location)\s+(for|in)\s+/i, "")
    .replace(/\s{2,}/g, " ");

  if (normalized.includes(",")) {
    const [city, country] = normalized.split(",").map((part) => part.trim()).filter(Boolean);
    if (city) {
      return {
        city,
        country: country || undefined,
      };
    }
  }

  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return {
      city: parts[0],
      country: parts.slice(1).join(" "),
    };
  }

  return { city: normalized };
}

async function parseJson(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const raw = await response.text();
    throw new Error(`Expected JSON but received ${response.status}: ${raw.slice(0, 160)}`);
  }
  return response.json();
}

async function geocodeLocation(location: ParsedLocation): Promise<GeoResult> {
  const query = [location.city, location.country].filter(Boolean).join(", ");
  const response = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`,
    { cache: "no-store" }
  );
  const data = await parseJson(response);
  const result = data?.results?.[0];

  if (!result) {
    throw new Error(`Location not found for "${query}"`);
  }

  return result;
}

async function fetchOpenMeteoBundle(geo: GeoResult) {
  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${geo.latitude}&longitude=${geo.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,pressure_surface_level,is_day&daily=sunrise,sunset&timezone=auto&forecast_days=1`,
    { cache: "no-store" }
  );
  return parseJson(response);
}

async function fetchAirQuality(geo: GeoResult) {
  const response = await fetch(
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${geo.latitude}&longitude=${geo.longitude}&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,ozone,european_aqi,us_aqi&timezone=auto`,
    { cache: "no-store" }
  );
  return parseJson(response);
}

async function fetchCountryInfo(countryCode?: string, countryName?: string) {
  if (!countryCode && !countryName) return null;
  const endpoint = countryCode
    ? `https://restcountries.com/v3.1/alpha/${encodeURIComponent(countryCode)}`
    : `https://restcountries.com/v3.1/name/${encodeURIComponent(countryName || "")}?fullText=true`;
  const response = await fetch(endpoint, { cache: "no-store" });
  const data = await parseJson(response);
  return Array.isArray(data) ? data[0] : data;
}

async function fetchPublicHolidays(countryCode?: string) {
  if (!countryCode) return [];
  const year = new Date().getFullYear();
  const response = await fetch(
    `https://date.nager.at/api/v3/PublicHolidays/${year}/${encodeURIComponent(countryCode)}`,
    { cache: "no-store" }
  );
  if (!response.ok) {
    return [];
  }
  const data = await parseJson(response);
  return Array.isArray(data) ? data.slice(0, 5) : [];
}

function describeWeather(code: number): string {
  const weatherCodes: Record<number, string> = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    80: "Rain showers",
    81: "Moderate showers",
    82: "Violent showers",
    95: "Thunderstorm",
  };
  return weatherCodes[code] || "Unknown";
}

function buildTextSummary(payload: Record<string, unknown>) {
  const location = payload.location as Record<string, unknown>;
  const weather = payload.weather as Record<string, unknown>;
  const airQuality = payload.airQuality as Record<string, unknown>;
  const astronomy = payload.astronomy as Record<string, unknown>;
  const localTime = payload.localTime as Record<string, unknown>;
  const country = payload.country as Record<string, unknown>;
  const holidays = payload.holidays as Array<Record<string, unknown>>;

  return [
    `${location.city}, ${location.country}`,
    `Local time: ${String(localTime.localTime || "Unknown")} (${String(localTime.timezone || "Unknown timezone")})`,
    `Weather: ${String(weather.description || "Unknown")}, ${String(weather.temperatureC ?? "n/a")}C, feels like ${String(weather.feelsLikeC ?? "n/a")}C`,
    `Humidity: ${String(weather.humidity ?? "n/a")}% | Wind: ${String(weather.windSpeedKph ?? "n/a")} km/h | Pressure: ${String(weather.pressureHpa ?? "n/a")} hPa`,
    `Air quality: EU AQI ${String(airQuality.europeanAqi ?? "n/a")} | US AQI ${String(airQuality.usAqi ?? "n/a")} | PM2.5 ${String(airQuality.pm25 ?? "n/a")}`,
    `Sunrise: ${String(astronomy.sunrise || "n/a")} | Sunset: ${String(astronomy.sunset || "n/a")}`,
    `Country: ${String(country.officialName || location.country || "Unknown")} | Capital: ${String(country.capital || "n/a")} | Population: ${String(country.population ?? "n/a")}`,
    holidays?.length
      ? `Upcoming holidays sample: ${holidays.map((item) => `${item.date} ${item.localName}`).join("; ")}`
      : "Upcoming holidays sample: none available",
  ].join("\n");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawInput = String(body.city || body.location || body.prompt || body.input || "").trim();
    const parsed = parseLocationInput(rawInput);

    if (!parsed?.city) {
      return NextResponse.json(
        { error: "Enter a city or city, country value." },
        { status: 400 }
      );
    }

    const geo = await geocodeLocation(parsed);
    const [meteo, air, countryInfo, holidays] = await Promise.all([
      fetchOpenMeteoBundle(geo),
      fetchAirQuality(geo),
      fetchCountryInfo(geo.country_code, geo.country),
      fetchPublicHolidays(geo.country_code),
    ]);

    const current = meteo?.current || {};
    const daily = meteo?.daily || {};
    const currentAir = air?.current || {};
    const currencies = countryInfo?.currencies
      ? Object.entries(countryInfo.currencies).map(([code, value]: [string, any]) => ({
          code,
          name: value?.name,
          symbol: value?.symbol,
        }))
      : [];

    const payload = {
      source: "location-intel",
      input: rawInput,
      location: {
        city: geo.name,
        country: geo.country || parsed.country || null,
        countryCode: geo.country_code || null,
        latitude: geo.latitude,
        longitude: geo.longitude,
      },
      localTime: {
        timezone: meteo?.timezone || geo.timezone || null,
        localTime: current.time || null,
        isDay: current.is_day === 1,
      },
      weather: {
        provider: "Open-Meteo",
        description: describeWeather(Number(current.weather_code ?? -1)),
        temperatureC: current.temperature_2m ?? null,
        feelsLikeC: current.apparent_temperature ?? null,
        humidity: current.relative_humidity_2m ?? null,
        windSpeedKph: current.wind_speed_10m ?? null,
        pressureHpa: current.pressure_surface_level ?? null,
      },
      airQuality: {
        provider: "Open-Meteo Air Quality",
        europeanAqi: currentAir.european_aqi ?? null,
        usAqi: currentAir.us_aqi ?? null,
        pm25: currentAir.pm2_5 ?? null,
        pm10: currentAir.pm10 ?? null,
        carbonMonoxide: currentAir.carbon_monoxide ?? null,
        nitrogenDioxide: currentAir.nitrogen_dioxide ?? null,
        ozone: currentAir.ozone ?? null,
      },
      astronomy: {
        sunrise: daily?.sunrise?.[0] ?? null,
        sunset: daily?.sunset?.[0] ?? null,
      },
      country: {
        officialName: countryInfo?.name?.official ?? null,
        capital: countryInfo?.capital?.[0] ?? null,
        region: countryInfo?.region ?? null,
        subregion: countryInfo?.subregion ?? null,
        population: countryInfo?.population ?? null,
        currencies,
        languages: countryInfo?.languages ? Object.values(countryInfo.languages) : [],
        flag: countryInfo?.flag ?? null,
      },
      holidays: holidays.map((item: any) => ({
        date: item.date,
        localName: item.localName,
        name: item.name,
      })),
    };

    return NextResponse.json({
      ...payload,
      text: buildTextSummary(payload),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch real-time location data" },
      { status: 500 }
    );
  }
}
