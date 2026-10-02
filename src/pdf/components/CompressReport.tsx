import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  List,
  ListItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@/shared/ui';
import { formatBytes, formatSizeChange } from '@/shared/lib/format';
import type { CompressReport } from '@/pdf/compress/pipeline';

interface CompressReportViewProps {
  report: CompressReport;
}

/**
 * What each stage did, which images were touched, and qpdf's warnings.
 * Shared by the Compress quick task and Optimize mode.
 */
export const CompressReportView: React.FC<CompressReportViewProps> = ({
  report,
}) => {
  const { images, warnings } = report;
  const skippedTotal = images?.skipped.reduce((n, s) => n + s.count, 0) ?? 0;
  return (
    <Stack gap="3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Stage</TableHead>
            <TableHead>Before</TableHead>
            <TableHead>After</TableHead>
            <TableHead>Change</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {report.stages.map((s) => (
            <TableRow key={s.id}>
              <TableCell>{s.label}</TableCell>
              <TableCell className="font-mono">
                {formatBytes(s.before)}
              </TableCell>
              <TableCell className="font-mono">
                {formatBytes(s.after)}
              </TableCell>
              <TableCell className="font-mono">
                {formatSizeChange(s.before, s.after)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {images && (
        <Stack gap="2">
          <Text size="sm">
            Images: {images.processed} recompressed, {images.unchanged} already
            optimal, {skippedTotal} left untouched
          </Text>
          {images.grayToRgb > 0 && (
            <Text size="sm" tone="muted">
              {images.grayToRgb === 1
                ? '1 grayscale image was'
                : `${images.grayToRgb} grayscale images were`}{' '}
              re-encoded as colour JPEG: browsers cannot write grayscale JPEGs.
            </Text>
          )}
          {skippedTotal > 0 && (
            <Stack gap="1">
              <Text size="sm" weight="semibold" id="cmp-untouched">
                Left untouched
              </Text>
              <List aria-labelledby="cmp-untouched">
                {images.skipped.map((s) => (
                  <ListItem key={s.reason}>
                    {s.reason} ({s.count})
                  </ListItem>
                ))}
              </List>
            </Stack>
          )}
        </Stack>
      )}
      {warnings.length > 0 && (
        <Accordion type="single">
          <AccordionItem value="warnings">
            <AccordionTrigger>Warnings ({warnings.length})</AccordionTrigger>
            <AccordionContent>
              <pre className="text-xs whitespace-pre-wrap">
                {warnings.join('\n')}
              </pre>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </Stack>
  );
};
