import { Braces, CheckCircle, Copy, FileJson, Key, Settings, Shield } from "lucide-react";
import { JWTHeader } from "../../../types/JwtTypes";
import ClaimCard from "./ClaimCard";
import Accordion from "../../../components/Accordion";
import { getClaimIcon, getClaimLabel } from "../utils/utils";
import { Button } from "../../../components/Button";

const HeaderSection: React.FC<{
  header: JWTHeader;
  copied: boolean;
  onCopy: (text: string) => void;
}> = ({ header, copied, onCopy }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {header.alg && (
        <ClaimCard
          label="Algorithm"
          value={header.alg}
          icon={<Shield className="w-4 h-4" />}
          variant="warning"
        />
      )}
      {header.typ && (
        <ClaimCard
          label="Type"
          value={header.typ}
          icon={<FileJson className="w-4 h-4" />}
        />
      )}
      {header.kid && (
        <ClaimCard
          label="Key ID"
          value={header.kid}
          icon={<Key className="w-4 h-4" />}
        />
      )}
    </div>

    {/* Additional header claims */}
    {Object.keys(header).filter(key => !['alg', 'typ', 'kid'].includes(key)).length > 0 && (
      <Accordion
        title="Additional Header Claims" 
        icon={<Settings className="w-4 h-4" />}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(header)
            .filter(([key]) => !['alg', 'typ', 'kid'].includes(key))
            .map(([key, value]) => (
              <ClaimCard
                key={key}
                label={getClaimLabel(key)}
                value={value}
                icon={getClaimIcon(key)}
              />
            ))}
        </div>
      </Accordion>
    )}

    <Accordion 
      title="Raw JSON" 
      icon={<Braces className="w-4 h-4" />}
    >
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm font-medium text-gray-700">Complete Header</span>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => onCopy(JSON.stringify(header, null, 2))}
        >
          {copied ? <CheckCircle className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </div>
      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto text-sm font-mono">
        {JSON.stringify(header, null, 2)}
      </pre>
    </Accordion>
  </div>
);

export default HeaderSection;