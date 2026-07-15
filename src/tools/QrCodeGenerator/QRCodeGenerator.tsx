import React, { useState } from 'react';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import {
  AlertTriangle,
  Bitcoin,
  Building2,
  Coins,
  Download,
  FileImage,
  FileText,
  Hash,
  Info,
  Key,
  KeyRound,
  Layers,
  Link as LinkIcon,
  Mail,
  Palette,
  Phone,
  RefreshCw,
  Settings as SettingsIcon,
  Shield,
  ShieldOff,
  User,
  Wallet,
  Wifi,
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Box,
  Button,
  ButtonGroup,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Center,
  Checkbox,
  Code,
  Grid,
  Inline,
  Input,
  Label,
  NumberInput,
  Select,
  Slider,
  Spinner,
  Stack,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
  Textarea,
} from '@arshad-shah/cynosure-react';
import { useQRCode } from './hooks/useQrCode';
import {
  ContactData,
  CryptoData,
  CryptoType,
  EncryptionType,
  ErrorCorrectionLevel,
  QRCodeType,
  WifiData,
} from '../../types/qrTypes';

const QR_TYPE_OPTIONS: Array<{
  value: QRCodeType;
  label: string;
  icon: React.ReactNode;
}> = [
  { value: 'url', label: 'URL', icon: <LinkIcon size={16} aria-hidden /> },
  { value: 'text', label: 'Text', icon: <FileText size={16} aria-hidden /> },
  { value: 'contact', label: 'Contact', icon: <User size={16} aria-hidden /> },
  { value: 'wifi', label: 'WiFi', icon: <Wifi size={16} aria-hidden /> },
  { value: 'crypto', label: 'Crypto', icon: <Coins size={16} aria-hidden /> },
  {
    value: 'custom',
    label: 'Custom',
    icon: <SettingsIcon size={16} aria-hidden />,
  },
];

const ENCRYPTION_OPTIONS: Array<{ value: EncryptionType; label: string }> = [
  { value: 'none', label: 'None' },
  { value: 'aes', label: 'AES-256' },
  { value: 'tripledes', label: 'Triple DES' },
  { value: 'rc4', label: 'RC4' },
  { value: 'rabbit', label: 'Rabbit Stream Cipher' },
];

const CRYPTO_OPTIONS = [
  { value: 'BTC', label: 'Bitcoin (BTC)' },
  { value: 'ETH', label: 'Ethereum (ETH)' },
  { value: 'LTC', label: 'Litecoin (LTC)' },
  { value: 'XRP', label: 'Ripple (XRP)' },
  { value: 'DOGE', label: 'Dogecoin (DOGE)' },
  { value: 'ADA', label: 'Cardano (ADA)' },
  { value: 'DOT', label: 'Polkadot (DOT)' },
];

const WIFI_ENCRYPTION_OPTIONS = [
  { value: 'WPA', label: 'WPA/WPA2/WPA3' },
  { value: 'WEP', label: 'WEP (Legacy)' },
  { value: 'nopass', label: 'None (Open Network)' },
];

const ERROR_LEVELS: ErrorCorrectionLevel[] = ['L', 'M', 'Q', 'H'];
const ERROR_LEVEL_PCT: Record<ErrorCorrectionLevel, string> = {
  L: '7%',
  M: '15%',
  Q: '25%',
  H: '30%',
};

