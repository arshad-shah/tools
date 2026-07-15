import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Brain,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  Palette as PaletteIcon,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Grid,
  Heading,
  IconButton,
  Inline,
  Label,
  Slider,
  Stack,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
} from '@/components/ui';
import { ColorHarmony, ColorInfo, TabType } from '../../types/ColorTesterTypes';

interface ColorLike {
  toString: (format: 'hex') => string;
}
import { calculateHSL, hexToRgb } from './utils/ColorConverters';
import {
  calculateContrastRatio,
  determineColorMood,
  determineColorName,
  generateHarmonyColors,
} from './utils/CalculationUtils';

const INITIAL_PALETTE: ColorInfo[] = [
  {
    red: 255,
    green: 105,
    blue: 180,
    alpha: 1,
    hex: '#ff69b4',
    rgb: 'rgb(255, 105, 180)',
    name: 'Hot Pink',
  },
  {
    red: 102,
    green: 205,
    blue: 170,
    alpha: 1,
    hex: '#66cdaa',
    rgb: 'rgb(102, 205, 170)',
    name: 'Medium Aquamarine',
  },
  {
    red: 65,
    green: 105,
    blue: 225,
    alpha: 1,
    hex: '#4169e1',
    rgb: 'rgb(65, 105, 225)',
    name: 'Royal Blue',
  },
  {
    red: 255,
    green: 165,
    blue: 0,
    alpha: 1,
    hex: '#ffa500',
    rgb: 'rgb(255, 165, 0)',
    name: 'Orange',
  },
  {
    red: 75,
    green: 0,
    blue: 130,
    alpha: 1,
    hex: '#4b0082',
    rgb: 'rgb(75, 0, 130)',
    name: 'Indigo',
  },
  {
    red: 60,
    green: 179,
    blue: 113,
    alpha: 1,
    hex: '#3cb371',
    rgb: 'rgb(60, 179, 113)',
    name: 'Medium Sea Green',
  },
];

const wcagLevel = (
  ratio: number,
): { label: string; colorScheme: 'success' | 'warning' | 'danger' } => {
  if (ratio >= 7) return { label: 'AAA', colorScheme: 'success' };
  if (ratio >= 4.5) return { label: 'AA', colorScheme: 'success' };
  if (ratio >= 3) return { label: 'AA Large', colorScheme: 'warning' };
  return { label: 'Fail', colorScheme: 'danger' };
};

const Swatch: React.FC<{
  color: string;
  size?: 'sm' | 'md' | 'lg';
  rounded?: boolean;
}> = ({ color, size = 'md', rounded = true }) => {
  const px = size === 'sm' ? 32 : size === 'lg' ? 64 : 48;
  return (
    <div
      aria-hidden
      style={{
        width: px,
        height: px,
        background: color,
        borderRadius: rounded ? '999px' : '8px',
        border: '1px solid rgba(0,0,0,0.1)',
        flexShrink: 0,
      }}
    />
  );
};

