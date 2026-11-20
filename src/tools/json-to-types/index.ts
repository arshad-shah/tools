import { fileJson as icon } from '@arshad-shah/cynosure/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'json-to-types',
  name: 'JSON to Types',
  description:
    'Generate TypeScript, Zod, JSON Schema, Go, Rust, Python, Kotlin and C# types from sample JSON',
  icon,
  category: 'data',
  slug: 'json-to-types',
  kind: 'tool',
  keywords: [
    'json to typescript',
    'json to go',
    'json schema',
    'zod',
    'serde',
    'dataclass',
    'quicktype',
    'type inference',
    'interface generator',
  ],
  // JSON from the JSON & XML Viewer (its Send to) and dropped JSON files.
  accepts: [{ kinds: ['json'], mimes: ['application/json'] }],
  version: '1.0.0',
  enabled: true,
  isNew: true,
  load: () => import('./Tool'),
});
