import { Copy, FileUp, RotateCcw, Sparkles } from "lucide-react";
import Button from "./Button";
import GlassCard from "./GlassCard";

const TextArea: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  disabled?: boolean;
  onFileUpload?: () => void;
  onCopy?: () => void;
  onClear?: () => void;
}> = ({ value, onChange, placeholder, label, disabled, onFileUpload, onCopy, onClear }) => (
  <GlassCard className="flex flex-col h-full">
    <div className="flex items-center justify-between p-4 border-b border-white/10">
      <h3 className="text-lg font-semibold text-white flex items-center">
        <Sparkles className="w-5 h-5 mr-2 text-violet-400" />
        {label}
      </h3>
      <div className="flex space-x-2">
        {onFileUpload && (
          <label className="cursor-pointer">
            <Button variant="ghost" size="sm" disabled={disabled} title="Upload file" onClick={() => onFileUpload()}>
              <FileUp className="h-4 w-4" />
            </Button>
          </label>
        )}
        {onCopy && (
          <Button variant="ghost" size="sm" onClick={onCopy} disabled={!value || disabled} title="Copy to clipboard">
            <Copy className="h-4 w-4" />
          </Button>
        )}
        {onClear && (
          <Button variant="ghost" size="sm" onClick={onClear} disabled={!value || disabled} title="Clear">
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
    <textarea
      className="flex-1 p-4 bg-transparent text-white placeholder-white/50 border-0 focus:outline-none resize-none font-mono text-sm leading-relaxed"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      spellCheck={false}
    />
  </GlassCard>
);

export default TextArea;