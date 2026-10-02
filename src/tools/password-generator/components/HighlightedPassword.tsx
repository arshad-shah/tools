import React from 'react';
import { Box } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { CHAR_CLASS, classifyChar } from '../lib/strength';

interface HighlightedPasswordProps {
  password: string;
  hidden: boolean;
}

export const HighlightedPassword: React.FC<HighlightedPasswordProps> = ({
  password,
  hidden,
}) => (
  <Box className="min-w-0 overflow-hidden rounded-md border border-line bg-surface p-4 font-mono text-base leading-[1.6] break-all whitespace-pre-wrap [overflow-wrap:anywhere]">
    {hidden ? (
      <>
        <span aria-hidden="true">{'*'.repeat(password.length)}</span>
        <span className="sr-only">Password hidden</span>
      </>
    ) : (
      Array.from(password).map((ch, i) => {
        const type = classifyChar(ch);
        return (
          <span key={i} className={cn('font-bold', CHAR_CLASS[type])}>
            {ch}
          </span>
        );
      })
    )}
  </Box>
);
