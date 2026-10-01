import { Badge, Box, Center, Group, Stack, Text } from '@mantine/core';
import { DonutChart } from '@mantine/charts';
import { brl } from '@shared/format';
import { useValuesHidden } from '../hideValues';
import { Money } from './ui';

/**
 * Its own file, not inside ui.tsx, on purpose: this is the only place that
 * imports the charts library. Together with ui.tsx, Recharts would land in the
 * initial chunk (the Shell imports ui.tsx), and whoever opens the expenses
 * screen would pay for a chart they will not see.
 */
export function Donut({
  fixed,
  optional,
  oneOff,
}: {
  fixed: number;
  optional: number;
  oneOff: number;
}) {
  const total = fixed + optional + oneOff;
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
              { name: 'Opcional', value: optional, color: 'mustard.6' },
              { name: 'Pontual', value: oneOff, color: 'grape.6' },
            ]}
            size={132}
            thickness={17}
            withTooltip={!hidden}
            chartLabel={hidden ? undefined : brl(total)}
            valueFormatter={brl}
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
        <div>
          <Badge color="petrol" variant="light" radius="sm">Fixo</Badge>
          <Text className="num" fz="lg" fw={600} mt={5}><Money value={fixed} /></Text>
        </div>
        <div>
          <Badge color="mustard" variant="light" radius="sm">Opcional</Badge>
          <Text className="num" fz="lg" fw={600} mt={5}><Money value={optional} /></Text>
        </div>
        <div>
          <Badge color="grape" variant="light" radius="sm">Pontual</Badge>
          <Text className="num" fz="lg" fw={600} mt={5}><Money value={oneOff} /></Text>
        </div>
      </Stack>
    </Group>
  );
}
