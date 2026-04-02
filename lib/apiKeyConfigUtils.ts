/**
 * API Key Configuration Utilities
 * Helper functions for handling API key configuration across tools
 */

interface ApiKeyConfig {
  useApiKey: boolean;
  apiKey: string;
  authType?: 'bearer' | 'api-key' | 'query' | 'custom';
  customHeaderName?: string;
  headerType?: 'bearer' | 'api-key' | 'custom';
  keyName?: string;
}

function getNormalizedAuthType(config?: ApiKeyConfig): 'bearer' | 'api-key' | 'query' | 'custom' {
  const authType = config?.authType || config?.headerType || 'bearer';
  return authType === 'query' ? 'query' : authType;
}

function getNormalizedHeaderName(config?: ApiKeyConfig): string | undefined {
  return config?.customHeaderName || config?.keyName;
}

/**
 * Get the appropriate header name based on authentication type
 */
export function getAuthHeaderName(
  headerType: string = 'bearer',
  customKeyName?: string
): string {
  switch (headerType.toLowerCase()) {
    case 'api-key':
      return 'X-API-Key';
    case 'custom':
      return customKeyName || 'Authorization';
    case 'bearer':
    default:
      return 'Authorization';
  }
}

/**
 * Get the formatted header value based on authentication type
 */
export function getAuthHeaderValue(
  apiKey: string,
  headerType: string = 'bearer'
): string {
  if (!apiKey) {
    return '';
  }

  switch (headerType.toLowerCase()) {
    case 'api-key':
    case 'custom':
      return apiKey;
    case 'bearer':
    default:
      return `Bearer ${apiKey}`;
  }
}

/**
 * Build authentication headers from API key configuration
 */
export function buildAuthHeaders(config: ApiKeyConfig): Record<string, string> {
  const headers: Record<string, string> = {};

  if (config.useApiKey && config.apiKey) {
    const authType = getNormalizedAuthType(config);
    if (authType === 'query') {
      return headers;
    }

    const headerName = getAuthHeaderName(authType, getNormalizedHeaderName(config));
    const headerValue = getAuthHeaderValue(config.apiKey, authType);

    if (headerName && headerValue) {
      headers[headerName] = headerValue;
    }
  }

  return headers;
}

/**
 * Safely log API key configuration (without exposing the actual key)
 */
export function logApiKeyConfig(config: ApiKeyConfig | undefined): string {
  if (!config || !config.useApiKey) {
    return 'No API key configured';
  }

  const headerType = config.headerType || 'bearer';
  const keyLength = config.apiKey?.length || 0;
  const maskedKey = config.apiKey
    ? `${config.apiKey.substring(0, 4)}...${config.apiKey.substring(keyLength - 4)}`
    : '[empty]';

  return `API Key configured (${headerType}): ${maskedKey}`;
}

/**
 * Validate API key configuration
 */
export function validateApiKeyConfig(config: ApiKeyConfig | undefined): {
  valid: boolean;
  error?: string;
} {
  if (!config) {
    return { valid: true }; // Optional, so undefined is valid
  }

  if (!config.useApiKey) {
    return { valid: true }; // Disabled, so it's valid
  }

  if (!config.apiKey || !config.apiKey.trim()) {
    return {
      valid: false,
      error: 'API Key is required when authentication is enabled',
    };
  }

  const authType = getNormalizedAuthType(config);
  const validHeaderTypes = ['bearer', 'api-key', 'custom', 'query'];
  if (authType && !validHeaderTypes.includes(authType)) {
    return {
      valid: false,
      error: `Invalid header type: ${authType}`,
    };
  }

  if (authType === 'custom' && (!getNormalizedHeaderName(config) || !getNormalizedHeaderName(config)?.trim())) {
    return {
      valid: false,
      error: 'Custom header name is required for custom authentication type',
    };
  }

  return { valid: true };
}

/**
 * Create a default API key configuration
 */
export function createDefaultApiKeyConfig(
  useApiKey: boolean = false
): ApiKeyConfig {
  return {
    useApiKey,
    apiKey: '',
    authType: 'bearer',
    customHeaderName: '',
  };
}

/**
 * Merge API key configuration with existing headers
 */
export function mergeAuthHeaders(
  existingHeaders: Record<string, string> = {},
  apiKeyConfig?: ApiKeyConfig
): Record<string, string> {
  const authHeaders = buildAuthHeaders(apiKeyConfig || createDefaultApiKeyConfig());
  return {
    ...existingHeaders,
    ...authHeaders,
  };
}

/**
 * Check if API key configuration is complete and enabled
 */
export function isApiKeyEnabled(config: ApiKeyConfig | undefined): boolean {
  return !!(config?.useApiKey && config?.apiKey?.trim());
}

/**
 * Get API key configuration from request body or headers
 * Useful for extracting existing configuration from stored agents
 */
