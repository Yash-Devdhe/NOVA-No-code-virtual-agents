export interface CustomTool {
  id: string;
  name: string;
  description: string;
  apiUrl?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  paramsSchema?: any;
  apiKey?: string;
  apiKeyConfig?: {
    useApiKey: boolean;
    apiKey: string;
    authType: 'bearer' | 'api-key' | 'query' | 'custom';
    customHeaderName?: string;
  };
}

export interface ToolNode {
  id: string;
  type: 'start' | 'end' | 'if' | 'else' | 'while' | 'for' | 'agent' | 'llm' | 'code' | 'workflow' | 'edge' | 'api' | 'userApproval' | 'custom';
  position: { x: number; y: number };
  config?: {
    name?: string;
    apiPath?: string;
    apiKey?: string;
    toolId?: string; // for custom tools
    [key: string]: any;
  };
}

export interface EdgeNode {
  id: string;
  source: string;
  target: string;
  type?: string;
}

export interface NodeData {
  label: string;
  type: ToolNode['type'];
  config?: Record<string, any>;
  [key: string]: unknown;
}

// React Flow compatibility types
export type RFNode = {
  id: string;
  type: 'default';
  position: { x: number; y: number };
  data: NodeData;
  selected?: boolean;
};

export type RFEdge = {
  id: string;
  source: string;
  target: string;
  type: string;
  animated?: boolean;
  style?: React.CSSProperties;
  data?: { label?: string };
};

