"use client"

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { validateApiKeyConfig, getHeaderPreview } from '@/lib/apiKeyConfigUtils';

interface ApiKeyConfig {
  useApiKey: boolean;
  apiKey: string;
  authType: 'bearer' | 'api-key' | 'query' | 'custom';
  customHeaderName?: string;
}

interface ToolApiKeyInputProps {
  value: ApiKeyConfig;
  onChange: (config: ApiKeyConfig) => void;
  showLabel?: boolean;
  tooltip?: string;
}

export function ToolApiKeyInput({ value, onChange, showLabel = true, tooltip }: ToolApiKeyInputProps) {
  const validation = validateApiKeyConfig(value);
  const hasError = !validation.valid;

  const updateConfig = (updates: Partial<ApiKeyConfig>) => {
    onChange({ ...value, ...updates });
  };

  return (
    <div className="space-y-2">
      {showLabel && (
        <Label className="flex items-center gap-2">
          API Authentication {tooltip && <span className="text-xs text-muted-foreground">(?)</span>}
          {hasError && <span className="text-red-500 text-xs ml-auto">⚠️</span>}
        </Label>
      )}
      
      <div className="space-y-3 p-3 border rounded-lg bg-slate-50">
        {/* Enable toggle */}
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="useApiKey"
            checked={value.useApiKey}
            onCheckedChange={(checked) => {
              updateConfig({ useApiKey: !!checked });
              if (!checked) updateConfig({ apiKey: '' });
            }}
          />
          <Label htmlFor="useApiKey" className="text-sm font-medium">
            Enable API Key
          </Label>
        </div>

        {/* API Key input */}
        {value.useApiKey && (
          <>
            <div className="space-y-1">
              <Label htmlFor="apiKey" className="text-sm">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                value={value.apiKey}
                placeholder="sk-123... or appid..."
                onChange={(e) => updateConfig({ apiKey: e.target.value })}
                className={hasError ? 'border-red-300' : ''}
              />
            </div>

            {/* Auth Type */}
            <div className="space-y-1">
              <Label htmlFor="authType" className="text-sm">Auth Type</Label>
              <Select 
                value={value.authType} 
                onValueChange={(type) => updateConfig({ authType: type as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bearer">Bearer Token (OpenAI, Anthropic)</SelectItem>
                  <SelectItem value="api-key">API Key Header (Stripe)</SelectItem>
                  <SelectItem value="query">Query Param (OpenWeatherMap appid)</SelectItem>
                  <SelectItem value="custom">Custom Header</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {value.authType === 'custom' && (
              <div className="space-y-1">
                <Label htmlFor="customHeaderName" className="text-sm">Custom Header Name</Label>
                <Input
                  id="customHeaderName"
                  value={value.customHeaderName || ''}
                  placeholder="X-My-Api-Key"
                  onChange={(e) => updateConfig({ customHeaderName: e.target.value })}
                  className={hasError ? 'border-red-300' : ''}
                />
              </div>
            )}

            {/* Preview */}
            <div className="text-xs p-2 bg-blue-50 border rounded text-blue-900">
              Preview: {getHeaderPreview(value as any)}
            </div>

            {/* Validation error */}
            {hasError && (
              <div className="text-xs text-red-600 p-2 bg-red-50 border rounded">
                {validation.error}
              </div>
            )}
          </>
        )}
      </div>
      
      {tooltip && (
        <p className="text-xs text-muted-foreground mt-1">{tooltip}</p>
      )}
    </div>
  );
}

