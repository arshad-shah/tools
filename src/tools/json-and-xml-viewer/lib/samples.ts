/** Samples for the editor (spec §7.1): the RFC 9535 bookstore in three formats. */
export const JSON_SAMPLE = `{
  "store": {
    "book": [
      { "category": "reference", "author": "Nigel Rees", "title": "Sayings of the Century", "price": 8.95 },
      { "category": "fiction", "author": "Evelyn Waugh", "title": "Sword of Honour", "price": 12.99 },
      { "category": "fiction", "author": "Herman Melville", "title": "Moby Dick", "isbn": "0-553-21311-3", "price": 8.99 },
      { "category": "fiction", "author": "J. R. R. Tolkien", "title": "The Lord of the Rings", "isbn": "0-395-19395-8", "price": 22.99 }
    ],
    "bicycle": { "color": "red", "price": 399 }
  }
}
`;

export const XML_SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<catalog>
  <!-- A small book catalogue -->
  <book id="bk101" lang="en">
    <author>Gambardella, Matthew</author>
    <title>XML Developer's Guide</title>
    <price>44.95</price>
  </book>
  <book id="bk102" lang="fr">
    <author>Ralls, Kim</author>
    <title>Midnight Rain</title>
    <price>5.95</price>
  </book>
  <book id="bk103" lang="en">
    <author>Corets, Eva</author>
    <title><![CDATA[Maeve Ascendant]]></title>
    <price>5.95</price>
  </book>
</catalog>
`;

export const YAML_SAMPLE = `service:
  name: tools
  replicas: 3
  ports:
    - 80
    - 443
  env:
    LOG_LEVEL: info
    FEATURE_MAP: true
`;

export const SAMPLES = [
  { label: 'JSON bookstore', value: JSON_SAMPLE },
  { label: 'XML catalogue', value: XML_SAMPLE },
  { label: 'YAML service', value: YAML_SAMPLE },
];
