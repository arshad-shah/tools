import React from 'react';
import {
  IconBuilding2,
  IconMail,
  IconPhone,
  IconUser,
} from '@/shared/ui/icons';

import { Input, Label, Stack } from '@/shared/ui';
import type { ContactData } from '../types';

export const ContactForm: React.FC<{
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
        leadingSlot={<IconUser size="sm" />}
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
        leadingSlot={<IconPhone size="sm" />}
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
        leadingSlot={<IconMail size="sm" />}
      />
    </Stack>
    <Stack gap="2">
      <Label htmlFor="contact-company">Company</Label>
      <Input
        id="contact-company"
        value={contactData.company}
        onChange={(v) => setContactData({ company: v })}
        placeholder="Company or organisation (optional)"
        leadingSlot={<IconBuilding2 size="sm" />}
      />
    </Stack>
  </Stack>
);
