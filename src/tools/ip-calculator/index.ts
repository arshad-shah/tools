import { network as icon } from '@arshad-shah/cynosure/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'ip-calculator',
  name: 'IP & Subnet Calculator',
  description:
    'IPv4 and IPv6 subnets, splitting and VLSM plans, CIDR summaries and address conversions',
  icon,
  category: 'web',
  slug: 'ip',
  kind: 'tool',
  keywords: [
    'ip',
    'ip address',
    'cidr',
    'subnet',
    'subnet calculator',
    'netmask',
    'wildcard mask',
    'ipv4',
    'ipv6',
    'vlsm',
    'supernet',
    'reverse dns',
  ],
  version: '1.0.0',
  isNew: true,
  enabled: true,
  load: () => import('./Tool'),
});
