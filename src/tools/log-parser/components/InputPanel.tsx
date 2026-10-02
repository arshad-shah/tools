import React from 'react';
import {
  IconFileText,
  IconFolderOpen,
  IconRefreshCw,
  IconTrash2,
} from '@/shared/ui/icons';

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  FilePicker,
  Inline,
  Label,
  Select,
  Stack,
  Textarea,
} from '@/shared/ui';
import type { LogType } from '../types';

const LOG_TYPE_OPTIONS = [
  { value: 'auto', label: 'Auto-detect' },
  { value: 'spring', label: 'Spring Boot' },
  { value: 'django', label: 'Django' },
  { value: 'node', label: 'Node.js' },
  { value: 'log4j', label: 'Log4j' },
  { value: 'sql', label: 'SQL' },
  { value: 'webpack', label: 'Webpack' },
  { value: 'generic', label: 'Generic' },
];

interface InputPanelProps {
  logText: string;
  setLogText: (text: string) => void;
  logType: LogType;
  setLogType: (type: LogType) => void;
  loadSampleLogs: () => void;
  clearLogs: () => void;
  /** Loads a log file into the text area (also used for hub handoffs). */
  openFile: (file: File) => void;
}

export const InputPanel: React.FC<InputPanelProps> = ({
  logText,
  setLogText,
  logType,
  setLogType,
  loadSampleLogs,
  clearLogs,
  openFile,
}) => (
  <Card>
    <CardHeader>
      <Inline justify="between" align="center" wrap gap="2">
        <Inline align="center" gap="2">
          <IconFileText size="md" />
          <CardTitle as="h3">Log input</CardTitle>
        </Inline>
        <Inline gap="2" wrap>
          <FilePicker
            accept=".log,.txt,text/plain"
            onFiles={(files) => openFile(files[0])}
          >
            {(open) => (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<IconFolderOpen size="sm" />}
                onClick={open}
              >
                Open file
              </Button>
            )}
          </FilePicker>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<IconRefreshCw size="sm" />}
            onClick={loadSampleLogs}
          >
            Load sample
          </Button>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<IconTrash2 size="sm" />}
            disabled={!logText}
            onClick={clearLogs}
          >
            Clear
          </Button>
        </Inline>
      </Inline>
    </CardHeader>
    <CardBody>
      <Stack gap="3">
        <Stack gap="2">
          <Label>Log type</Label>
          <Select
            value={logType}
            onValueChange={(v) => setLogType(v as LogType)}
            items={LOG_TYPE_OPTIONS}
            aria-label="Log type"
          />
        </Stack>
        <Textarea
          value={logText}
          onChange={setLogText}
          placeholder="Paste log lines here…"
          rows={12}
          aria-label="Log text"
        />
      </Stack>
    </CardBody>
  </Card>
);
