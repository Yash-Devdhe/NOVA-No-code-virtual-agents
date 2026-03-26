"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Edit3 } from 'lucide-react';

interface CustomTool {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  apiEndpoint: string;
}

export function CustomToolsManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<CustomTool | null>(null);
  const [newToolName, setNewToolName] = useState('');
  const [newToolDesc, setNewToolDesc] = useState('');
  const [newToolEndpoint, setNewToolEndpoint] = useState('');

  const [tools, setTools] = useState<CustomTool[]>([]);


  const handleSave = () => {
    if (!newToolName || !newToolDesc || !newToolEndpoint) return;

    if (editingTool) {
      setTools(tools.map(t => t.id === editingTool.id 
        ? { ...t, name: newToolName, description: newToolDesc, apiEndpoint: newToolEndpoint }
        : t));
    } else {
      const newTool: CustomTool = {
        id: crypto.randomUUID(),
        name: newToolName,
        description: newToolDesc,
        enabled: true,
        apiEndpoint: newToolEndpoint
      };
      setTools([...tools, newTool]);
    }

    setIsDialogOpen(false);
    setEditingTool(null);
    setNewToolName('');
    setNewToolDesc('');
    setNewToolEndpoint('');
  };

  const handleEdit = (tool: CustomTool) => {
    setEditingTool(tool);
    setNewToolName(tool.name);
    setNewToolDesc(tool.description);
    setNewToolEndpoint(tool.apiEndpoint);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setTools(tools.filter(t => t.id !== id));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Custom Tools Manager</CardTitle>
      </CardHeader>
      <CardContent>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="mb-4">
              <Plus className="mr-2 h-4 w-4" />
              Add Tool
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTool ? 'Edit Tool' : 'Add New Tool'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newToolName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewToolName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="desc">Description</Label>
                <Input
                  id="desc"
                  value={newToolDesc}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewToolDesc(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="endpoint">API Endpoint</Label>
                <Input
                  id="endpoint"
                  value={newToolEndpoint}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewToolEndpoint(e.target.value)}
                  placeholder="https://api.example.com/tool"
                />
              </div>
              <Button onClick={handleSave} className="w-full">
                Save Tool
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <div className="space-y-3">
          {tools.map((tool) => (
            <div key={tool.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-semibold">{tool.name}</h3>
                <p className="text-sm text-muted-foreground">{tool.description}</p>
                <Badge variant={tool.enabled ? 'default' : 'secondary'} className="mt-1">
                  {tool.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
              <Switch
                  checked={tool.enabled}
                  onCheckedChange={(checked: boolean) => {
                    setTools(tools.map(t => t.id === tool.id ? { ...t, enabled: checked } : t));
                  }}
                />
                <Button variant="ghost" size="sm" onClick={() => handleEdit(tool)}>
                  <Edit3 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(tool.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {tools.length === 0 && (
            <p className="text-muted-foreground text-center py-8">No custom tools yet. Add one above!</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

