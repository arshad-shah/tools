import { useCallback, useState } from "react";
import { NotificationProps } from "../../../types/TextDiffCheckerTypes";

const useNotification = () => {
  const [notification, setNotification] = useState<NotificationProps | null>(null);

  const showNotification = useCallback((message: string, type: NotificationProps['type'] = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  return { notification, showNotification };
};

export default useNotification;