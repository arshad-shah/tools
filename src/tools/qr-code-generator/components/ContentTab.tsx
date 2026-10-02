import React from 'react';
import { Button, Card, CardBody, Grid, Label, Stack } from '@/shared/ui';
import { QR_TYPE_OPTIONS } from '../lib/options';
import type {
  ContactData,
  CryptoData,
  QRCodeState,
  QRCodeType,
  WifiData,
} from '../types';
import { ContactForm } from './ContactForm';
import { CryptoForm } from './CryptoForm';
import { TextUrlForm } from './TextUrlForm';
import { WifiForm } from './WifiForm';

export const ContentTab: React.FC<{
  state: QRCodeState;
  setText: (text: string) => void;
  setQrType: (qrType: QRCodeType) => void;
  setContactData: (data: Partial<ContactData>) => void;
  setWifiData: (data: Partial<WifiData>) => void;
  setCryptoData: (data: Partial<CryptoData>) => void;
}> = ({
  state,
  setText,
  setQrType,
  setContactData,
  setWifiData,
  setCryptoData,
}) => {
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
        return <WifiForm wifiData={state.wifiData} setWifiData={setWifiData} />;
      case 'crypto':
        return (
          <CryptoForm
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
    <Stack gap="4">
      <Stack gap="2">
        <Label>QR code type</Label>
        <Grid cols={{ base: 2, sm: 3 }} gap="2">
          {QR_TYPE_OPTIONS.map((t) => (
            <Button
              key={t.value}
              variant={state.qrType === t.value ? 'primary' : 'secondary'}
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
      <Card>
        <CardBody>{renderContentForm()}</CardBody>
      </Card>
    </Stack>
  );
};