const ColorTester: React.FC = () => {
  const [red, setRed] = useState(70);
  const [green, setGreen] = useState(130);
  const [blue, setBlue] = useState(180);
  const [alpha, setAlpha] = useState(1);

  const [savedColors, setSavedColors] = useState<ColorInfo[]>(INITIAL_PALETTE);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [colorNameSuggestion, setColorNameSuggestion] =
    useState<string>('Steel Blue');
  const [colorHarmony, setColorHarmony] = useState<ColorHarmony | null>(null);
  const [colorMood, setColorMood] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('harmony');
  const [contrastRatios, setContrastRatios] = useState({
    white: 0,
    black: 0,
  });

  const hexCode = `#${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`;
  const rgbString =
    alpha < 1
      ? `rgba(${red}, ${green}, ${blue}, ${alpha})`
      : `rgb(${red}, ${green}, ${blue})`;
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  const textColor = luminance > 0.5 ? '#1a202c' : '#ffffff';

  useEffect(() => {
    const hsl = calculateHSL(red, green, blue);
    setColorHarmony(generateHarmonyColors(hsl.h, hsl.s, hsl.l));
    setColorNameSuggestion(determineColorName(hsl.h, hsl.s, hsl.l));
    setColorMood(determineColorMood(hsl.h, hsl.s, hsl.l));
    setContrastRatios({
      white: calculateContrastRatio([red, green, blue], [255, 255, 255]),
      black: calculateContrastRatio([red, green, blue], [0, 0, 0]),
    });
  }, [red, green, blue]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  };

  const generateRandomColor = () => {
    setRed(Math.floor(Math.random() * 256));
    setGreen(Math.floor(Math.random() * 256));
    setBlue(Math.floor(Math.random() * 256));
  };

  const saveColor = () => {
    setSavedColors((prev) => [
      ...prev,
      {
        hex: hexCode,
        rgb: rgbString,
        red,
        green,
        blue,
        alpha,
        name: colorNameSuggestion,
      },
    ]);
  };

  const loadColor = (c: ColorInfo) => {
    setRed(c.red);
    setGreen(c.green);
    setBlue(c.blue);
    setAlpha(c.alpha || 1);
  };

  const loadHarmonyColor = (rgb: string) => {
    const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      setRed(parseInt(match[1]));
      setGreen(parseInt(match[2]));
      setBlue(parseInt(match[3]));
    }
  };

  const deleteColor = (index: number) => {
    setSavedColors((prev) => {
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
  };

  const exportPalette = () => {
    const data = JSON.stringify(savedColors, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'color-palette.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleColorPicker = (color: ColorLike) => {
    const hex = color.toString('hex');
    const { r, g, b } = hexToRgb(hex);
    setRed(r);
    setGreen(g);
    setBlue(b);
  };

  const renderHarmony = () => {
    if (!colorHarmony) return null;
    const entries: Array<[string, { hex: string; rgb: string; name: string }]> =
      [
        ['Complementary', colorHarmony.complementary],
        ['Analogous 1', colorHarmony.analogous1],
        ['Analogous 2', colorHarmony.analogous2],
        ['Triadic 1', colorHarmony.triadic1],
        ['Triadic 2', colorHarmony.triadic2],
        ['Lighter', colorHarmony.lighter],
        ['Darker', colorHarmony.darker],
      ];
    return (
      <Grid max={4} gap="3">
        {entries.map(([label, c]) => (
          <Card key={label} interactive onClick={() => loadHarmonyColor(c.rgb)}>
            <CardBody>
              <Stack gap="2" align="center">
                <Swatch color={c.hex} size="lg" rounded={false} />
                <Stack gap="0" align="center">
                  <Text size="xs" weight="semibold">
                    {label}
                  </Text>
                  <Text size="xs" tone="subtle">
                    {c.hex}
                  </Text>
                </Stack>
              </Stack>
            </CardBody>
          </Card>
        ))}
      </Grid>
    );
  };

  const renderPsychology = () => (
    <Stack gap="3">
      <Inline align="center" gap="3" wrap>
        <Swatch color={rgbString} size="lg" />
        <Stack gap="1">
          <Heading level={3} size="lg">
            {colorNameSuggestion}
          </Heading>
          <Text size="sm" tone="subtle">
            {rgbString}
          </Text>
        </Stack>
      </Inline>
      <Card>
        <CardBody>
          <Stack gap="2">
            <Inline align="center" gap="2">
              <Brain size={16} aria-hidden />
              <Text size="sm" weight="semibold">
                Mood
              </Text>
            </Inline>
            <Text size="sm">{colorMood}</Text>
          </Stack>
        </CardBody>
      </Card>
    </Stack>
  );

  const renderPreview = () => (
    <Stack gap="3">
      <Card style={{ background: rgbString, color: textColor }}>
        <CardBody>
          <Stack gap="3" align="center">
            <Heading
              level={3}
              size="2xl"
              className="text-center"
              style={{ color: textColor }}
            >
              Sample heading
            </Heading>
            <Text
              size="md"
              className="text-center"
              style={{ color: textColor }}
            >
              The quick brown fox jumps over the lazy dog.
            </Text>
            <Inline gap="2">
              <Button variant="solid" size="sm">
                Primary
              </Button>
              <Button variant="soft" size="sm">
                Secondary
              </Button>
            </Inline>
          </Stack>
        </CardBody>
      </Card>
      <Inline justify="center" gap="2">
        <Badge variant="soft" tone="neutral" size="sm">
          Auto text colour: {textColor}
        </Badge>
      </Inline>
    </Stack>
  );

  const renderAccessibility = () => {
    const whiteLevel = wcagLevel(contrastRatios.white);
    const blackLevel = wcagLevel(contrastRatios.black);
    return (
      <Stack gap="3">
        <Card style={{ background: rgbString }}>
          <CardBody>
            <Stack gap="2">
              <Text size="lg" weight="bold" style={{ color: '#ffffff' }}>
                White text on this colour
              </Text>
              <Text size="sm" style={{ color: '#ffffff' }}>
                Contrast ratio: {contrastRatios.white.toFixed(2)}:1
              </Text>
              <Inline gap="2">
                <Badge variant="solid" tone={whiteLevel.colorScheme} size="sm">
                  WCAG {whiteLevel.label}
                </Badge>
              </Inline>
            </Stack>
          </CardBody>
        </Card>
        <Card style={{ background: rgbString }}>
          <CardBody>
            <Stack gap="2">
              <Text size="lg" weight="bold" style={{ color: '#000000' }}>
                Black text on this colour
              </Text>
              <Text size="sm" style={{ color: '#000000' }}>
                Contrast ratio: {contrastRatios.black.toFixed(2)}:1
              </Text>
              <Inline gap="2">
                <Badge variant="solid" tone={blackLevel.colorScheme} size="sm">
                  WCAG {blackLevel.label}
                </Badge>
              </Inline>
            </Stack>
          </CardBody>
        </Card>
        {whiteLevel.colorScheme !== 'success' &&
          blackLevel.colorScheme !== 'success' && (
            <Alert status="warning" icon={<AlertTriangle aria-hidden />}>
              <AlertTitle>Low contrast</AlertTitle>
              <AlertDescription>
                Neither white nor black text reaches WCAG AA on this colour for
                normal text. Consider darkening or lightening it.
              </AlertDescription>
            </Alert>
          )}
      </Stack>
    );
  };

  return (
    <Stack gap="4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
        <div className="min-w-0 md:col-span-5">
          <Card>
            <CardHeader>
              <Inline align="center" gap="2">
                <PaletteIcon size={20} aria-hidden />
                <CardTitle as="h3">Current colour</CardTitle>
              </Inline>
            </CardHeader>
            <CardBody>
              <Stack gap="4">
                <Card style={{ background: rgbString, color: textColor }}>
                  <CardBody>
                    <Stack gap="2" align="center">
                      <Sparkles size={36} aria-hidden />
                      <Heading level={3} size="xl" style={{ color: textColor }}>
                        {colorNameSuggestion}
                      </Heading>
                      <Text size="sm" style={{ color: textColor }}>
                        {hexCode}
                      </Text>
                    </Stack>
                  </CardBody>
                </Card>
                <Inline gap="2" wrap>
                  <Button
                    variant="soft"
                    size="sm"
                    leftIcon={<RefreshCw size={14} />}
                    onClick={generateRandomColor}
                  >
                    Random
                  </Button>
                  <Button
                    variant="solid"
                    size="sm"
                    leftIcon={<Save size={14} />}
                    onClick={saveColor}
                  >
                    Save
                  </Button>
                </Inline>

                <Stack gap="2">
                  <Inline justify="between" align="center">
                    <Text size="sm" tone="subtle">
                      HEX
                    </Text>
                    <Inline gap="2" align="center">
                      <Text size="sm" weight="medium">
                        {hexCode}
                      </Text>
                      <IconButton
                        variant="ghost"
                        size="sm"
                        label="Copy hex"
                        icon={
                          copiedKey === 'hex' ? (
                            <CheckCircle2 size={14} />
                          ) : (
                            <Copy size={14} />
                          )
                        }
                        onClick={() => copyToClipboard(hexCode, 'hex')}
                      />
                    </Inline>
                  </Inline>
                  <Inline justify="between" align="center">
                    <Text size="sm" tone="subtle">
                      RGB
                    </Text>
                    <Inline gap="2" align="center">
                      <Text size="sm" weight="medium">
                        {rgbString}
                      </Text>
                      <IconButton
                        variant="ghost"
                        size="sm"
                        label="Copy rgb"
                        icon={
                          copiedKey === 'rgb' ? (
                            <CheckCircle2 size={14} />
                          ) : (
                            <Copy size={14} />
                          )
                        }
                        onClick={() => copyToClipboard(rgbString, 'rgb')}
                      />
                    </Inline>
                  </Inline>
                </Stack>
              </Stack>
            </CardBody>
          </Card>
        </div>

        <div className="min-w-0 md:col-span-7">
          <Card>
            <CardBody>
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as TabType)}
                variant="line"
              >
                <TabsList aria-label="Tester views">
                  <TabsTrigger value="harmony">
                    <Inline gap="2" align="center" wrap={false}>
                      <PaletteIcon size={14} aria-hidden />
                      <span>Harmony</span>
                    </Inline>
                  </TabsTrigger>
                  <TabsTrigger value="psychology">
                    <Inline gap="2" align="center" wrap={false}>
                      <Brain size={14} aria-hidden />
                      <span>Psychology</span>
                    </Inline>
                  </TabsTrigger>
                  <TabsTrigger value="preview">
                    <Inline gap="2" align="center" wrap={false}>
                      <Eye size={14} aria-hidden />
                      <span>Preview</span>
                    </Inline>
                  </TabsTrigger>
                  <TabsTrigger value="accessibility">
                    <Inline gap="2" align="center" wrap={false}>
                      <Check size={14} aria-hidden />
                      <span>A11y</span>
                    </Inline>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="harmony">
                  <Box className="pt-4">{renderHarmony()}</Box>
                </TabsContent>
                <TabsContent value="psychology">
                  <Box className="pt-4">{renderPsychology()}</Box>
                </TabsContent>
                <TabsContent value="preview">
                  <Box className="pt-4">{renderPreview()}</Box>
                </TabsContent>
                <TabsContent value="accessibility">
                  <Box className="pt-4">{renderAccessibility()}</Box>
                </TabsContent>
              </Tabs>
            </CardBody>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle as="h3">Colour editor</CardTitle>
        </CardHeader>
        <CardBody>
          <Stack gap="4">
            <Inline align="center" gap="3" wrap>
              <input
                type="color"
                value={hexCode}
                onChange={(e) =>
                  handleColorPicker({ toString: () => e.target.value })
                }
                aria-label="Colour picker"
                className="h-10 w-16 cursor-pointer rounded-md border border-line bg-surface"
              />
              <Text size="sm" tone="subtle">
                Pick a colour or use the sliders below.
              </Text>
            </Inline>

            <Grid max={2} gap="4">
              <Stack gap="2">
                <Inline justify="between" align="center">
                  <Label>Red</Label>
                  <Badge variant="soft" tone="danger" size="sm">
                    {red}
                  </Badge>
                </Inline>
                <Slider
                  value={red}
                  onValueChange={setRed}
                  min={0}
                  max={255}
                  aria-label="Red channel"
                />
              </Stack>
              <Stack gap="2">
                <Inline justify="between" align="center">
                  <Label>Green</Label>
                  <Badge variant="soft" tone="success" size="sm">
                    {green}
                  </Badge>
                </Inline>
                <Slider
                  value={green}
                  onValueChange={setGreen}
                  min={0}
                  max={255}
                  aria-label="Green channel"
                />
              </Stack>
              <Stack gap="2">
                <Inline justify="between" align="center">
                  <Label>Blue</Label>
                  <Badge variant="soft" tone="accent" size="sm">
                    {blue}
                  </Badge>
                </Inline>
                <Slider
                  value={blue}
                  onValueChange={setBlue}
                  min={0}
                  max={255}
                  aria-label="Blue channel"
                />
              </Stack>
              <Stack gap="2">
                <Inline justify="between" align="center">
                  <Label>Alpha</Label>
                  <Badge variant="soft" tone="neutral" size="sm">
                    {alpha.toFixed(2)}
                  </Badge>
                </Inline>
                <Slider
                  value={alpha}
                  onValueChange={setAlpha}
                  min={0}
                  max={1}
                  step={0.01}
                  aria-label="Alpha channel"
                />
              </Stack>
            </Grid>
          </Stack>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <Inline justify="between" align="center" wrap>
            <CardTitle as="h3">Saved palette</CardTitle>
            <Button
              variant="soft"
              size="sm"
              leftIcon={<Download size={14} />}
              disabled={savedColors.length === 0}
              onClick={exportPalette}
            >
              Export
            </Button>
          </Inline>
        </CardHeader>
        <CardBody>
          {savedColors.length === 0 ? (
            <Text size="sm" tone="subtle" className="text-center">
              No colours saved yet. Click Save to add one.
            </Text>
          ) : (
            <Grid max={4} gap="3">
              {savedColors.map((c, idx) => (
                <Card
                  key={`${c.hex}-${idx}`}
                  interactive
                  onClick={() => loadColor(c)}
                >
                  <CardBody>
                    <Stack gap="2" align="center">
                      <Swatch color={c.hex} size="lg" rounded={false} />
                      <Stack gap="0" align="center">
                        <Text size="xs" weight="semibold">
                          {c.name || c.hex}
                        </Text>
                        <Text size="xs" tone="subtle">
                          {c.hex}
                        </Text>
                      </Stack>
                      <IconButton
                        variant="danger"
                        size="sm"
                        label="Delete colour"
                        icon={<Trash2 size={12} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteColor(idx);
                        }}
                      />
                    </Stack>
                  </CardBody>
                </Card>
              ))}
            </Grid>
          )}
        </CardBody>
      </Card>
    </Stack>
  );
};

export default ColorTester;
