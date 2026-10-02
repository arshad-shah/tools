import type { MockSchema } from '@/shared/lib/data-formats/mock-schema';

export const PRESET_IDS = ['users', 'orders', 'products', 'events'] as const;
export type PresetId = (typeof PRESET_IDS)[number];

export const PRESET_LABEL: Record<PresetId, string> = {
  users: 'Users',
  orders: 'Orders',
  products: 'Products',
  events: 'Events',
};

/** Starting schemas; Orders references Users to show relations. */
export const PRESETS: Record<PresetId, MockSchema> = {
  users: {
    tables: [
      {
        name: 'users',
        fields: [
          { name: 'id', type: 'uuid', unique: true },
          { name: 'name', type: 'fullName' },
          { name: 'email', type: 'email', unique: true },
          { name: 'phone', type: 'phone', nullablePct: 10 },
          {
            name: 'birthday',
            type: 'date',
            dateFrom: '1950-01-01',
            dateTo: '2006-12-31',
          },
          {
            name: 'address',
            type: 'object',
            fields: [
              { name: 'street', type: 'street' },
              { name: 'city', type: 'city' },
              { name: 'postcode', type: 'zipCode' },
              { name: 'country', type: 'country' },
            ],
          },
          { name: 'avatar', type: 'avatar' },
          { name: 'createdAt', type: 'dateTime' },
        ],
      },
    ],
  },
  orders: {
    tables: [
      {
        name: 'users',
        count: 50,
        fields: [
          { name: 'id', type: 'uuid', unique: true },
          { name: 'name', type: 'fullName' },
          { name: 'email', type: 'email', unique: true },
        ],
      },
      {
        name: 'orders',
        fields: [
          { name: 'id', type: 'sequence', min: 1000 },
          { name: 'userId', type: 'foreign-key', table: 'users', field: 'id' },
          {
            name: 'status',
            type: 'enum',
            enum: [
              { value: 'pending', weight: 2 },
              { value: 'paid', weight: 5 },
              { value: 'shipped', weight: 4 },
              { value: 'refunded', weight: 1 },
            ],
          },
          { name: 'total', type: 'price', min: 5, max: 900 },
          { name: 'currency', type: 'currencyCode' },
          { name: 'placedAt', type: 'dateTime', dateFrom: '2024-01-01' },
        ],
      },
    ],
  },
  products: {
    tables: [
      {
        name: 'products',
        fields: [
          {
            name: 'sku',
            type: 'pattern',
            pattern: '[A-Z]{3}-\\d{5}',
            unique: true,
          },
          { name: 'name', type: 'productName' },
          { name: 'description', type: 'sentence' },
          { name: 'price', type: 'price', min: 1, max: 500 },
          { name: 'stock', type: 'int', min: 0, max: 1000 },
          { name: 'active', type: 'boolean' },
          {
            name: 'tags',
            type: 'array',
            arraySize: 3,
            fields: [{ name: 'tag', type: 'word' }],
          },
        ],
      },
    ],
  },
  events: {
    tables: [
      {
        name: 'events',
        fields: [
          { name: 'id', type: 'nanoid' },
          { name: 'timestamp', type: 'timestamp', dateFrom: '2025-01-01' },
          {
            name: 'type',
            type: 'enum',
            enum: [
              { value: 'page_view', weight: 10 },
              { value: 'click', weight: 6 },
              { value: 'signup', weight: 1 },
              { value: 'purchase', weight: 1 },
            ],
          },
          { name: 'url', type: 'url' },
          { name: 'ip', type: 'ipAddress' },
          { name: 'sessionId', type: 'uuid' },
          { name: 'durationMs', type: 'int', min: 5, max: 60000 },
        ],
      },
    ],
  },
};

export const isPresetId = (v: unknown): v is PresetId =>
  (PRESET_IDS as readonly unknown[]).includes(v);
