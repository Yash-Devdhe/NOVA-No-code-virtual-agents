"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Copy, Check, Download, FileCode } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generateAgentCode } from "@/lib/codeGenerator";

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
  agentName?: string;
  nodes?: any[];
  apiKeys?: Record<string, string>;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  onChange,
  agentName = "MyAgent",
  nodes = [],
}) => {
  const [copied, setCopied] = useState(false);
  const [language, setLanguage] = useState("javascript");
  const [showGenerate, setShowGenerate] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const extensions: Record<string, string> = {
      javascript: "js",
      python: "py",
      typescript: "ts",
    };

    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${agentName.toLowerCase().replace(/\s+/g, "_")}_agent.${extensions[language]}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRun = () => {
    alert("Use the downloaded/generated file in a real terminal with node. The in-browser Run button is only a placeholder.");
  };

  const generateCode = () => {
    const generatedCode = generateAgentCode(nodes, [], "custom", {
      agentName,
      settings: {
        codeLanguage: language === "typescript" ? "typescript" : "javascript",
      },
    });

    onChange(generatedCode);
    setShowGenerate(false);
  };

  const lineNumbers = code.split("\n").map((_, i) => i + 1);

  return (
    <div className="h-full flex flex-col bg-gray-900">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <span className="text-gray-400 text-sm ml-2">
            custom-agent.{language === "javascript" ? "js" : language === "python" ? "py" : "ts"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-32 h-7 bg-gray-700 border-gray-600 text-gray-300 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="javascript">JavaScript</SelectItem>
              <SelectItem value="python">Python</SelectItem>
              <SelectItem value="typescript">TypeScript</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowGenerate(!showGenerate)}
            className="text-gray-400 hover:text-white"
          >
            <FileCode className="h-4 w-4 mr-1" />
            Generate
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="text-gray-400 hover:text-white"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="text-gray-400 hover:text-white"
          >
            <Download className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleRun}
            className="text-gray-400 hover:text-white"
          >
            <Play className="h-4 w-4 mr-1" />
            Run
          </Button>
        </div>
      </div>

      {showGenerate && (
        <div className="bg-gray-800 border-b border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-gray-300 text-sm font-medium">Generate Agent Code</h4>
              <p className="text-gray-500 text-xs">Generate terminal-friendly agent code from your flow</p>
            </div>
            <Button size="sm" onClick={generateCode} className="bg-blue-600 hover:bg-blue-700">
              <FileCode className="h-4 w-4 mr-1" />
              Generate Code
            </Button>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Language: {language} | Nodes: {nodes.length} | Agent: {agentName}
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <div className="w-12 bg-gray-800 border-r border-gray-700 text-right py-4">
          {lineNumbers.map((num) => (
            <div key={num} className="text-gray-500 text-sm pr-2 leading-6 font-mono">
              {num}
            </div>
          ))}
        </div>

        <textarea
          value={code}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-gray-900 text-gray-100 p-4 font-mono text-sm leading-6 resize-none focus:outline-none"
          spellCheck={false}
          placeholder="// Write your custom agent code here..."
        />
      </div>

      <div className="px-4 py-2 bg-gray-800 border-t border-gray-700 flex items-center justify-between">
        <span className="text-gray-500 text-xs">
          {language === "javascript" ? "JavaScript" : language === "python" ? "Python" : "TypeScript"} • UTF-8 • {code.split("\n").length} lines
        </span>
        <div className="flex items-center gap-4">
          <span className="text-gray-500 text-xs">Ln 1, Col 1</span>
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;
