import React, { useMemo, useState } from 'react';
import { IconBrain, IconCheck, IconEye, IconPalette } from '@/shared/ui/icons';

import {
  Box,
  Card,
  CardBody,
  Inline,
  Stack,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/ui';
import { useClipboard } from '@/shared/lib/clipboard';
import { saveBlob } from '@/shared/lib/download';
import { ColorInfo, ColorLike, TabType } from './types';
import { hexToRgb } from './lib/color-convert';
import { analyzeColor } from './lib/color-analysis';
import {
  INITIAL_PALETTE,
  parseRgb,
  textColorFor,
  toHex,
  toRgbString,
} from './lib/palette';
import { CurrentColorCard } from './components/CurrentColorCard';
import { HarmonyTab } from './components/HarmonyTab';
import { PsychologyTab } from './components/PsychologyTab';
import { PreviewTab } from './components/PreviewTab';
import { AccessibilityTab } from './components/AccessibilityTab';
import { ColorEditor } from './components/ColorEditor';
import { SavedPalette } from './components/SavedPalette';

const ColorTester: React.FC = () => {
  const [red, setRed] = useState(70);
  const [green, setGreen] = useState(130);
  const [blue, setBlue] = useState(180);
  const [alpha, setAlpha] = useState(1);

  const [savedColors, setSavedColors] = useState<ColorInfo[]>(INITIAL_PALETTE);
  const { copiedKey, copy } = useClipboard();
  const [activeTab, setActiveTab] = useState<TabType>('harmony');

  // Derived from the channels; nothing to keep in sync.
  const analysis = useMemo(
    () => analyzeColor(red, green, blue),
    [red, green, blue],
  );
  const {
    harmony: colorHarmony,
    name: colorNameSuggestion,
    mood: colorMood,
    contrast: contrastRatios,
  } = analysis;

  const hexCode = toHex(red, green, blue);
  const rgbString = toRgbString(red, green, blue, alpha);
  const textColor = textColorFor(red, green, blue);

  const copyToClipboard = (text: string, key: string) => void copy(text, key);

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
    const parsed = parseRgb(rgb);
    if (parsed) {
      setRed(parsed.r);
      setGreen(parsed.g);
      setBlue(parsed.b);
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
    saveBlob(
      new Blob([JSON.stringify(savedColors, null, 2)], {
        type: 'application/json',
      }),
      'color-palette.json',
    );
  };

  const handleColorPicker = (color: ColorLike) => {
    const hex = color.toString('hex');
    const { r, g, b } = hexToRgb(hex);
    setRed(r);
    setGreen(g);
    setBlue(b);
  };

  return (
    <Stack gap="4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
        <div className="min-w-0 md:col-span-5">
          <CurrentColorCard
            rgbString={rgbString}
            textColor={textColor}
            hexCode={hexCode}
            alpha={alpha}
            colorNameSuggestion={colorNameSuggestion}
            generateRandomColor={generateRandomColor}
            saveColor={saveColor}
            copiedKey={copiedKey}
            copyToClipboard={copyToClipboard}
          />
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
                      <IconPalette size="sm" />
                      <span>Harmony</span>
                    </Inline>
                  </TabsTrigger>
                  <TabsTrigger value="psychology">
                    <Inline gap="2" align="center" wrap={false}>
                      <IconBrain size="sm" />
                      <span>Psychology</span>
                    </Inline>
                  </TabsTrigger>
                  <TabsTrigger value="preview">
                    <Inline gap="2" align="center" wrap={false}>
                      <IconEye size="sm" />
                      <span>Preview</span>
                    </Inline>
                  </TabsTrigger>
                  <TabsTrigger value="accessibility">
                    <Inline gap="2" align="center" wrap={false}>
                      <IconCheck size="sm" />
                      <span>A11y</span>
                    </Inline>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="harmony">
                  <Box className="pt-4">
                    <HarmonyTab
                      colorHarmony={colorHarmony}
                      loadHarmonyColor={loadHarmonyColor}
                    />
                  </Box>
                </TabsContent>
                <TabsContent value="psychology">
                  <Box className="pt-4">
                    <PsychologyTab
                      rgbString={rgbString}
                      hexCode={hexCode}
                      alpha={alpha}
                      colorNameSuggestion={colorNameSuggestion}
                      colorMood={colorMood}
                    />
                  </Box>
                </TabsContent>
                <TabsContent value="preview">
                  <Box className="pt-4">
                    <PreviewTab
                      hexCode={hexCode}
                      alpha={alpha}
                      textColor={textColor}
                    />
                  </Box>
                </TabsContent>
                <TabsContent value="accessibility">
                  <Box className="pt-4">
                    <AccessibilityTab
                      hexCode={hexCode}
                      alpha={alpha}
                      contrastRatios={contrastRatios}
                    />
                  </Box>
                </TabsContent>
              </Tabs>
            </CardBody>
          </Card>
        </div>
      </div>

      <ColorEditor
        hexCode={hexCode}
        handleColorPicker={handleColorPicker}
        red={red}
        setRed={setRed}
        green={green}
        setGreen={setGreen}
        blue={blue}
        setBlue={setBlue}
        alpha={alpha}
        setAlpha={setAlpha}
      />

      <SavedPalette
        savedColors={savedColors}
        exportPalette={exportPalette}
        loadColor={loadColor}
        deleteColor={deleteColor}
      />
    </Stack>
  );
};

export default ColorTester;
