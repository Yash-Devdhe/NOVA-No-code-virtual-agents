import { NextResponse } from 'next/server';

// Custom API Tool - Fixed for OpenWeatherMap + General Proxy
// 1. OpenWeather special handling: ?appid=KEY + city extraction
// 2. Blocks management/login URLs  
// 3. Query param auth support
// 4. Proxies to /api/weather for OpenWeather URLs

interface CustomApiPayload {
  url: string;
  method?: string;
  apiKey?: string;
  apiKeyConfig?: {
    useApiKey: boolean;
    apiKey: string;
    authType?: 'bearer' | 'api-key' | 'query' | 'custom';
    customHeaderName?: string;
  };
  headers?: Record<string, string>;
  body?: any;
  contentType?: string;
  city?: string; // For weather proxy
  authType?: 'bearer' | 'api-key' | 'query'; // New: auth method
}

export async function POST(req: Request) {
  try {
    const body: CustomApiPayload = await req.json();
    
    // OpenWeatherMap Special Handling ✅
    if (!body.url) {
      return NextResponse.json({ error: 'API URL required' }, { status: 400 });
    }

    // Block OpenWeather management pages
    if (body.url.includes('home.openweathermap.org') || body.url.includes('/api_keys')) {
      return NextResponse.json(
        { 
          error: 'OpenWeather data APIs only. Use https://api.openweathermap.org/data/*',
          suggestedUrl: 'https://api.openweathermap.org/data/2.5/weather?q=London&appid=YOUR_KEY'
        }, 
        { status: 400 }
      );
    }

    if (body.url.includes('openweathermap.org')) {
      return handleOpenWeatherRequest(body);
    }

    return handleGeneralProxy(body);
  } catch (error) {
    console.error('Custom API error:', error);
    return NextResponse.json(
      { error: 'Proxy failed', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

async function handleOpenWeatherRequest(body: CustomApiPayload) {
  const { city, url } = body;
  const apiKey =
    body.apiKeyConfig?.useApiKey && body.apiKeyConfig.apiKey
      ? body.apiKeyConfig.apiKey
      : body.apiKey;
  
  if (!city && !body.body?.city) {
    return NextResponse.json(
      { error: 'city required for OpenWeather (e.g. "London")' }, 
      { status: 400 }
    );
  }
  
  const requestCity = city || body.body?.city || 'London';
  
  if (!apiKey) {
    return NextResponse.json(
      { 
        error: 'OpenWeather API key required (?appid=KEY format)',
        example: `POST /api/custom-api {"url":"https://api.openweathermap.org/data/2.5/weather?q=${requestCity}", "apiKey":"YOUR_KEY", "city":"${requestCity}"}`
      },
      { status: 400 }
    );
  }

  // ✅ PROXY to perfect weather route (handles fallback + parsing)
  const weatherResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/weather`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      city: requestCity,
      apiKey,
      provider: 'openweathermap'
    })
  });

  const weatherData = await weatherResponse.json();
  
  return NextResponse.json({
    success: weatherResponse.ok,
    provider: 'OpenWeatherMap (via proxy)',
    originalUrl: url,
    data: weatherData,
    usedCity: requestCity,
    keyStatus: apiKey ? 'provided' : 'fallback'
  });
}

async function handleGeneralProxy(body: CustomApiPayload) {
  const { url, method = 'GET', headers = {}, body: requestBody, contentType } = body;
  const apiKey = body.apiKeyConfig?.useApiKey ? body.apiKeyConfig.apiKey : body.apiKey;
  const authType = body.apiKeyConfig?.authType || body.authType || 'bearer';
  const customHeaderName = body.apiKeyConfig?.customHeaderName;

  // Validate URL
  try { new URL(url); } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  // Smart auth headers + query params
  const requestHeaders: Record<string, string> = { ...headers };
  
  if (apiKey) {
    switch (authType) {
      case 'query':
        // Append ?key=VALUE to URL (OpenAI, some services)
        const separator = url.includes('?') ? '&' : '?';
        const proxyUrl = `${url}${separator}key=${encodeURIComponent(apiKey)}`;
        return forwardRequest(proxyUrl, { method, headers: requestHeaders, body: requestBody });

      case 'custom':
        requestHeaders[customHeaderName || 'Authorization'] = apiKey;
        break;
      
      case 'api-key':
        requestHeaders['X-API-Key'] = apiKey;
        break;
        
      case 'bearer':
      default:
        requestHeaders['Authorization'] = `Bearer ${apiKey}`;
        break;
    }
  }

  if (contentType) {
    requestHeaders['Content-Type'] = contentType;
  }

  return forwardRequest(url, { 
    method: method.toUpperCase(), 
    headers: requestHeaders, 
    body: requestBody 
  });
}

async function forwardRequest(url: string, options: RequestInit) {
  if (['POST', 'PUT', 'PATCH'].includes(options.method || 'GET') && options.body) {
    options.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
  }

  const response = await fetch(url, options);
  const contentType = response.headers.get('content-type') || '';
  const textData = await response.text();
  let data;
  if (contentType.includes('application/json')) {
    data = textData.trim() ? JSON.parse(textData) : null;
  } else {
    data = { raw: textData.slice(0, 2000) };
  }

  return NextResponse.json({
    success: response.ok,
    status: response.status,
    statusText: response.statusText,
    contentType,
    data,
    url,
    method: options.method,
  });
}

// Preflight OPTIONS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    },
  });
}
