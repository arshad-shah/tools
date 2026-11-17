import { createToolSettings } from '@/shared/lib/tool-settings';

export type IpTab = 'subnet' | 'plan' | 'address';
export type PlanMode = 'split' | 'vlsm' | 'summarise';

export interface IpSettings {
  tab: IpTab;
  plan: PlanMode;
}

export const IP_DEFAULTS: IpSettings = { tab: 'subnet', plan: 'split' };

/** The open tab and planner; never the addresses typed. */
export const ipSettings = createToolSettings<IpSettings>(
  'ip-calculator',
  IP_DEFAULTS,
  { version: 1 },
);
