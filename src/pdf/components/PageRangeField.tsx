import React from 'react';
import {
  Alert,
  AlertDescription,
  Input,
  Label,
  Stack,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/shared/ui';

interface PageRangeFieldProps {
  /** Prefix for element ids (unique per tool). */
  id: string;
  mode: 'all' | 'ranges';
  text: string;
  onModeChange: (mode: 'all' | 'ranges') => void;
  onTextChange: (text: string) => void;
  /** From trySelectPages; shown once something has been typed. */
  error: string | null;
  /** Just the range box: the caller offers "all pages" its own way. */
  rangesOnly?: boolean;
}

/** "All pages" / "Some pages" with a live-validated range box. */
export const PageRangeField: React.FC<PageRangeFieldProps> = ({
  id,
  mode,
  text,
  onModeChange,
  onTextChange,
  error,
  rangesOnly,
}) => (
  <Stack gap="2">
    {rangesOnly ? null : (
      <>
        <Label id={`${id}-pages-label`}>Pages</Label>
        <Tabs
          value={mode}
          onValueChange={(v) => onModeChange(v as 'all' | 'ranges')}
          variant="soft"
        >
          <TabsList aria-labelledby={`${id}-pages-label`}>
            <TabsTrigger value="all">All pages</TabsTrigger>
            <TabsTrigger value="ranges">Some pages</TabsTrigger>
          </TabsList>
        </Tabs>
      </>
    )}
    {mode === 'ranges' && (
      <Input
        aria-label="Page ranges"
        value={text}
        onChange={onTextChange}
        placeholder="e.g. 1-3, 5"
      />
    )}
    {/* An empty box isn't an error yet; the action stays disabled meanwhile. */}
    {error && mode === 'ranges' && text.trim() !== '' && (
      <Alert status="danger">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )}
  </Stack>
);
