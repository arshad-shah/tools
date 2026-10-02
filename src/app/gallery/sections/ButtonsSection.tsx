import { Button, ButtonGroup, IconButton, Tooltip } from '@/shared/ui';
import {
  IconDownload,
  IconPlus,
  IconSearch,
  IconTrash2,
  IconUndo,
} from '@/shared/ui/icons';
import { Row, Section } from '../Section';

const VARIANTS = ['primary', 'secondary', 'ghost', 'danger'] as const;
const SIZES = ['sm', 'md', 'lg'] as const;

export function ButtonsSection() {
  return (
    <Section name="buttons" title="Buttons">
      {VARIANTS.map((v) => (
        <Row key={v} label={v}>
          {SIZES.map((s) => (
            <Button key={s} variant={v} size={s}>
              {v} {s}
            </Button>
          ))}
          <Button variant={v} leftIcon={<IconDownload size="sm" />}>
            With icon
          </Button>
          <Button variant={v} disabled>
            Disabled
          </Button>
          <Button variant={v} loading>
            Loading
          </Button>
        </Row>
      ))}
      <Row label="IconButton sm md lg">
        {SIZES.map((s) => (
          <IconButton
            key={s}
            size={s}
            label={`Search ${s}`}
            icon={IconSearch}
          />
        ))}
        <IconButton variant="primary" label="Add" icon={IconPlus} />
        <IconButton
          variant="ghost"
          tone="danger"
          label="Delete"
          icon={IconTrash2}
        />
        <IconButton label="Disabled" icon={IconSearch} disabled />
      </Row>
      <Row label="ButtonGroup">
        <ButtonGroup>
          <Button>Day</Button>
          <Button>Week</Button>
          <Button>Month</Button>
        </ButtonGroup>
      </Row>
      <Row label="Tooltip with shortcut (hover or focus)">
        <Tooltip content="Undo" shortcut="Mod+Z">
          <IconButton label="Undo" icon={IconUndo} />
        </Tooltip>
      </Row>
    </Section>
  );
}
