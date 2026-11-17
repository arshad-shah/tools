import { formatBytes } from '@/shared/lib/format';
import {
  Button,
  Card,
  IconButton,
  Inline,
  Select,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import { close, ocrScan, plus } from '@arshad-shah/cynosure/icons';
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
    <Card
      variant="outline"
      padding="md"
      title="Make this document searchable"
      headingLevel={3}
    >
      <Stack gap="4">
        <Stack gap="2">
          {langs.map((l, i) => (
            <Inline key={`ocr-language-${i}`} gap="1" align="end">
              <Stack grow minSize="0">
                <Select
                  label={i === 0 ? 'Language' : `Language ${i + 1}`}
                  size="sm"
                  value={l}
                  onChange={(v) => setAt(i, v as OcrLanguage)}
                  options={ITEMS}
                  disabled={busy}
                />
              </Stack>
              {i > 0 ? (
                <IconButton
                  variant="ghost"
                  size="sm"
                  label={`Remove language ${i + 1}`}
                  icon={close}
                  disabled={busy}
                  onClick={() => onLangsChange(langs.filter((_, k) => k !== i))}
                />
              ) : null}
            </Inline>
          ))}
          {langs.length < MAX_OCR_LANGUAGES ? (
            <Stack align="start">
              <Button
                variant="ghost"
                size="sm"
                icon={plus}
                disabled={busy}
                onClick={() => onLangsChange([...langs, nextLanguage(langs)])}
              >
                Add a language
              </Button>
            </Stack>
          ) : null}
        </Stack>
        <Text size="sm" tone="muted">
          {line}
        </Text>
        <Inline gap="2" wrap>
          <Button
            variant="solid"
            tone="accent"
            icon={ocrScan}
            disabled={busy || cached === null}
            loading={busy}
            onClick={onRun}
          >
            {cached ? 'Run OCR' : 'Download and run'}
          </Button>
          {cached ? null : (
            <Button variant="ghost" disabled={busy} onClick={onDismiss}>
              Not now
            </Button>
          )}
        </Inline>
      </Stack>
    </Card>
  );
}
