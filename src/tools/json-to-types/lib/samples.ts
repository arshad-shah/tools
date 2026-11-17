/** Example inputs for "Try an example". */
export const SAMPLES: { label: string; value: string }[] = [
  {
    label: 'API response',
    value: JSON.stringify(
      {
        id: 1042,
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        verified: true,
        rating: 4.8,
        createdAt: '2024-03-01T09:30:00Z',
        tags: ['admin', 'beta'],
        address: { street: '12 Analytical Way', city: 'London', zip: null },
        orders: [
          { id: 'A-1', total: 19.99, items: [{ sku: 'pen', qty: 2 }] },
          { id: 'A-2', total: 5, items: [], note: 'Gift wrap' },
        ],
      },
      null,
      2,
    ),
  },
  {
    label: 'JSON lines',
    value: [
      '{"event":"signup","user":"u1","at":"2024-05-01T10:00:00Z","plan":"free"}',
      '{"event":"upgrade","user":"u1","at":"2024-05-03T12:00:00Z","plan":"pro","seats":3}',
      '{"event":"cancel","user":"u2","at":"2024-05-04T08:15:00Z","plan":null}',
    ].join('\n'),
  },
  {
    label: 'Mixed values',
    value: JSON.stringify(
      [
        {
          'first-name': 'Grace',
          score: 10,
          meta: { 'last-login': '2024-01-01' },
        },
        { 'first-name': 'Alan', score: 9.5, meta: null, class: 'A' },
      ],
      null,
      2,
    ),
  },
];
