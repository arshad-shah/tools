import { AlertCircle, CheckCircle } from "lucide-react";
import { Card } from "../../../components/Card";
import { ExpiryInfo } from "../../../types/JwtTypes";
import { formatTime } from "../utils/utils";
import { Badge } from "../../../components/Badge";

const ExpiryStatus: React.FC<{ expiryInfo: ExpiryInfo; exp?: number }> = ({ 
  expiryInfo, 
  exp 
}) => {
  if (!exp) return null;
  
  return (
    <Card className={`mb-6 border-l-4 ${
      expiryInfo.isExpired 
        ? 'border-red-500 bg-red-50' 
        : 'border-green-500 bg-green-50'
    }`}>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {expiryInfo.isExpired 
              ? <AlertCircle className="w-6 h-6 text-red-500 mr-3" />
              : <CheckCircle className="w-6 h-6 text-green-500 mr-3" />
            }
            <div>
              <div className={`font-semibold ${
                expiryInfo.isExpired ? 'text-red-900' : 'text-green-900'
              }`}>
                {expiryInfo.isExpired ? 'Token Expired' : 'Token Valid'}
              </div>
              <div className={`text-sm ${
                expiryInfo.isExpired ? 'text-red-700' : 'text-green-700'
              }`}>
                {expiryInfo.isExpired 
                  ? `Expired on ${expiryInfo.expiryDate?.toLocaleString()}`
                  : `${formatTime(exp)}`
                }
              </div>
            </div>
          </div>
          {!expiryInfo.isExpired && (
            <Badge variant="success">
              Expires in {expiryInfo.timeLeft}
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
};
export default ExpiryStatus;