const TextUrlForm: React.FC<{
  text: string;
  setText: (text: string) => void;
  isUrl: boolean;
}> = ({ text, setText, isUrl }) => {
  const isValidUrl = () => {
    if (!isUrl || !text) return true;
    try {
      new URL(text);
      return true;
    } catch {
      return false;
    }
  };
  const invalid = isUrl && text.length > 0 && !isValidUrl();
  return (
    <Stack gap="3">
      <Stack gap="2">
        <Label htmlFor="qr-text-input">
          {isUrl ? 'URL address' : 'Text content'}
        </Label>
        <Textarea
          id="qr-text-input"
          value={text}
          onChange={setText}
          rows={5}
          invalid={invalid}
          placeholder={isUrl ? 'https://example.com' : 'Enter text here…'}
          aria-label={isUrl ? 'URL' : 'Text content'}
        />
        {!isUrl && text.length > 0 && (
          <Inline gap="2" wrap>
            <Badge variant="soft" colorScheme="accent" size="xs">
              {text.length} characters
            </Badge>
            <Badge variant="soft" colorScheme="accent" size="xs">
              {text.split(/\s+/).filter((w) => w.length > 0).length} words
            </Badge>
          </Inline>
        )}
      </Stack>
      {invalid && (
        <Alert status="danger" variant="soft">
          <AlertDescription>
            Please enter a valid URL (e.g. https://example.com).
          </AlertDescription>
        </Alert>
      )}
      {isUrl && text && text.startsWith('http://') && (
        <Alert status="warning" variant="soft">
          <AlertDescription>
            Consider using HTTPS for better security.
          </AlertDescription>
        </Alert>
      )}
    </Stack>
  );
};

const ContactForm: React.FC<{
  contactData: ContactData;
  setContactData: (data: Partial<ContactData>) => void;
}> = ({ contactData, setContactData }) => (
  <Stack gap="3">
    <Stack gap="2">
      <Label htmlFor="contact-name">Full name</Label>
      <Input
        id="contact-name"
        value={contactData.name}
        onChange={(v) => setContactData({ name: v })}
        placeholder="Enter full name"
        leadingSlot={<User size={16} aria-hidden />}
      />
    </Stack>
    <Stack gap="2">
      <Label htmlFor="contact-phone">Phone number</Label>
      <Input
        id="contact-phone"
        type="tel"
        value={contactData.phone}
        onChange={(v) => setContactData({ phone: v })}
        placeholder="+1 (123) 456-7890"
        leadingSlot={<Phone size={16} aria-hidden />}
      />
    </Stack>
    <Stack gap="2">
      <Label htmlFor="contact-email">Email address</Label>
      <Input
        id="contact-email"
        type="email"
        value={contactData.email}
        onChange={(v) => setContactData({ email: v })}
        placeholder="name@example.com"
        leadingSlot={<Mail size={16} aria-hidden />}
      />
    </Stack>
    <Stack gap="2">
      <Label htmlFor="contact-company">Company</Label>
      <Input
        id="contact-company"
        value={contactData.company}
        onChange={(v) => setContactData({ company: v })}
        placeholder="Company or organisation (optional)"
        leadingSlot={<Building2 size={16} aria-hidden />}
      />
    </Stack>
  </Stack>
);

const WifiFormPanel: React.FC<{
  wifiData: WifiData;
  setWifiData: (data: Partial<WifiData>) => void;
}> = ({ wifiData, setWifiData }) => {
  return (
    <Stack gap="3">
      <Stack gap="2">
        <Label htmlFor="wifi-ssid">Network name (SSID)</Label>
        <Input
          id="wifi-ssid"
          value={wifiData.ssid}
          onChange={(v) => setWifiData({ ssid: v })}
          placeholder="Enter network name"
          leadingSlot={<Wifi size={16} aria-hidden />}
        />
      </Stack>
      <Stack gap="2">
        <Label htmlFor="wifi-password">Password</Label>
        <Input
          id="wifi-password"
          type="password"
          value={wifiData.password}
          onChange={(v) => setWifiData({ password: v })}
          placeholder="Enter network password"
          leadingSlot={<KeyRound size={16} aria-hidden />}
        />
      </Stack>
      <Stack gap="2">
        <Label htmlFor="wifi-encryption">Encryption</Label>
        <Select
          id="wifi-encryption"
          value={wifiData.encryption}
          onValueChange={(v) => setWifiData({ encryption: v })}
          items={WIFI_ENCRYPTION_OPTIONS}
          aria-label="Encryption type"
        />
        {wifiData.encryption === 'WEP' && (
          <Alert status="warning" variant="soft">
            <AlertDescription>
              WEP is considered insecure and deprecated. Use WPA2/WPA3 if
              possible.
            </AlertDescription>
          </Alert>
        )}
      </Stack>
      <Inline align="center" gap="2">
        <Checkbox
          checked={wifiData.isHidden}
          onCheckedChange={(c) => setWifiData({ isHidden: Boolean(c) })}
          aria-label="Hidden network"
        />
        <Label>Hidden network</Label>
      </Inline>
    </Stack>
  );
};

const CryptoFormPanel: React.FC<{
  cryptoData: CryptoData;
  setCryptoData: (data: Partial<CryptoData>) => void;
}> = ({ cryptoData, setCryptoData }) => (
  <Stack gap="3">
    <Stack gap="2">
      <Label htmlFor="crypto-currency">Cryptocurrency</Label>
      <Select
        id="crypto-currency"
        value={cryptoData.currency}
        onValueChange={(v) => setCryptoData({ currency: v as CryptoType })}
        items={CRYPTO_OPTIONS}
        aria-label="Cryptocurrency"
      />
    </Stack>
    <Stack gap="2">
      <Label htmlFor="crypto-key">Wallet address</Label>
      <Input
        id="crypto-key"
        value={cryptoData.publicKey}
        onChange={(v) => setCryptoData({ publicKey: v })}
        placeholder={`Enter your ${cryptoData.currency} wallet address`}
        leadingSlot={<Wallet size={16} aria-hidden />}
      />
    </Stack>
    <Stack gap="2">
      <Label htmlFor="crypto-amount">Amount (optional)</Label>
      <Input
        id="crypto-amount"
        value={cryptoData.amount}
        onChange={(v) => setCryptoData({ amount: v })}
        placeholder="0.00"
        leadingSlot={<Bitcoin size={16} aria-hidden />}
      />
    </Stack>
    {cryptoData.publicKey && (
      <Code variant="block" size="sm">
        {cryptoData.publicKey}
      </Code>
    )}
  </Stack>
);

const COLOR_PRESETS = [
  { bg: '#FFFFFF', fg: '#000000', name: 'Classic' },
  { bg: '#0F172A', fg: '#FFFFFF', name: 'Dark' },
  { bg: '#FFFFFF', fg: '#10B981', name: 'Emerald' },
  { bg: '#F0FDF4', fg: '#047857', name: 'Green' },
  { bg: '#ECFDF5', fg: '#0D9488', name: 'Teal' },
  { bg: '#FFFFFF', fg: '#0369A1', name: 'Blue' },
];

const QRCodeGenerator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'content' | 'appearance' | 'encryption'
  >('content');

  const {
    state,
    qrRef,
    setText,
    setSize,
    setQrType,
    setBackgroundColor,
    setForegroundColor,
    setErrorCorrectionLevel,
    setIncludeMargin,
    setRenderAs,
    setUseImage,
    setImageSettings,
    setContactData,
    setWifiData,
    setCryptoData,
    setEncryptionConfig,
    setMaskPattern,
    setVersion,
    generateRandomIV,
    generateRandomSalt,
    handleDownloadQRCode,
  } = useQRCode();

  const renderContentForm = () => {
    switch (state.qrType) {
      case 'url':
      case 'text':
        return (
          <TextUrlForm
            text={state.text}
            setText={setText}
            isUrl={state.qrType === 'url'}
          />
        );
      case 'contact':
        return (
          <ContactForm
            contactData={state.contactData}
            setContactData={setContactData}
          />
        );
      case 'wifi':
        return (
          <WifiFormPanel wifiData={state.wifiData} setWifiData={setWifiData} />
        );
      case 'crypto':
        return (
          <CryptoFormPanel
            cryptoData={state.cryptoData}
            setCryptoData={setCryptoData}
          />
        );
      default:
        return (
          <TextUrlForm text={state.text} setText={setText} isUrl={false} />
        );
    }
  };

  return (
    <Grid
      templateColumns={{ base: '1fr', lg: 'minmax(0, 3fr) minmax(0, 2fr)' }}
      gap="6"
    >
      <Box minWidth="0">
        <Card variant="elevated" size="md">
          <CardBody>
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as typeof activeTab)}
              variant="soft"
              colorScheme="accent"
              fullWidth
            >
              <TabsList aria-label="QR sections">
                <TabsTrigger value="content">
                  <Inline gap="2" align="center" wrap={false}>
                    <Layers size={14} aria-hidden />
                    <span>Content</span>
                  </Inline>
                </TabsTrigger>
                <TabsTrigger value="appearance">
                  <Inline gap="2" align="center" wrap={false}>
                    <Palette size={14} aria-hidden />
                    <span>Appearance</span>
                  </Inline>
                </TabsTrigger>
                <TabsTrigger value="encryption">
                  <Inline gap="2" align="center" wrap={false}>
                    <Shield size={14} aria-hidden />
                    <span>Encryption</span>
                  </Inline>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="content">
                <Box paddingTop="4">
                  <Stack gap="4">
                    <Stack gap="2">
                      <Label>QR code type</Label>
                      <Grid columns={{ base: 2, sm: 3 }} gap="2">
                        {QR_TYPE_OPTIONS.map((t) => (
                          <Button
                            key={t.value}
                            variant={
                              state.qrType === t.value ? 'solid' : 'soft'
                            }
                            colorScheme={
                              state.qrType === t.value ? 'accent' : 'neutral'
                            }
                            size="sm"
                            leftIcon={t.icon}
                            onClick={() => setQrType(t.value)}
                            fullWidth
                          >
                            {t.label}
                          </Button>
                        ))}
                      </Grid>
                    </Stack>
                    <Card variant="filled" size="sm">
                      <CardBody>{renderContentForm()}</CardBody>
                    </Card>
                  </Stack>
                </Box>
              </TabsContent>

              <TabsContent value="appearance">
                <Box paddingTop="4">
                  <Stack gap="4">
                    <Card variant="filled" size="sm">
                      <CardBody>
                        <Stack gap="3">
                          <Inline justify="between" align="center">
                            <Label>QR code size</Label>
                            <Badge
                              variant="soft"
                              colorScheme="accent"
                              size="sm"
                            >
                              {state.size}px
                            </Badge>
                          </Inline>
                          <Slider
                            value={state.size}
                            onChange={(v) => setSize(v as number)}
                            minValue={100}
                            maxValue={500}
                            step={20}
                            aria-label="QR size"
                          />
                        </Stack>
                      </CardBody>
                    </Card>

                    <Card variant="filled" size="sm">
                      <CardBody>
                        <Stack gap="3">
                          <Label>Colour presets</Label>
                          <Grid columns={{ base: 3, sm: 6 }} gap="2">
                            {COLOR_PRESETS.map((p) => (
                              <Button
                                key={p.name}
                                variant={
                                  p.bg === state.backgroundColor &&
                                  p.fg === state.foregroundColor
                                    ? 'solid'
                                    : 'soft'
                                }
                                colorScheme={
                                  p.bg === state.backgroundColor &&
                                  p.fg === state.foregroundColor
                                    ? 'accent'
                                    : 'neutral'
                                }
                                size="sm"
                                onClick={() => {
                                  setBackgroundColor(p.bg);
                                  setForegroundColor(p.fg);
                                }}
                              >
                                {p.name}
                              </Button>
                            ))}
                          </Grid>
                          <Grid columns={{ base: 1, md: 2 }} gap="3">
                            <Stack gap="2">
                              <Label htmlFor="bg-color">Background</Label>
                              <Input
                                id="bg-color"
                                value={state.backgroundColor}
                                onChange={setBackgroundColor}
                                placeholder="#FFFFFF"
                              />
                            </Stack>
                            <Stack gap="2">
                              <Label htmlFor="fg-color">Foreground</Label>
                              <Input
                                id="fg-color"
                                value={state.foregroundColor}
                                onChange={setForegroundColor}
                                placeholder="#000000"
                              />
                            </Stack>
                          </Grid>
                        </Stack>
                      </CardBody>
                    </Card>

                    <Card variant="filled" size="sm">
                      <CardBody>
                        <Stack gap="3">
                          <Label>Error correction</Label>
                          <ButtonGroup>
                            {ERROR_LEVELS.map((level) => (
                              <Button
                                key={level}
                                variant={
                                  state.errorCorrectionLevel === level
                                    ? 'solid'
                                    : 'soft'
                                }
                                colorScheme={
                                  state.errorCorrectionLevel === level
                                    ? 'accent'
                                    : 'neutral'
                                }
                                size="sm"
                                onClick={() => setErrorCorrectionLevel(level)}
                              >
                                {level} ({ERROR_LEVEL_PCT[level]})
                              </Button>
                            ))}
                          </ButtonGroup>
                          <Text size="xs" variant="caption">
                            Higher levels make the QR more resistant to damage
                            but denser.
                          </Text>
                        </Stack>
                      </CardBody>
                    </Card>

                    <Card variant="filled" size="sm">
                      <CardBody>
                        <Stack gap="3">
                          <Label>Output format</Label>
                          <ButtonGroup>
                            <Button
                              variant={
                                state.renderAs === 'canvas' ? 'solid' : 'soft'
                              }
                              colorScheme={
                                state.renderAs === 'canvas'
                                  ? 'accent'
                                  : 'neutral'
                              }
                              size="sm"
                              onClick={() => setRenderAs('canvas')}
                            >
                              PNG
                            </Button>
                            <Button
                              variant={
                                state.renderAs === 'svg' ? 'solid' : 'soft'
                              }
                              colorScheme={
                                state.renderAs === 'svg' ? 'accent' : 'neutral'
                              }
                              size="sm"
                              onClick={() => setRenderAs('svg')}
                            >
                              SVG
                            </Button>
                          </ButtonGroup>
                          <Inline justify="between" align="center" wrap>
                            <Stack gap="0">
                              <Label htmlFor="include-margin">
                                Include margin
                              </Label>
                              <Text size="xs" variant="caption">
                                Adds white space around the QR
                              </Text>
                            </Stack>
                            <Switch
                              id="include-margin"
                              checked={state.includeMargin}
                              onCheckedChange={setIncludeMargin}
                            />
                          </Inline>
                        </Stack>
                      </CardBody>
                    </Card>

                    <Card variant="filled" size="sm">
                      <CardBody>
                        <Stack gap="3">
                          <Inline justify="between" align="center">
                            <Inline align="center" gap="2">
                              <FileImage size={16} aria-hidden />
                              <Label htmlFor="use-image">Logo / image</Label>
                            </Inline>
                            <Switch
                              id="use-image"
                              checked={state.useImage}
                              onCheckedChange={setUseImage}
                            />
                          </Inline>
                          {state.useImage && (
                            <Stack gap="3">
                              <Stack gap="2">
                                <Label htmlFor="logo-url">Logo URL</Label>
                                <Input
                                  id="logo-url"
                                  value={state.imageSettings.src}
                                  onChange={(v) =>
                                    setImageSettings({
                                      ...state.imageSettings,
                                      src: v,
                                    })
                                  }
                                  placeholder="https://example.com/logo.png"
                                />
                              </Stack>
                              <Grid columns={2} gap="3">
                                <Stack gap="2">
                                  <Label htmlFor="logo-width">Width (px)</Label>
                                  <NumberInput
                                    id="logo-width"
                                    value={state.imageSettings.width}
                                    onChange={(v) =>
                                      setImageSettings({
                                        ...state.imageSettings,
                                        width: v ?? 10,
                                      })
                                    }
                                    minValue={10}
                                    maxValue={state.size / 2}
                                    aria-label="Logo width"
                                  />
                                </Stack>
                                <Stack gap="2">
                                  <Label htmlFor="logo-height">
                                    Height (px)
                                  </Label>
                                  <NumberInput
                                    id="logo-height"
                                    value={state.imageSettings.height}
                                    onChange={(v) =>
                                      setImageSettings({
                                        ...state.imageSettings,
                                        height: v ?? 10,
                                      })
                                    }
                                    minValue={10}
                                    maxValue={state.size / 2}
                                    aria-label="Logo height"
                                  />
                                </Stack>
                              </Grid>
                              <Inline align="center" gap="2">
                                <Checkbox
                                  checked={state.imageSettings.excavate}
                                  onCheckedChange={(c) =>
                                    setImageSettings({
                                      ...state.imageSettings,
                                      excavate: Boolean(c),
                                    })
                                  }
                                  aria-label="Excavate"
                                />
                                <Label>Excavate (clear QR behind logo)</Label>
                              </Inline>
                            </Stack>
                          )}
                        </Stack>
                      </CardBody>
                    </Card>

                    <Accordion
                      type="single"
                      collapsible
                      variant="contained"
                      size="md"
                    >
                      <AccordionItem value="advanced">
                        <AccordionTrigger>
                          <Inline align="center" gap="2">
                            <SettingsIcon size={16} aria-hidden />
                            <Text weight="medium">
                              Advanced technical settings
                            </Text>
                          </Inline>
                        </AccordionTrigger>
                        <AccordionContent>
                          <Stack gap="3">
                            <Stack gap="2">
                              <Label htmlFor="qr-version">
                                QR version (0 for auto)
                              </Label>
                              <NumberInput
                                id="qr-version"
                                value={state.version}
                                onChange={(v) => setVersion(v ?? 0)}
                                minValue={0}
                                maxValue={40}
                                aria-label="QR version"
                              />
                            </Stack>
                            <Stack gap="2">
                              <Label htmlFor="mask-pattern">
                                Mask pattern (-1 for auto)
                              </Label>
                              <NumberInput
                                id="mask-pattern"
                                value={state.maskPattern}
                                onChange={(v) => setMaskPattern(v ?? -1)}
                                minValue={-1}
                                maxValue={7}
                                aria-label="Mask pattern"
                              />
                            </Stack>
                          </Stack>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </Stack>
                </Box>
              </TabsContent>

              <TabsContent value="encryption">
                <Box paddingTop="4">
                  <Stack gap="4">
                    <Card variant="filled" size="sm">
                      <CardBody>
                        <Stack gap="3">
                          <Inline align="center" gap="2">
                            <Shield size={18} aria-hidden />
                            <Label>Encryption method</Label>
                          </Inline>
                          <Select
                            value={state.encryptionConfig.type}
                            onValueChange={(v) =>
                              setEncryptionConfig({ type: v as EncryptionType })
                            }
                            items={ENCRYPTION_OPTIONS}
                            aria-label="Encryption method"
                          />
                        </Stack>
                      </CardBody>
                    </Card>

                    {state.encryptionConfig.type === 'none' ? (
                      <Alert
                        status="info"
                        variant="soft"
                        icon={<ShieldOff aria-hidden />}
                      >
                        <AlertDescription>
                          Your QR code data will not be encrypted. Anyone who
                          scans it will be able to read its contents.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <>
                        <Card variant="filled" size="sm">
                          <CardBody>
                            <Stack gap="3">
                              <Inline align="center" gap="2">
                                <Key size={18} aria-hidden />
                                <Label htmlFor="enc-key">Encryption key</Label>
                              </Inline>
                              <Input
                                id="enc-key"
                                value={state.encryptionConfig.key}
                                onChange={(v) =>
                                  setEncryptionConfig({ key: v })
                                }
                                placeholder="Enter a secret key"
                              />
                              <Text size="xs" variant="caption">
                                This key will be needed to decrypt the QR code.
                              </Text>
                              {(state.encryptionConfig.type === 'aes' ||
                                state.encryptionConfig.type ===
                                  'tripledes') && (
                                <>
                                  <Stack gap="2">
                                    <Label htmlFor="enc-iv">
                                      Initialization vector (IV)
                                    </Label>
                                    <Inline gap="2">
                                      <Box flex="1" minWidth="0">
                                        <Input
                                          id="enc-iv"
                                          value={
                                            state.encryptionConfig.iv ?? ''
                                          }
                                          onChange={(v) =>
                                            setEncryptionConfig({ iv: v })
                                          }
                                          placeholder="16 characters"
                                        />
                                      </Box>
                                      <Button
                                        variant="soft"
                                        colorScheme="accent"
                                        leftIcon={<RefreshCw size={14} />}
                                        onClick={generateRandomIV}
                                      >
                                        Generate
                                      </Button>
                                    </Inline>
                                  </Stack>
                                  {state.encryptionConfig.type === 'aes' && (
                                    <Stack gap="2">
                                      <Inline align="center" gap="2">
                                        <Hash size={14} aria-hidden />
                                        <Label htmlFor="enc-salt">
                                          Salt (optional)
                                        </Label>
                                      </Inline>
                                      <Inline gap="2">
                                        <Box flex="1" minWidth="0">
                                          <Input
                                            id="enc-salt"
                                            value={
                                              state.encryptionConfig.salt ?? ''
                                            }
                                            onChange={(v) =>
                                              setEncryptionConfig({ salt: v })
                                            }
                                            placeholder="8+ characters"
                                          />
                                        </Box>
                                        <Button
                                          variant="soft"
                                          colorScheme="accent"
                                          leftIcon={<RefreshCw size={14} />}
                                          onClick={generateRandomSalt}
                                        >
                                          Generate
                                        </Button>
                                      </Inline>
                                    </Stack>
                                  )}
                                </>
                              )}
                            </Stack>
                          </CardBody>
                        </Card>

                        <Alert
                          status="warning"
                          variant="soft"
                          icon={<AlertTriangle aria-hidden />}
                        >
                          <AlertTitle>Important</AlertTitle>
                          <AlertDescription>
                            The recipient needs the same encryption method and
                            key to decode this QR code. Keep your key secure and
                            share it through a separate channel.
                          </AlertDescription>
                        </Alert>

                        <Alert
                          status="info"
                          variant="soft"
                          icon={<Shield aria-hidden />}
                        >
                          <AlertDescription>
                            <Stack gap="1">
                              <Text size="sm" weight="semibold">
                                Encryption details
                              </Text>
                              <Text size="xs">
                                • AES-256 offers strongest security
                              </Text>
                              <Text size="xs">
                                • Triple DES is widely supported but slower
                              </Text>
                              <Text size="xs">
                                • RC4 is fast but has known vulnerabilities
                              </Text>
                              <Text size="xs">
                                • Rabbit balances speed and security
                              </Text>
                            </Stack>
                          </AlertDescription>
                        </Alert>
                      </>
                    )}
                  </Stack>
                </Box>
              </TabsContent>
            </Tabs>
          </CardBody>
        </Card>
      </Box>

      <Box minWidth="0">
        <Card variant="elevated" size="md">
          <CardHeader>
            <CardTitle as="h3">QR code preview</CardTitle>
          </CardHeader>
          <CardBody>
            <Stack gap="4" align="center">
              <Card variant="filled" size="sm">
                <CardBody>
                  <Center>
                    {state.isProcessing ? (
                      <Stack gap="3" align="center">
                        <Spinner size="lg" colorScheme="accent" />
                        <Text size="sm" variant="caption">
                          Processing…
                        </Text>
                      </Stack>
                    ) : (
                      <div ref={qrRef}>
                        {state.renderAs === 'svg' ? (
                          <QRCodeSVG
                            value={state.finalData || ' '}
                            size={state.size}
                            bgColor={state.backgroundColor}
                            fgColor={state.foregroundColor}
                            level={state.errorCorrectionLevel}
                            includeMargin={state.includeMargin}
                            imageSettings={
                              state.useImage && state.imageSettings.src
                                ? state.imageSettings
                                : undefined
                            }
                            minVersion={state.version > 0 ? state.version : 1}
                          />
                        ) : (
                          <QRCodeCanvas
                            value={state.finalData || ' '}
                            size={state.size}
                            bgColor={state.backgroundColor}
                            fgColor={state.foregroundColor}
                            level={state.errorCorrectionLevel}
                            includeMargin={state.includeMargin}
                            imageSettings={
                              state.useImage && state.imageSettings.src
                                ? state.imageSettings
                                : undefined
                            }
                            minVersion={state.version > 0 ? state.version : 1}
                          />
                        )}
                      </div>
                    )}
                  </Center>
                </CardBody>
              </Card>
              <Badge variant="soft" colorScheme="neutral" size="sm">
                {state.renderAs === 'svg' ? 'SVG format' : 'PNG format'}
              </Badge>
              <Button
                onClick={handleDownloadQRCode}
                variant="solid"
                colorScheme="accent"
                size="md"
                fullWidth
                leftIcon={<Download size={18} />}
              >
                Download QR code
              </Button>
              <Alert status="info" variant="soft" icon={<Info aria-hidden />}>
                <AlertDescription>
                  <Stack gap="1">
                    <Text size="sm">
                      <Text as="span" weight="semibold">
                        Error correction:
                      </Text>{' '}
                      {state.errorCorrectionLevel} (
                      {ERROR_LEVEL_PCT[state.errorCorrectionLevel]})
                    </Text>
                    {state.encryptionConfig.type !== 'none' && (
                      <Text size="sm">
                        <Text as="span" weight="semibold">
                          Encryption:
                        </Text>{' '}
                        {state.encryptionConfig.type.toUpperCase()}
                      </Text>
                    )}
                  </Stack>
                </AlertDescription>
              </Alert>
              <Card variant="filled" size="sm">
                <CardHeader>
                  <CardTitle as="h4">Tips</CardTitle>
                </CardHeader>
                <CardBody>
                  <Stack gap="1">
                    <Text size="xs">
                      • Higher error correction improves scan reliability
                    </Text>
                    <Text size="xs">
                      • Ensure good contrast between foreground and background
                    </Text>
                    <Text size="xs">
                      • Test your QR code on multiple devices
                    </Text>
                  </Stack>
                </CardBody>
              </Card>
            </Stack>
          </CardBody>
        </Card>
      </Box>
    </Grid>
  );
};

export default QRCodeGenerator;
