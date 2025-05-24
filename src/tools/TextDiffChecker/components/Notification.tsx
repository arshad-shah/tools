import { AlertTriangle, Check } from "lucide-react";
import { NotificationProps } from "../../../types/TextDiffCheckerTypes";

const Notification: React.FC<{ notification: NotificationProps }> = ({ notification }) => {
  const variants = {
    success: 'bg-emerald-500 text-white',
    error: 'bg-red-500 text-white',
    warning: 'bg-amber-500 text-white',
    info: 'bg-blue-500 text-white'
  };

  const icons = {
    success: <Check className="h-4 w-4" />,
    error: <AlertTriangle className="h-4 w-4" />,
    warning: <AlertTriangle className="h-4 w-4" />,
    info: <Check className="h-4 w-4" />
  };

  return (
    <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-2xl flex items-center animate-fade-in backdrop-blur-lg ${variants[notification.type]} z-50`}>
      {icons[notification.type]}
      <span className="ml-2 font-medium">{notification.message}</span>
    </div>
  );
};

export default Notification;