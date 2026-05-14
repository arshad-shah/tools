import React from 'react';
import { Box, Stack } from '@arshad-shah/cynosure-react';
import { elements, colorMap } from './Data';
import { Element } from '../../types/PeriodicTableTypes';

interface ElementGridProps {
  selectedElement: Element | null;
  onElementClick: (element: Element | null) => void;
}

const ElementGrid: React.FC<ElementGridProps> = ({
  selectedElement,
  onElementClick,
}) => {
  const cells: React.ReactNode[] = [];
  const maxPeriod = 9;
  const maxColumn = 18;

  for (let period = 1; period <= maxPeriod; period++) {
    for (let column = 1; column <= maxColumn; column++) {
      const element = elements.find(
        (e) => e.period === period && e.column === column,
      );

      // Lanthanide/Actinide placeholder rows (periods 6 and 7, columns 3-17)
      if (
        (period === 6 && column >= 3 && column <= 17) ||
        (period === 7 && column >= 3 && column <= 17)
      ) {
        if (column === 3) {
          const isLanthanide = period === 6;
          cells.push(
            <div
              key={`placeholder-${period}`}
              style={{
                gridRow: period,
                gridColumn: '3 / span 15',
                background: isLanthanide ? '#93c5fd' : '#c4b5fd',
                color: '#1f2937',
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.75rem',
                padding: 4,
              }}
            >
              {isLanthanide ? 'Lanthanides (57–71)' : 'Actinides (89–103)'}
            </div>,
          );
        }
        continue;
      }

      if (element) {
        const isSelected =
          selectedElement && selectedElement.symbol === element.symbol;
        cells.push(
          <button
            key={element.symbol}
            type="button"
            onClick={() =>
              onElementClick(isSelected ? null : (element as Element))
            }
            aria-pressed={isSelected ?? false}
            aria-label={`${element.name} (${element.symbol}), atomic number ${element.number}`}
            style={{
              gridRow: period,
              gridColumn: column,
              background: colorMap[element.group],
              color: '#0f172a',
              border: isSelected ? '2px solid #0f172a' : '1px solid rgba(0,0,0,0.1)',
              borderRadius: 6,
              padding: 2,
              cursor: 'pointer',
              minHeight: 56,
              display: 'grid',
              gridTemplateRows: 'auto 1fr auto',
              gridTemplateColumns: '1fr 1fr',
              fontFamily: 'inherit',
              transition: 'transform 120ms ease, box-shadow 120ms ease',
              transform: isSelected ? 'translateY(-2px)' : 'none',
              boxShadow: isSelected
                ? '0 4px 12px rgba(0,0,0,0.18)'
                : '0 1px 2px rgba(0,0,0,0.08)',
            }}
          >
            <span style={{ fontSize: 10, gridColumn: '1 / 2', textAlign: 'left' }}>
              {element.number}
            </span>
            <span
              style={{
                fontSize: 10,
                gridColumn: '2 / 3',
                textAlign: 'right',
              }}
            >
              {typeof element.mass === 'number'
                ? element.mass.toFixed(1)
                : element.mass}
            </span>
            <span
              style={{
                fontSize: 16,
                fontWeight: 700,
                textAlign: 'center',
                gridColumn: '1 / 3',
                alignSelf: 'center',
              }}
            >
              {element.symbol}
            </span>
            <span
              style={{
                fontSize: 9,
                textAlign: 'center',
                gridColumn: '1 / 3',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {element.name}
            </span>
          </button>,
        );
      }
    }
  }

  return (
    <Stack gap="3">
      <Box overflow="auto">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(18, minmax(48px, 1fr))',
            gridTemplateRows: 'repeat(9, minmax(56px, auto))',
            gap: 4,
            minWidth: 18 * 56,
          }}
        >
          {cells}
        </div>
      </Box>
    </Stack>
  );
};

export default ElementGrid;
