import React, { useState } from 'react';
import { Button } from "../../../components/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/select";
import { Input } from "../../../components/input";
import { Search, FileJson, Code2, Download, Wand2, X, Menu, Columns, MonitorIcon, List, Network } from "lucide-react";
import { cn } from "../../../lib/utils";
import { Toggle } from "../../../components/toggle";

interface ToolbarProps {
  format: 'json' | 'xml';
  setFormat: (value: 'json' | 'xml') => void;
  handleParse: () => void;
  formatCode: () => void;
  handleDownload: () => void;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  layout: 'split' | 'single';
  setLayout: (value: 'split' | 'single') => void;
  viewMode: 'tree' | 'network';
  setViewMode: (value: 'tree' | 'network') => void;
  activePane: 'editor' | 'view';
  setActivePane: (value: 'editor' | 'view') => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  format,
  setFormat,
  handleParse,
  formatCode,
  handleDownload,
  searchTerm,
  setSearchTerm,
  layout,
  setLayout,
  viewMode,
  setViewMode,
  activePane,
  setActivePane
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="relative w-full">
      {/* Main toolbar container with glass morphism effect */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 p-4 rounded-2xl border border-cyan-100/30 bg-white/10 backdrop-blur-md shadow-lg">
        {/* Mobile Toggle Button - Only visible on small screens */}
        <div className="flex justify-between items-center sm:hidden mb-2">
          <div className="font-semibold text-cyan-800">JSON/XML Toolkit</div>
          <Button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            variant="ghost"
            className="p-1 text-cyan-600 hover:bg-cyan-50 rounded-lg"
          >
            <Menu size={20} />
          </Button>
        </div>

        {/* First Row - Format Selector and View Controls */}
        <div className={cn(
          "transition-all duration-300 ease-in-out flex flex-col sm:flex-row gap-3",
          mobileMenuOpen ? "max-h-96 opacity-100" : "sm:max-h-96 sm:opacity-100 max-h-0 opacity-0 overflow-hidden",
          "sm:overflow-visible sm:block"
        )}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Format Selector */}
            <Select
              value={format}
              onValueChange={(value) => setFormat(value as 'json' | 'xml')}
            >
              <SelectTrigger className="w-full sm:w-[140px] bg-white/70 backdrop-blur-md border-cyan-200 hover:border-cyan-400 rounded-xl shadow text-cyan-800 font-medium">
                <div className="flex items-center gap-2">
    
                  <SelectValue placeholder="Format" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-white/95 backdrop-blur-lg border-cyan-200 rounded-xl shadow-xl">
                <SelectItem value="json" className="hover:bg-cyan-50 focus:bg-cyan-50 rounded-lg my-1">
                  <div className="flex items-center gap-2">
                    <FileJson className="w-4 h-4 text-cyan-600" />
                    <span className="font-medium">JSON</span>
                  </div>
                </SelectItem>
                <SelectItem value="xml" className="hover:bg-teal-50 focus:bg-teal-50 rounded-lg my-1">
                  <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-teal-600" />
                    <span className="font-medium">XML</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            <div className="flex flex-row sm:flex-row items-start sm:items-center gap-3">
              {/* Layout Controls */}
            <div className="flex items-center space-x-1 rounded-xl border border-cyan-200 bg-white/70 shadow">
              <Toggle 
                pressed={layout === 'split'} 
                onPressedChange={() => setLayout('split')}
                className="p-2 data-[state=on]:bg-cyan-100 data-[state=on]:text-cyan-700"
              >
                <Columns className="w-4 h-4" />
              </Toggle>
              <Toggle 
                pressed={layout === 'single'} 
                onPressedChange={() => setLayout('single')}
                className="p-2 data-[state=on]:bg-cyan-100 data-[state=on]:text-cyan-700"
              >
                <MonitorIcon className="w-4 h-4" />
              </Toggle>
            </div>

