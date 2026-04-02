"use client";

import React, { useState, useContext } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { UserDetailContext } from '@/context/UserDetailsContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Edit3, Bot, Layers } from 'lucide-react';
import type { CustomTool } from '../../../types/agent-builder';
import { useToast } from '@/components/ui/use-toast';
import { ToolApiKeyInput } from '@/components/toolsettings/ToolApiKeyInput';

interface ApiKeyConfig {
  useApiKey: boolean;
  apiKey: string;
  authType: 'bearer' | 'api-key' | 'query' | 'custom';
  customHeaderName?: string;
}

interface CustomToolForm {
  id: string;
  name: string;
  description: string;
  apiUrl: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  paramsSchema: string;
  apiKeyConfig: ApiKeyConfig;
}

interface CustomToolsManagerProps {
  agentId: string;
  triggerButton?: React.ReactNode;
}

export default function CustomToolsManager({ agentId, triggerButton }: CustomToolsManagerProps) {
  const { userDetail } = useContext(UserDetailContext);
  const userId = userDetail?._id as Id<'UserTable'>;
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingToolId, setEditingToolId] = useState('');
  const [form, setForm] = useState<CustomToolForm>({
    id: '',
    name: '',
    description: '',
    apiUrl: '',
    method: 'GET',
    paramsSchema: '{}',
    apiKeyConfig: {
      useApiKey: false,
      apiKey: '',
      authType: 'bearer' as const,
    },
  });

  const addTool = useMutation(api.agent.AddCustomTool);
  const updateTool = useMutation(api.agent.UpdateCustomTool);
  const removeTool = useMutation(api.agent.RemoveCustomTool);
  const tools = (useQuery(api.agent.GetAgentCustomTools, { agentId }) || []) as CustomTool[];
  const { toast } = useToast();

  const resetForm = () => {
    setForm({
      id: `tool-${Date.now()}`,
      name: '',
      description: '',
      apiUrl: '',
      method: 'GET',
      paramsSchema: '{}',
      apiKeyConfig: {
        useApiKey: false,
        apiKey: '',
        authType: 'bearer' as const,
      },
    });
    setEditMode(false);
    setEditingToolId('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      toast({
        title: 'Login required',
        description: 'Please sign in to manage custom tools.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const toolPayload = {
        id: form.id.trim(),
        name: form.name.trim(),
        description: form.description.trim(),
        apiUrl: form.apiUrl.trim() || undefined,
        method: form.method,
        paramsSchema: form.paramsSchema.trim()
          ? JSON.parse(form.paramsSchema)
          : {},
        apiKeyConfig: form.apiKeyConfig.useApiKey ? form.apiKeyConfig : undefined,
      };

      if (editMode) {
        await updateTool({
          agentId,
          userId,
          toolId: editingToolId,
          tool: toolPayload,
        });
      } else {
        await addTool({ agentId, userId, tool: toolPayload });
      }

      toast({
        title: 'Success',
        description: editMode ? `${form.name} tool updated.` : `${form.name} tool added.`,
      });
      resetForm();
      setOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save tool.',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (tool: CustomTool) => {
    setForm({
      id: tool.id,
      name: tool.name,
      description: tool.description,
      apiUrl: tool.apiUrl || '',
      method: tool.method as any || 'GET',
      paramsSchema: JSON.stringify(tool.paramsSchema || {}, null, 2),
      apiKeyConfig: {
        useApiKey: !!tool.apiKeyConfig?.useApiKey || !!tool.apiKey,
        apiKey: (tool.apiKeyConfig as any)?.apiKey || tool.apiKey || '',
        authType: (tool.apiKeyConfig as any)?.authType || 'bearer' as any,
        customHeaderName: (tool.apiKeyConfig as any)?.customHeaderName || '',
      },
    });
    setEditMode(true);
    setEditingToolId(tool.id);
    setOpen(true);
  };

  const handleRemove = async (toolId: string) => {
    if (!userId) return;
    try {
      await removeTool({ agentId, userId, toolId });
      toast({
        title: 'Success',
        description: 'Tool removed.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to remove tool.',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      {triggerButton ? (
        <div
          className="inline-flex"
          onClick={() => {
            resetForm();
            setOpen(true);
          }}
        >
          {triggerButton}
        </div>
      ) : (
        <Button onClick={() => {
          resetForm();
          setOpen(true);
        }} className="gap-2">
          <Layers className="h-4 w-4" />
          Manage Tools
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editMode ? 'Edit Tool' : 'Add Custom Tool'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="id">Tool ID</Label>
                <Input
                  id="id"
                  value={form.id}
                  onChange={(e) => setForm({ ...form, id: e.target.value })}
                  placeholder="my-api-tool"
                />
              </div>
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="My API Tool"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Fetches data from my API"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="method">HTTP Method</Label>
                <Select value={form.method} onValueChange={(value) => setForm({ ...form, method: value as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="apiUrl">API URL</Label>
                <Input
                  id="apiUrl"
                  value={form.apiUrl}
                  onChange={(e) => setForm({ ...form, apiUrl: e.target.value })}
                  placeholder="https://api.example.com/data"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="paramsSchema">Params Schema (JSON)</Label>
              <Input
                id="paramsSchema"
                value={form.paramsSchema}
                onChange={(e) => setForm({ ...form, paramsSchema: e.target.value })}
                placeholder='{"query": "string"}'
              />
            </div>
            <ToolApiKeyInput
              value={form.apiKeyConfig}
              onChange={(config) => setForm({ ...form, apiKeyConfig: config })}
              tooltip="OpenWeatherMap: use 'Query' auth type with appid key"
            />
            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                {editMode ? 'Update Tool' : 'Add Tool'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>

          {/* Tools List */}
          {tools.length > 0 && (
            <div className="mt-8">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <Bot className="h-4 w-4" />
                Current Custom Tools ({tools.length})
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {tools.map((tool) => (
                  <div key={tool.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Layers className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium">{tool.name}</div>
                        <div className="text-sm text-slate-500">{tool.description}</div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        type="button"
                        onClick={() => handleEdit(tool)}
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        type="button"
                        onClick={() => handleRemove(tool.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
