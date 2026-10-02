import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Badge,
  FileUpload,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui';
import { Row, Section } from '../Section';

const ROWS = [
  ['report.pdf', '12', '2.4 MB'],
  ['scan.pdf', '3', '780 KB'],
  ['notes.pdf', '1', '96 KB'],
];

/** Accordion, Table, FileUpload and the Badge size and shape matrix. */
export function DataSection() {
  return (
    <Section name="data" title="Data">
      <div className="grid gap-4 md:grid-cols-2">
        <Accordion type="single" defaultValue="open">
          <AccordionItem value="open">
            <AccordionTrigger>Open item</AccordionTrigger>
            <AccordionContent>
              Content of the open accordion item.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="closed">
            <AccordionTrigger>Closed item</AccordionTrigger>
            <AccordionContent>Hidden content.</AccordionContent>
          </AccordionItem>
        </Accordion>
        <div className="overflow-hidden rounded-lg bg-surface shadow-e1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>Pages</TableHead>
                <TableHead>Size</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ROWS.map(([name, pages, size]) => (
                <TableRow key={name}>
                  <TableCell>{name}</TableCell>
                  <TableCell>{pages}</TableCell>
                  <TableCell>{size}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <FileUpload onFiles={() => {}} hint="Files never leave your browser" />
        <FileUpload onFiles={() => {}} disabled label="Upload disabled" />
      </div>
      <Row label="Badge sizes and shapes">
        {(['xs', 'sm', 'md'] as const).map((size) => (
          <Badge key={size} size={size} tone="accent">
            {size}
          </Badge>
        ))}
        {(['xs', 'sm', 'md'] as const).map((size) => (
          <Badge key={`pill-${size}`} size={size} pill tone="info">
            pill {size}
          </Badge>
        ))}
        <Badge mono tone="neutral">
          mono
        </Badge>
      </Row>
    </Section>
  );
}