export function extractApiKeyConfig(data: Record<string, any>): ApiKeyConfig {
  if (data.apiKeyConfig) {
    return data.apiKeyConfig;
  }

  // Fallback: handle old format with includeApiKey and apiKey
  if (data.includeApiKey || data.apiKey) {
    return {
      useApiKey: !!data.includeApiKey,
      apiKey: data.apiKey || '',
      authType: data.authType || data.headerType || 'bearer',
      customHeaderName: data.customHeaderName || data.keyName || '',
    };
  }

  return createDefaultApiKeyConfig();
}

/**
 * Format API key configuration for logging (SAFE - doesn't expose key)
 */
export function formatApiKeyConfigForLog(config: ApiKeyConfig | undefined): object {
  if (!config || !config.useApiKey) {
    return { apiKeyConfigured: false };
  }

  return {
    apiKeyConfigured: true,
    headerType: getNormalizedAuthType(config),
    hasCustomKey: !!getNormalizedHeaderName(config),
    keyLength: config.apiKey?.length || 0,
  };
}

/**
 * Example: Full API call with API key configuration
 */
export async function makeAuthenticatedRequest(
  url: string,
  options: RequestInit = {},
  apiKeyConfig?: ApiKeyConfig
): Promise<Response> {
  // Build final headers
  const headers = mergeAuthHeaders(
    (options.headers as Record<string, string>) || {},
    apiKeyConfig
  );

  // Make request
  const response = await fetch(url, {
    ...options,
    headers,
  });

  return response;
}

/**
 * Decode and validate Bearer token format
 */
export function validateBearerToken(token: string): boolean {
  // Basic validation: should not be empty
  if (!token || !token.trim()) {
    return false;
  }

  // Check if it looks like a valid token (alphanumeric, dots, dashes, underscores)
  return /^[\w\-\.]+$/.test(token);
}

/**
 * Convert API key configuration to environment variable format
 */
export function toEnvironmentVariable(
  config: ApiKeyConfig | undefined,
  envVarName: string = 'API_KEY'
): string {
  if (!config || !config.useApiKey || !config.apiKey) {
    return '';
  }

  return `${envVarName}=${config.apiKey}`;
}

/**
 * Create API key configuration from environment variable
 */
export function fromEnvironmentVariable(
  envValue: string,
  headerType: 'bearer' | 'api-key' | 'custom' = 'bearer'
): ApiKeyConfig {
  if (!envValue) {
    return createDefaultApiKeyConfig(false);
  }

  return {
    useApiKey: true,
    apiKey: envValue,
    authType: headerType,
  };
}

/**
 * Sanitize API key configuration for safe storage/transmission
 */
export function sanitizeApiKeyConfig(config: ApiKeyConfig): ApiKeyConfig {
  return {
    useApiKey: config.useApiKey,
    apiKey: config.apiKey ? '***REDACTED***' : '',
    authType: getNormalizedAuthType(config),
    customHeaderName: getNormalizedHeaderName(config),
  };
}

/**
 * Get header preview string (for UI display)
 */
export function getHeaderPreview(config: ApiKeyConfig): string {
  if (!config.useApiKey) {
    return 'No authentication headers';
  }

  if (!config.apiKey) {
    return 'API key not set';
  }

  const authType = getNormalizedAuthType(config);
  if (authType === 'query') {
    return 'Query param: [key]';
  }

  const headerName = getAuthHeaderName(authType, getNormalizedHeaderName(config));
  const headerValue = getAuthHeaderValue(config.apiKey, authType);

  if (authType === 'bearer') {
    return `${headerName}: Bearer [key]`;
  } else if (authType === 'api-key') {
    return `${headerName}: [key]`;
  }

  return `${headerName}: [value]`;
}

/**
 * Validate header type and return error if invalid
 */
export function validateHeaderType(
  headerType: string | undefined
): { valid: boolean; error?: string } {
  const validTypes = ['bearer', 'api-key', 'custom', 'query'];

  if (!headerType) {
    return { valid: true };
  }

  if (!validTypes.includes(headerType.toLowerCase())) {
    return {
      valid: false,
      error: `Invalid header type. Must be one of: ${validTypes.join(', ')}`,
    };
  }

  return { valid: true };
}

export default {
  getAuthHeaderName,
  getAuthHeaderValue,
  buildAuthHeaders,
  logApiKeyConfig,
  validateApiKeyConfig,
  createDefaultApiKeyConfig,
  mergeAuthHeaders,
  isApiKeyEnabled,
  extractApiKeyConfig,
  formatApiKeyConfigForLog,
  makeAuthenticatedRequest,
  validateBearerToken,
  toEnvironmentVariable,
  fromEnvironmentVariable,
  sanitizeApiKeyConfig,
  getHeaderPreview,
  validateHeaderType,
};
