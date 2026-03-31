# City/Country Real-Time API Catalog

Use these official endpoints for agents that accept `city` or `city, country` input.

## Ready-to-use local aggregator

- Local route: `/api/location-intel`
- Input body:

```json
{
  "prompt": "Paris, France"
}
```

This route aggregates:

- Open-Meteo Geocoding
- Open-Meteo Forecast
- Open-Meteo Air Quality
- REST Countries
- Nager.Date public holidays

## External APIs

1. Open-Meteo Geocoding
- URL: `https://geocoding-api.open-meteo.com/v1/search?name={CITY_OR_CITY_COUNTRY}&count=1&language=en&format=json`
- Key: not required

2. Open-Meteo Current Weather
- URL: `https://api.open-meteo.com/v1/forecast?latitude={LAT}&longitude={LON}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,pressure_surface_level,is_day&daily=sunrise,sunset&timezone=auto&forecast_days=1`
- Key: not required

3. Open-Meteo Air Quality
- URL: `https://air-quality-api.open-meteo.com/v1/air-quality?latitude={LAT}&longitude={LON}&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,ozone,european_aqi,us_aqi&timezone=auto`
- Key: not required

4. REST Countries
- URL: `https://restcountries.com/v3.1/alpha/{COUNTRY_CODE}`
- Key: not required

5. Nager.Date Holidays
- URL: `https://date.nager.at/api/v3/PublicHolidays/{YEAR}/{COUNTRY_CODE}`
- Key: not required

6. OpenWeatherMap Current Weather
- URL: `https://api.openweathermap.org/data/2.5/weather?q={CITY}&appid={OPENWEATHERMAP_API_KEY}&units=metric`
- Key env: `OPENWEATHERMAP_API_KEY`

7. ExchangeRate-API
- URL: `https://v6.exchangerate-api.com/v6/{EXCHANGERATE_API_KEY}/latest/{BASE_CURRENCY}`
- Key env: `EXCHANGERATE_API_KEY`

8. Sunrise-Sunset
- URL: `https://api.sunrise-sunset.org/json?lat={LAT}&lng={LON}&formatted=0`
- Key: not required

9. Local all-currency endpoint
- URL: `/api/currency-all`
- Method: `POST`
- Body:

```json
{
  "prompt": "INR"
}
```

- Key: not required

## Terminal runtime

Generated agent code now supports:

- `node generated-agent.js "Paris, France"` for one-shot execution
- `node generated-agent.js` for interactive terminal chat

For local Next.js API routes, set:

```bash
NOVA_AGENT_BASE_URL=http://localhost:3000
```
