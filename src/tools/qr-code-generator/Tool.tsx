import React, { useState } from 'react';
import { IconLayers, IconPalette, IconShield } from '@/shared/ui/icons';

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
import { AdvancedSettings } from './components/AdvancedSettings';
import { ContentTab } from './components/ContentTab';
import { EncryptionTab } from './components/EncryptionTab';
import { LogoPanel } from './components/LogoPanel';
import { QrPreview } from './components/QrPreview';
import { StylePanel } from './components/StylePanel';
import { useQRCode } from './hooks/useQrCode';

const QRCodeGenerator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'content' | 'appearance' | 'encryption'
  >('content');

  const {
    state,
    finalData,
    encryptionError,
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

  return (
    <Box className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Box className="min-w-0">
        <Card>
          <CardBody>
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as typeof activeTab)}
              variant="soft"
              fullWidth
            >
              <TabsList aria-label="QR sections">
                <TabsTrigger value="content">
                  <Inline gap="2" align="center" wrap={false}>
                    <IconLayers size="sm" />
                    <span>Content</span>
                  </Inline>
                </TabsTrigger>
                <TabsTrigger value="appearance">
                  <Inline gap="2" align="center" wrap={false}>
                    <IconPalette size="sm" />
                    <span>Appearance</span>
                  </Inline>
                </TabsTrigger>
                <TabsTrigger value="encryption">
                  <Inline gap="2" align="center" wrap={false}>
                    <IconShield size="sm" />
                    <span>Encryption</span>
                  </Inline>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="content">
                <Box className="pt-4">
                  <ContentTab
                    state={state}
                    setText={setText}
                    setQrType={setQrType}
                    setContactData={setContactData}
                    setWifiData={setWifiData}
                    setCryptoData={setCryptoData}
                  />
                </Box>
              </TabsContent>

              <TabsContent value="appearance">
                <Box className="pt-4">
                  <Stack gap="4">
                    <StylePanel
                      state={state}
                      setSize={setSize}
                      setBackgroundColor={setBackgroundColor}
                      setForegroundColor={setForegroundColor}
                      setErrorCorrectionLevel={setErrorCorrectionLevel}
                      setRenderAs={setRenderAs}
                      setIncludeMargin={setIncludeMargin}
                    />
                    <LogoPanel
                      state={state}
                      setUseImage={setUseImage}
                      setImageSettings={setImageSettings}
                    />
                    <AdvancedSettings
                      state={state}
                      setVersion={setVersion}
                      setMaskPattern={setMaskPattern}
                    />
                  </Stack>
                </Box>
              </TabsContent>

              <TabsContent value="encryption">
                <Box className="pt-4">
                  <EncryptionTab
                    encryptionConfig={state.encryptionConfig}
                    setEncryptionConfig={setEncryptionConfig}
                    generateRandomIV={generateRandomIV}
                    generateRandomSalt={generateRandomSalt}
                  />
                </Box>
              </TabsContent>
            </Tabs>
          </CardBody>
        </Card>
      </Box>

      <Box className="min-w-0">
        <QrPreview
          state={state}
          finalData={finalData}
          encryptionError={encryptionError}
          qrRef={qrRef}
          onDownload={handleDownloadQRCode}
        />
      </Box>
    </Box>
  );
};

export default QRCodeGenerator;
