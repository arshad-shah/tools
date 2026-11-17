import {
  Badge,
  Button,
  Card,
  Inline,
  Notice,
  Stack,
  Tab,
  TabList,
  TabPanel,
  Tabs,
} from '@arshad-shah/cynosure';
import { eyeOff, refreshCw } from '@arshad-shah/cynosure/icons';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deriveFilename, saveBlob } from '@/shared/lib/download';
import { toToolError } from '@/shared/lib/errors';
import { formatBytes } from '@/shared/lib/format';
import { sendTo, useHandoffFiles } from '@/shared/lib/handoff';
import { notify } from '@/shared/lib/notify';
import { useSendCommands } from '@/shared/lib/send-commands';
import { useToolCommands } from '@/shared/lib/tool-commands';
import { OpenScreen } from './components/OpenScreen';
import { SheetActions, type SheetAction } from './components/SheetActions';
import { SheetView } from './components/SheetView';
import { useWorkbook } from './hooks/useWorkbook';
import { sheetToCsv, sheetToJson } from './lib/export';
import { sampleWorkbook } from './lib/sample';

const TOOL_ID = 'excel-viewer';

/**
 * Excel Viewer: an .xlsx or .xlsm workbook read on the device (fflate and
 * DOMParser), its sheets as grids with a cell inspector, exported or sent
 * on as CSV.
 */
export default function ExcelViewer() {
  const navigate = useNavigate();
  const book = useWorkbook();
  const { open } = book;
  const [header, setHeader] = useState<number | null>(0);

  const openFile = (file: File) => {
    setHeader(0);
    void open.run(file);
  };
  useHandoffFiles((files) => openFile(files[0]));
  const openSample = () =>
    openFile(
      new File([sampleWorkbook() as Uint8Array<ArrayBuffer>], 'sample.xlsx'),
    );

  const loaded = open.result;
  const info = loaded?.workbook.sheets[book.active];
  const sheet = book.slot && 'sheet' in book.slot ? book.slot.sheet : null;
  const sheetName = info?.name ?? 'sheet';
  const fileBase = deriveFilename(loaded?.name ?? 'workbook', sheetName, 'csv');

  const act = (action: SheetAction) => {
    if (!sheet) return;
    try {
      if (action === 'csv')
        saveBlob(
          new TextEncoder().encode(sheetToCsv(sheet, header)),
          fileBase,
          'text/csv',
        );
      else if (action === 'json')
        saveBlob(
          new TextEncoder().encode(sheetToJson(sheet, header)),
          deriveFilename(loaded?.name ?? 'workbook', sheetName, 'json'),
          'application/json',
        );
      else
        sendTo(navigate, action, {
          kind: 'text',
          mime: 'text/csv',
          // The SQL Playground names the table after the file.
          filename: `${sheetName}.csv`,
          text: sheetToCsv(sheet, header),
          sourceTool: TOOL_ID,
        });
    } catch (e) {
      notify.error(toToolError(e));
    }
  };

  useSendCommands(TOOL_ID, [
    { target: 'csv-viewer', run: () => act('csv-viewer'), enabled: !!sheet },
    {
      target: 'sql-playground',
      run: () => act('sql-playground'),
      enabled: !!sheet,
    },
  ]);
  useToolCommands(TOOL_ID, [
    {
      id: 'export-csv',
      label: 'Export sheet as CSV',
      run: () => act('csv'),
      enabled: !!sheet,
    },
    { id: 'sample', label: 'Open a sample workbook', run: openSample },
    {
      id: 'close',
      label: 'Open another workbook',
      shortcut: 'Mod+Shift+X',
      run: book.close,
      enabled: !!loaded,
    },
  ]);

  if (!loaded)
    return <OpenScreen job={open} onFile={openFile} onSample={openSample} />;

  const { workbook } = loaded;
  return (
    <Stack gap="4">
      <Card
        as="section"
        title={loaded.name}
        headingLevel={2}
        padding="sm"
        actions={
          <Inline gap="2" wrap>
            <Button
              size="sm"
              variant="ghost"
              icon={refreshCw}
              onClick={book.close}
            >
              Open another
            </Button>
            <SheetActions
              rowCount={sheet?.rowCount ?? 0}
              header={header}
              onHeader={setHeader}
              onAction={act}
              disabled={!sheet}
            />
          </Inline>
        }
      >
        <Inline gap="2" wrap>
          <Badge size="sm" variant="soft" tone="accent">
            {`${workbook.sheets.length} ${workbook.sheets.length === 1 ? 'sheet' : 'sheets'}`}
          </Badge>
          <Badge size="sm" variant="soft" tone="neutral">
            {formatBytes(loaded.size)}
          </Badge>
          <Badge size="sm" variant="soft" tone="neutral">
            {workbook.date1904 ? '1904 date system' : '1900 date system'}
          </Badge>
          {workbook.hasMacros ? (
            <Badge size="sm" variant="soft" tone="warning">
              Has macros (not run)
            </Badge>
          ) : null}
        </Inline>
      </Card>
      <Tabs
        value={String(book.active)}
        onChange={(v) => book.select(Number(v))}
        variant="line"
      >
        <TabList label="Sheets" scrollable>
          {workbook.sheets.map((s, i) => (
            <Tab
              key={i}
              value={String(i)}
              icon={s.state === 'visible' ? undefined : eyeOff}
            >
              {s.state === 'visible' ? s.name : `${s.name} (hidden)`}
            </Tab>
          ))}
        </TabList>
        {workbook.sheets.map((s, i) => (
          <TabPanel key={i} value={String(i)}>
            {i !== book.active ? null : book.slot && 'error' in book.slot ? (
              <Notice tone="warning" title={`Could not show ${s.name}`}>
                {book.slot.error.message}
              </Notice>
            ) : sheet ? (
              <SheetView
                key={i}
                sheet={sheet}
                name={s.name}
                hidden={s.state !== 'visible'}
                formatOf={workbook.formatOf}
              />
            ) : null}
          </TabPanel>
        ))}
      </Tabs>
    </Stack>
  );
}
