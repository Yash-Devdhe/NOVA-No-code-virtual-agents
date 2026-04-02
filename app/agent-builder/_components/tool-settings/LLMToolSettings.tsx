'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Save, Brain } from 'lucide-react';
import { ToolApiKeyInput } from './ToolApiKeyInput';

interface LLMToolSettingsProps {
  nodeId: string;
  agentId: string;
  initialConfig?: Record<string, any>;
  onSave: (config: any) => void;
  onClose: () => void;
}

/**
 * LLM Tool Settings
 * Professional configuration panel for Large Language Models
 */
const LLMToolSettings: React.FC<LLMToolSettingsProps> = ({
  nodeId,
  agentId,
  initialConfig = {},
  onSave,
}) => {
  const [name, setName] = useState(initialConfig.name || 'LLM Call');
  const [model, setModel] = useState(initialConfig.model || 'gpt-4');
  const [systemPrompt, setSystemPrompt] = useState(initialConfig.systemPrompt || '');
  const [userPrompt, setUserPrompt] = useState(initialConfig.userPrompt || '');
  const [temperature, setTemperature] = useState(initialConfig.temperature || 0.7);
  const [apiKeyConfig, setApiKeyConfig] = useState(
    initialConfig.apiKeyConfig || {
      useApiKey: true,
      apiKey: '',
      headerType: 'bearer',
    }
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Tool name is required');
      return;
    }

    if (apiKeyConfig.useApiKey && !apiKeyConfig.apiKey.trim()) {
      alert('API Key is required for LLM operations');
      return;
    }

    if (temperature < 0 || temperature > 2) {
      alert('Temperature must be between 0 and 2');
      return;
    }

    setSaving(true);
    try {
      const config = {
        name,
        model,
        systemPrompt,
        userPrompt,
        temperature: parseFloat(temperature.toString()),
        apiKeyConfig,
        nodeId,
        agentId,
        savedAt: Date.now(),
      };

      console.log('LLM Tool Settings Saved:', { toolType: 'llm', nodeId, agentId, config });
      onSave(config);
      alert('✓ LLM configuration saved successfully!');
    } catch (error) {
      console.error('Error saving LLM settings:', error);
      alert('✗ Error saving settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-blue-50 to-white">
      <div className="p-4 border-b bg-white shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Brain className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-gray-900">LLM Tool</h3>
              <p className="text-sm text-gray-500">AI Language Model configuration</p>
            </div>
          </div>
          <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
            Advanced
          </Badge>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <Card className="border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Basic Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs font-medium text-gray-700">Tool Name</Label>
              <Input
                placeholder="e.g., Generate Content, Summarize Text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-medium text-gray-700">Model</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4">GPT-4 (Most capable)</SelectItem>
                  <SelectItem value="gpt-4-turbo">GPT-4 Turbo (Faster)</SelectItem>
                  <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Budget)</SelectItem>
                  <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                  <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                  <SelectItem value="mistral-large">Mistral Large</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Prompts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs font-medium text-gray-700">System Prompt</Label>
              <Textarea
                placeholder="Define the AI's role and behavior (optional)"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="mt-1 font-mono text-sm"
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">Sets the context and behavior for the model</p>
            </div>

            <div>
              <Label className="text-xs font-medium text-gray-700">User Prompt</Label>
              <Textarea
                placeholder="The actual request or question (can include variables)"
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                className="mt-1 font-mono text-sm"
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">Use [[variable]] syntax for dynamic content</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-gray-700">Temperature</Label>
                <Badge variant="secondary" className="text-xs">{temperature.toFixed(1)}</Badge>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full mt-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                0 = Deterministic, 2 = Creative. Higher values increase randomness.
              </p>
            </div>
          </CardContent>
        </Card>

        <ToolApiKeyInput
          value={apiKeyConfig}
          onChange={setApiKeyConfig}
          showLabel={true}
          tooltip="Your API key for the selected LLM provider"
        />
      </div>

      <div className="p-4 border-t bg-white shadow-lg">
        <Button
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
          onClick={handleSave}
          disabled={saving}
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
        <p className="text-xs text-gray-500 text-center mt-2">Save to apply changes to this node</p>
      </div>
    </div>
  );
};

export default LLMToolSettings;
