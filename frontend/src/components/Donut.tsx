import { Badge, Center, Group, Stack, Text } from '@mantine/core';
import { DonutChart } from '@mantine/charts';
import { brl, pct } from '@shared/format';

/**
 * Its own file, not inside ui.tsx, on purpose: this is the only place that
 * imports the charts library. Together with ui.tsx, Recharts would land in the
 * initial chunk (the Shell imports ui.tsx), and whoever opens the expenses
 * screen would pay for a chart they will not see.
 */
export function Donut({ fixed, optional }: { fixed: number; optional: number }) {
  const total = fixed + optional;

  return (
    <Group gap="xl" wrap="wrap">
      {total > 0 ? (
        <DonutChart
          data={[
            { name: 'Gasto fixo', value: fixed, color: 'petrol.6' },
            { name: 'Gasto opcional', value: optional, color: 'mustard.6' },
          ]}
          size={132}
          thickness={17}
          withTooltip
          chartLabel={pct(fixed / total)}
          valueFormatter={brl}
        />
      ) : (
        <Center h={132} w={132}>
          <Text c="dimmed" size="sm">sem dados</Text>
        </Center>
      )}
      <Stack gap="sm">
        <div>
          <Badge color="petrol" variant="light" radius="sm">Gasto fixo</Badge>
          <Text className="num" fz="lg" fw={600} mt={5}>{brl(fixed)}</Text>
        </div>
        <div>
          <Badge color="mustard" variant="light" radius="sm">Gasto opcional</Badge>
          <Text className="num" fz="lg" fw={600} mt={5}>{brl(optional)}</Text>
        </div>
      </Stack>
    </Group>
  );
}
