import { useEffect, useState } from "react";

export const useScrollSync = (
  scrollRef: React.RefObject<HTMLDivElement>,
  preRef: React.RefObject<HTMLPreElement>,
  textareaRef: React.RefObject<HTMLTextAreaElement>
) => {
  const [isScrollingSynced, setIsScrollingSynced] = useState(false);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer || isScrollingSynced) return;

    const handleScroll = () => {
      setIsScrollingSynced(true);
      if (preRef.current) {
        preRef.current.scrollTop = scrollContainer.scrollTop;
      }
      if (textareaRef.current) {
        textareaRef.current.scrollTop = scrollContainer.scrollTop;
      }
      setTimeout(() => setIsScrollingSynced(false), 50);
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [isScrollingSynced, preRef, textareaRef]);

  return { isScrollingSynced };
};
