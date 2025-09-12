import { CheckCircle, Copy, FileJson, Lock, RefreshCw, Trash2 } from "lucide-react";
import { Card } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { Textarea } from "../../../components/textarea";

const TokenInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  onDecode: () => void;
  onClear: () => void;
  onSample: () => void;
  copied: boolean;
  onCopy: () => void;
}> = ({ value, onChange, onDecode, onClear, onSample, copied, onCopy }) => (
  <Card className="mb-6">
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <label className="text-sm font-semibold text-gray-900 flex items-center">
          <Lock className="w-5 h-5 text-pink-600 mr-2" />
          JWT Token
        </label>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onSample} leftIcon={<FileJson className="w-4 h-4 mr-1" />}>
            Sample
          </Button>
          <Button variant="ghost" size="sm" onClick={onCopy} leftIcon={copied ? <CheckCircle className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}>
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
      </div>
      
        <Textarea
                  className="w-full p-4 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-sm font-mono resize-none transition-all"
          rows={4}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste your JWT token here..."
          />
      
      <div className="flex gap-3 mt-4">
        <Button onClick={onDecode} className="flex-1" leftIcon={<RefreshCw className="w-4 h-4 mr-2" />}>
          Decode Token
        </Button>
        <Button variant="secondary" onClick={onClear} leftIcon={<Trash2 className="w-4 h-4 mr-2" />}>
          Clear
        </Button>
      </div>
    </div>
  </Card>
);
export default TokenInput;