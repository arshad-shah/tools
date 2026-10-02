import { formatBytes } from '@/shared/lib/format';
import {
  Button,
  Card,
  CardBody,
  Heading,
  IconButton,
  Label,
  Select,
  Stack,
  Text,
} from '@/shared/ui';
import { IconOcrScan, IconPlus, IconX } from '@/shared/ui/icons';
import { downloadSize, simdSupported } from '@/pdf/ocr/assets';
import {
  MAX_OCR_LANGUAGES,
  OCR_LANGUAGE_LABELS,
  OCR_LANGUAGES,
  type OcrLanguage,
  type OcrManifest,
} from '@/pdf/ocr/types';
import { languageNames } from './languages';

export interface ConsentCardProps {
  /** Sizes for the download line; null while unknown (the line names none). */
  manifest: OcrManifest | null;
  langs: OcrLanguage[];
  onLangsChange(langs: OcrLanguage[]): void;
  /** Whether every chosen language is stored on this device; null: checking. */
  cached: boolean | null;
  /** Defaults to this browser's SIMD support. */
  simd?: boolean;
  busy?: boolean;
  onRun(): void;
  onDismiss(): void;
}

const ITEMS = OCR_LANGUAGES.map((l) => ({
  value: l,
  label: OCR_LANGUAGE_LABELS[l],
}));

/** The first language not chosen yet. */
const nextLanguage = (langs: readonly OcrLanguage[]) =>
  OCR_LANGUAGES.find((l) => !langs.includes(l))!;

/**
 * OCR consent (spec 11 "First use"): the languages, the exact download size
 * from the manifest, and nothing fetched until "Download and run". Once the
 * data is stored it says so and runs directly.
 */
export function ConsentCard({
  manifest,
  langs,
  onLangsChange,
  cached,
  simd = simdSupported(),
  busy,
  onRun,
  onDismiss,
}: ConsentCardProps) {
  const names = languageNames(langs);
  const what = langs.length === 1 ? 'engine + language' : 'engine + languages';
  const line = cached
    ? `${names} OCR data is stored on this device.`
    : manifest
      ? `${names} OCR data: ${formatBytes(downloadSize(manifest, langs, simd))} download (${what}), stored on this device for next time.`
      : `${names} OCR data downloads once (${what}) and is stored on this device for next time.`;

  const setAt = (i: number, l: OcrLanguage) => {
    const next = [...langs];
    next[i] = l;
    // A language chosen twice keeps its first place only.
    onLangsChange(next.filter((x, k) => next.indexOf(x) === k));
  };

  return (
    <Card aria-labelledby="ocr-consent-title">
      <CardBody>
        <Stack gap="3">
          <div className="flex items-center gap-2">
            <IconOcrScan size="md" className="text-accent-fg" />
            <Heading id="ocr-consent-title" level={3} size="md">
              Make this document searchable
            </Heading>
          </div>
          <Stack gap="2">
            {langs.map((l, i) => {
              const id = `ocr-language-${i}`;
              return (
                <div key={id} className="flex flex-col gap-1">
                  <Label htmlFor={id}>
                    {i === 0 ? 'Language' : `Language ${i + 1}`}
                  </Label>
                  <div className="flex items-center gap-1">
                    <div className="min-w-0 flex-1">
                      <Select
                        id={id}
                        value={l}
                        onValueChange={(v) => setAt(i, v as OcrLanguage)}
                        items={ITEMS}
                        disabled={busy}
                      />
                    </div>
                    {i > 0 ? (
                      <IconButton
                        variant="ghost"
                        size="sm"
                        label={`Remove language ${i + 1}`}
                        icon={IconX}
                        disabled={busy}
                        onClick={() =>
                          onLangsChange(langs.filter((_, k) => k !== i))
                        }
                      />
                    ) : null}
                  </div>
                </div>
              );
            })}
            {langs.length < MAX_OCR_LANGUAGES ? (
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<IconPlus size="sm" />}
                  disabled={busy}
                  onClick={() => onLangsChange([...langs, nextLanguage(langs)])}
                >
                  Add a language
                </Button>
              </div>
            ) : null}
          </Stack>
          <Text size="sm" tone="muted">
            {line}
          </Text>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              leftIcon={<IconOcrScan size="sm" />}
              disabled={busy || cached === null}
              onClick={onRun}
            >
              {cached ? 'Run OCR' : 'Download and run'}
            </Button>
            {cached ? null : (
              <Button variant="secondary" disabled={busy} onClick={onDismiss}>
                Not now
              </Button>
            )}
          </div>
        </Stack>
      </CardBody>
    </Card>
  );
}
