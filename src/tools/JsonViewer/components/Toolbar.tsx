import React from 'react';
import { Button } from "../../../components/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/select";
import { Input } from "../../../components/input";
import { Search, FileJson, Code2, Download, Wand2, X } from "lucide-react";
import { cn } from "../../../lib/utils";

interface ToolbarProps {
  format: 'json' | 'xml';
  setFormat: (value: 'json' | 'xml') => void;
  handleParse: () => void;
  formatCode: () => void;
  handleDownload: () => void;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  format,
  setFormat,
  handleParse,
  formatCode,
  handleDownload,
  searchTerm,
  setSearchTerm,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-transparent bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-pink-500/10 backdrop-blur-sm shadow-lg">
      <Select
        value={format}
        onValueChange={(value) => setFormat(value as 'json' | 'xml')}
      >
        <SelectTrigger className="w-[120px] bg-white/20 backdrop-blur-md border-violet-200 shadow-inner shadow-violet-100">
          <SelectValue placeholder="Format" />
        </SelectTrigger>
        <SelectContent className="bg-white/90 backdrop-blur-lg border-violet-200">
          <SelectItem value="json" className="hover:bg-indigo-50 focus:bg-indigo-50">
            <div className="flex items-center gap-2">
              <FileJson className="w-4 h-4 text-indigo-600" />
              <span className="font-medium">JSON</span>
            </div>
          </SelectItem>
          <SelectItem value="xml" className="hover:bg-purple-50 focus:bg-purple-50">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-purple-600" />
              <span className="font-medium">XML</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      <div className="flex gap-2">
        <Button 
          onClick={handleParse}
          className="gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white border-none shadow-md shadow-indigo-200 hover:shadow-lg transition-all duration-300"
        >
          <Wand2 className="w-4 h-4" />
          Parse
        </Button>
        
        <Button
          onClick={formatCode}
          variant="secondary"
          className="gap-2 bg-gradient-to-r from-purple-50 to-violet-50 text-purple-700 border border-purple-200 shadow-sm hover:shadow-md hover:bg-purple-100 transition-all duration-300"
        >
          <Code2 className="w-4 h-4" />
          Format
        </Button>
        
        <Button
          onClick={handleDownload}
          variant="outline"
          className="gap-2 bg-white/50 backdrop-blur-sm border-pink-200 text-pink-700 hover:bg-pink-50 hover:border-pink-300 shadow-sm transition-all duration-300"
        >
          <Download className="w-4 h-4" />
          Download
        </Button>
      </div>

      <div className="flex-1 relative group">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-indigo-400 group-focus-within:text-indigo-600 transition-colors" size={16} />
        <Input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={cn(
            "pl-9 bg-white/30 backdrop-blur-sm border-violet-100 shadow-inner focus:border-violet-300 focus:ring focus:ring-violet-200 focus:ring-opacity-50 transition-all duration-300",
            searchTerm && "pr-9"  // Add padding for clear button when there's text
          )}
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors duration-200"
          >
            <X size={14} className="hover:scale-110 transition-transform" />
          </button>
        )}
      </div>
    </div>
  );
};

export default Toolbar;