            {/* Active Pane Controls - Visible only when in single layout */}
            {layout === 'single' && (
              <div className="flex items-center space-x-1 rounded-xl border border-cyan-200 bg-white/70 shadow">
                <Toggle 
                  pressed={activePane === 'editor'} 
                  onPressedChange={() => setActivePane('editor')}
                  className="px-3 py-2 data-[state=on]:bg-cyan-100 data-[state=on]:text-cyan-700"
                >
                  <span className="text-sm font-medium">Editor</span>
                </Toggle>
                <Toggle 
                  pressed={activePane === 'view'} 
                  onPressedChange={() => setActivePane('view')}
                  className="px-3 py-2 data-[state=on]:bg-cyan-100 data-[state=on]:text-cyan-700"
                >
                  <span className="text-sm font-medium">View</span>
                </Toggle>
              </div>
            )}

            {/* View Mode Controls */}
            <div className="flex items-center space-x-1 rounded-xl border border-cyan-200 bg-white/70 shadow">
              <Toggle 
                pressed={viewMode === 'tree'} 
                onPressedChange={() => setViewMode('tree')}
                className="p-2 data-[state=on]:bg-cyan-100 data-[state=on]:text-cyan-700"
              >
                <List className="w-4 h-4" />
              </Toggle>
              <Toggle 
                pressed={viewMode === 'network'} 
                onPressedChange={() => setViewMode('network')}
                className="p-2 data-[state=on]:bg-cyan-100 data-[state=on]:text-cyan-700"
              >
                <Network className="w-4 h-4" />
              </Toggle>
            </div>

            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className={cn(
          "flex flex-col sm:flex-row gap-2 transition-all duration-300 ease-in-out",
          mobileMenuOpen ? "max-h-96 opacity-100" : "sm:max-h-96 sm:opacity-100 max-h-0 opacity-0 overflow-hidden",
          "sm:overflow-visible"
        )}>
          <Button 
            onClick={handleParse}
            className="gap-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white border-none shadow-md hover:shadow-lg transition-all duration-300 rounded-xl font-medium"
          >
            <Wand2 className="w-4 h-4" />
            Parse
          </Button>
          
          <Button
            onClick={formatCode}
            variant="secondary"
            className="gap-2 bg-white/70 text-cyan-700 border border-cyan-200 shadow-sm hover:shadow-md hover:bg-cyan-50 transition-all duration-300 rounded-xl font-medium"
          >
            <Code2 className="w-4 h-4" />
            Format
          </Button>
          
          <Button
            onClick={handleDownload}
            variant="outline"
            className="gap-2 bg-white/50 backdrop-blur-sm border-cyan-200 text-cyan-700 hover:bg-cyan-50 hover:border-cyan-300 shadow-sm transition-all duration-300 rounded-xl font-medium"
          >
            <Download className="w-4 h-4" />
            Download
          </Button>
        </div>

        {/* Search Bar */}
        <div className={cn(
          "flex-1 relative group transition-all duration-300 ease-in-out",
          mobileMenuOpen ? "max-h-96 opacity-100" : "sm:max-h-96 sm:opacity-100 max-h-0 opacity-0 overflow-hidden",
          "sm:overflow-visible"
        )}>
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyan-400 group-focus-within:text-cyan-600 transition-colors" size={16} />
          <Input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={cn(
              "pl-9 h-10 bg-white/50 backdrop-blur-sm border-cyan-100 rounded-xl shadow-sm focus:border-cyan-300 focus:ring focus:ring-cyan-200 focus:ring-opacity-20 transition-all duration-300 w-full",
              searchTerm && "pr-9"
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

      {/* Floating indicator for current format - visible at all screen sizes */}
      <div className="absolute -top-2 right-4 px-3 py-1 rounded-full bg-cyan-500 text-white text-xs font-bold shadow-lg flex items-center gap-1.5">
        {format === 'json' ? 
          <><FileJson className="w-3 h-3" /> JSON</> : 
          <><Code2 className="w-3 h-3" /> XML</>
        }
      </div>
    </div>
  );
};

export default Toolbar;