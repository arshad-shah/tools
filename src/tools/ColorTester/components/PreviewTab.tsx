import React, { useState } from 'react';
import { Eye, Monitor, Smartphone, Tablet, Layout, Layers } from 'lucide-react';

interface PreviewTabProps {
  rgbString: string;
  textColor: string;
}

const PreviewTab: React.FC<PreviewTabProps> = ({ 
  rgbString, 
  textColor 
}) => {
  const [previewMode, setPreviewMode] = useState<'text' | 'ui' | 'elements'>('text');
  const [deviceView, setDeviceView] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  return (
    <div className="space-y-6">
      <div className="flex items-center mb-2">
        <Eye size={18} className="mr-2 text-indigo-500" />
        <h2 className="text-xl font-medium text-gray-800">Visual Preview</h2>
        <span className="ml-auto px-3 py-1 bg-cyan-100 text-cyan-700 rounded-full text-xs font-medium">
          Design Test
        </span>
      </div>
      
      {/* Preview Type Selector */}
      <div className="flex space-x-2 mb-4">
        <button 
          onClick={() => setPreviewMode('text')}
          className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center ${
            previewMode === 'text' 
              ? 'bg-indigo-100 text-indigo-700' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <span className="mr-1.5 text-xs">Aa</span>
          Text
        </button>
        
        <button 
          onClick={() => setPreviewMode('ui')}
          className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center ${
            previewMode === 'ui' 
              ? 'bg-indigo-100 text-indigo-700' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Layout size={14} className="mr-1.5" />
          UI Components
        </button>
        
        <button 
          onClick={() => setPreviewMode('elements')}
          className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center ${
            previewMode === 'elements' 
              ? 'bg-indigo-100 text-indigo-700' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Layers size={14} className="mr-1.5" />
          Elements
        </button>
        
        {/* Device Selector (only for UI mode) */}
        {previewMode === 'ui' && (
          <div className="ml-auto flex bg-gray-100 rounded-lg p-1">
            <button 
              onClick={() => setDeviceView('desktop')}
              className={`p-1.5 rounded ${deviceView === 'desktop' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
              title="Desktop view"
            >
              <Monitor size={16} />
            </button>
            
            <button 
              onClick={() => setDeviceView('tablet')}
              className={`p-1.5 rounded ${deviceView === 'tablet' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
              title="Tablet view"
            >
              <Tablet size={16} />
            </button>
            
            <button 
              onClick={() => setDeviceView('mobile')}
              className={`p-1.5 rounded ${deviceView === 'mobile' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
              title="Mobile view"
            >
              <Smartphone size={16} />
            </button>
          </div>
        )}
      </div>
      
      {/* Preview Content Area */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
        {/* Text Preview */}
        {previewMode === 'text' && (
          <div 
            className="p-8"
            style={{ backgroundColor: rgbString }}
          >
            <div className="max-w-2xl mx-auto space-y-6">
              <h1 
                style={{ color: textColor }} 
                className="text-3xl font-bold"
              >
                Heading 1 - Main Title
              </h1>
              
              <h2 
                style={{ color: textColor }} 
                className="text-2xl font-semibold"
              >
                Heading 2 - Section Title
              </h2>
              
              <p 
                style={{ color: textColor }} 
                className="text-base"
              >
                This is a paragraph of text that shows how body content will appear on this background. 
                Good contrast ensures readability and proper hierarchy in your design. 
                This preview helps you determine if the selected color works well with text.
              </p>
              
              <div className="flex flex-wrap gap-3 pt-2">
                <button 
                  className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.2)', 
                    color: textColor, 
                    border: `1px solid rgba(${textColor === '#ffffff' ? '255, 255, 255' : '0, 0, 0'}, 0.1)` 
                  }}
                >
                  Primary Button
                </button>
                
                <button 
                  className="px-4 py-2 rounded-lg text-sm font-medium border"
                  style={{ 
                    color: textColor, 
                    borderColor: `rgba(${textColor === '#ffffff' ? '255, 255, 255' : '0, 0, 0'}, 0.2)` 
                  }}
                >
                  Secondary Button
                </button>
                
                <a 
                  href="#" 
                  className="px-4 py-2 text-sm font-medium"
                  style={{ color: textColor, textDecoration: 'underline' }}
                >
                  Text Link
                </a>
              </div>
            </div>
          </div>
        )}
        
        {/* UI Components Preview */}
        {previewMode === 'ui' && (
          <div 
            className="p-6"
            style={{ backgroundColor: rgbString }}
          >
            <div className={`
              mx-auto bg-white/20 backdrop-blur-md rounded-xl p-6 border border-white/10 shadow-lg
              ${deviceView === 'desktop' ? 'max-w-3xl' : deviceView === 'tablet' ? 'max-w-md' : 'max-w-xs'}
            `}>
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-8 h-8 rounded-full"
                    style={{ backgroundColor: rgbString }}
                  ></div>
                  <h3 style={{ color: textColor }} className="font-semibold">ColorTester App</h3>
                </div>
                
                <div className="flex space-x-1">
                  <div className="w-3 h-3 bg-red-500 rounded-full opacity-80"></div>
                  <div className="w-3 h-3 bg-amber-500 rounded-full opacity-80"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full opacity-80"></div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label 
                    style={{ color: textColor }} 
                    className="block text-sm font-medium mb-1"
                  >
                    Username
                  </label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 rounded-lg bg-white/20 border border-white/30"
                    style={{ color: textColor }}
                    placeholder="Enter your username"
                  />
                </div>
                
                <div>
                  <label 
                    style={{ color: textColor }} 
                    className="block text-sm font-medium mb-1"
                  >
                    Password
                  </label>
                  <input 
                    type="password" 
                    className="w-full px-3 py-2 rounded-lg bg-white/20 border border-white/30"
                    style={{ color: textColor }}
                    placeholder="••••••••"
                  />
                </div>
                
                <div className="pt-2 flex justify-end">
                  <button 
                    className="px-4 py-2 rounded-lg text-sm font-medium"
                    style={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.25)', 
                      color: textColor, 
                      border: `1px solid rgba(${textColor === '#ffffff' ? '255, 255, 255' : '0, 0, 0'}, 0.1)` 
                    }}
                  >
                    Sign In
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Elements Preview */}
        {previewMode === 'elements' && (
          <div 
            className="p-6"
            style={{ backgroundColor: rgbString }}
          >
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {/* Cards */}
              <div 
                className="rounded-xl p-4 shadow-md"
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.15)', 
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
              >
                <h3 style={{ color: textColor }} className="font-medium mb-1">Glass Card</h3>
                <p style={{ color: textColor }} className="text-sm opacity-80">A glass morphism style element</p>
              </div>
              
              {/* Badge */}
              <div className="flex items-center justify-center">
                <div
                  className="rounded-full px-3 py-1 text-sm inline-flex items-center"
                  style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.2)', 
                    color: textColor
                  }}
                >
                  <span className="w-2 h-2 rounded-full bg-green-500 mr-1.5"></span>
                  Status Badge
                </div>
              </div>
              
              {/* Alert */}
              <div
                className="rounded-lg p-3 border-l-4"
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.1)', 
                  borderLeftColor: textColor === '#ffffff' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)',
                  color: textColor
                }}
              >
                <p className="text-sm">Alert message here</p>
              </div>
              
              {/* Toggle */}
              <div className="flex items-center justify-center">
                <div
                  className="w-12 h-6 rounded-full relative flex items-center cursor-pointer"
                  style={{ 
                    backgroundColor: textColor === '#ffffff' 
                      ? 'rgba(255, 255, 255, 0.3)' 
                      : 'rgba(0, 0, 0, 0.3)'
                  }}
                >
                  <div
                    className="w-5 h-5 rounded-full absolute right-0.5 shadow-md"
                    style={{ 
                      backgroundColor: textColor === '#ffffff' 
                        ? 'rgba(255, 255, 255, 0.9)' 
                        : 'rgba(0, 0, 0, 0.9)'
                    }}
                  ></div>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="flex items-center justify-center">
                <div className="w-full h-2 rounded-full overflow-hidden bg-white/20">
                  <div 
                    className="h-full rounded-full"
                    style={{ 
                      width: '65%',
                      backgroundColor: textColor === '#ffffff' 
                        ? 'rgba(255, 255, 255, 0.8)' 
                        : 'rgba(0, 0, 0, 0.8)'
                    }}
                  ></div>
                </div>
              </div>
              
              {/* Chip */}
              <div className="flex items-center justify-center">
                <div
                  className="rounded-full px-3 py-1 text-xs inline-flex items-center"
                  style={{ 
                    backgroundColor: textColor === '#ffffff' 
                      ? 'rgba(255, 255, 255, 0.2)' 
                      : 'rgba(0, 0, 0, 0.2)',
                    color: textColor,
                    border: `1px solid ${textColor === '#ffffff' 
                      ? 'rgba(255, 255, 255, 0.3)' 
                      : 'rgba(0, 0, 0, 0.3)'}`
                  }}
                >
                  Tag
                  <span className="ml-1 text-xs">×</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Tip */}
      <div className="p-4 bg-gradient-to-r from-cyan-50 to-indigo-50 rounded-xl border border-cyan-100">
        <p className="text-sm text-gray-700">
          <span className="font-medium text-cyan-700">Design tip: </span>
          Consider both light and dark text options on your selected color to achieve the optimal readability.
          WCAG guidelines recommend a contrast ratio of at least 4.5:1 for normal text and 3:1 for large text.
        </p>
      </div>
    </div>
  );
};

export default PreviewTab;