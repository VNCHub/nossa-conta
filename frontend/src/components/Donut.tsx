import { Badge, Center, Group, Stack, Text } from '@mantine/core';
import { DonutChart } from '@mantine/charts';
import { brl, pct } from '@shared/formato';

/**
 * Arquivo próprio, e não dentro de ui.tsx, de propósito: este é o único ponto
 * que importa a biblioteca de gráficos. Junto com ui.tsx, o Recharts entraria
 * no chunk inicial (o Shell importa ui.tsx), e quem abre a tela de gastos
 * pagaria por um gráfico que não vai ver.
 */
export function Donut({ fixo, opcional }: { fixo: number; opcional: number }) {
  const total = fixo + opcional;

  return (
    <Group gap="xl" wrap="wrap">
      {total > 0 ? (
        <DonutChart
          data={[
            { name: 'Gasto fixo', value: fixo, color: 'petrol.6' },
            { name: 'Gasto opcional', value: opcional, color: 'mostarda.6' },
          ]}
          size={132}
          thickness={17}
          withTooltip
          chartLabel={pct(fixo / total)}
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
          <Text className="num" fz="lg" fw={600} mt={5}>{brl(fixo)}</Text>
        </div>
        <div>
          <Badge color="mostarda" variant="light" radius="sm">Gasto opcional</Badge>
          <Text className="num" fz="lg" fw={600} mt={5}>{brl(opcional)}</Text>
        </div>
      </Stack>
    </Group>
  );
}
