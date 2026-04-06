import { HelpCircle } from "lucide-react";
import Button from "./Button";

const HelpButton: React.FC = () => (
  <div className="fixed bottom-6 left-6 z-50">
    <Button 
      onClick={() => alert("🚀 Intelligent Diff Checker\n\nCompare texts with precision using advanced diffing algorithms.\n\n✨ Features:\n• Character, word, or line-level diffing\n• Multiple view modes\n• Smart settings & filters\n• Export capabilities\n• Real-time statistics\n• File upload support\n\nTip: Upload files or paste text to start comparing!")}
      variant="primary"
      size="md"
      className="rounded-full w-12 h-12 p-0 shadow-2xl"
      title="Help & Features"
    >
      <HelpCircle className="w-5 h-5" />
    </Button>
  </div>
);

export default HelpButton;