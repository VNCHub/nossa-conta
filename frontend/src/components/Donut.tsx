import type { ReactNode } from 'react';
import { Badge, Box, Center, Group, Stack, Text, UnstyledButton } from '@mantine/core';
import { DonutChart } from '@mantine/charts';
import { brl } from '@shared/format';
import { useValuesHidden } from '../hideValues';
import { Money } from './ui';

export type SpendingType = 'fixed' | 'oneOff';

/**
 * Its own file, not inside ui.tsx, on purpose: this is the only place that
 * imports the charts library. Together with ui.tsx, Recharts would land in the
 * initial chunk (the Shell imports ui.tsx), and whoever opens the expenses
 * screen would pay for a chart they will not see.
 */
export function Donut({
  fixed,
  oneOff,
  onSelect,
}: {
  fixed: number;
  oneOff: number;
  /** Present only where a type can drill down into its expenses. */
  onSelect?: (type: SpendingType) => void;
}) {
  const total = fixed + oneOff;
  const [hidden] = useValuesHidden();

  return (
    <Group gap="lg" wrap="wrap">
      {total > 0 ? (
        // The chart label is SVG text and the tooltip shows raw amounts: with
        // values hidden both go, and the mask is laid over the center instead.
        <Box pos="relative">
          <DonutChart
            data={[
              { name: 'Fixo', value: fixed, color: 'petrol.6' },
              { name: 'Pontual', value: oneOff, color: 'grape.6' },
            ]}
            size={132}
            thickness={17}
            withTooltip={!hidden}
            chartLabel={hidden ? undefined : brl(total)}
            valueFormatter={brl}
            // Same order as `data` above; Recharts reports the clicked slice by index.
            pieProps={onSelect ? { onClick: (_, i) => onSelect(i === 0 ? 'fixed' : 'oneOff'), style: { cursor: 'pointer' } } : undefined}
          />
          {hidden && (
            <Center pos="absolute" inset={0} fz="sm" style={{ pointerEvents: 'none' }}>
              <Money value={total} />
            </Center>
          )}
        </Box>
      ) : (
        <Center h={132} w={132}>
          <Text c="dimmed" size="sm">sem dados</Text>
        </Center>
      )}
      <Stack gap="sm">
        <TypeBlock type="fixed" onSelect={onSelect}>
          <Badge color="petrol" variant="light" radius="sm">Fixo</Badge>
          <Text className="num" fz="lg" fw={600} mt={5}><Money value={fixed} /></Text>
        </TypeBlock>
        <TypeBlock type="oneOff" onSelect={onSelect}>
          <Badge color="grape" variant="light" radius="sm">Pontual</Badge>
          <Text className="num" fz="lg" fw={600} mt={5}><Money value={oneOff} /></Text>
        </TypeBlock>
      </Stack>
    </Group>
  );
}

function TypeBlock({
  type,
  onSelect,
  children,
}: {
  type: SpendingType;
  onSelect?: (type: SpendingType) => void;
  children: ReactNode;
}) {
  if (!onSelect) return <div>{children}</div>;
  return (
    <UnstyledButton onClick={() => onSelect(type)} aria-label={type === 'fixed' ? 'Ver gastos fixos' : 'Ver gastos pontuais'} mih={44}>
      {children}
    </UnstyledButton>
  );
}
