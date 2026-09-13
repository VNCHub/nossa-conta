import { Card, Tabs } from '@mantine/core';
import { brl, monthLabel } from '@shared/format';
import { useExpenses } from '../api/hooks';
import { useAuth } from '../auth/AuthContext';
import { Metric, PageHeader } from '../components/ui';
import ExpensesImports from './expenses/ExpensesImports';
import ExpensesLedger from './expenses/ExpensesLedger';
import { useMonth } from '../useMonth';

export default function Expenses() {
  const [month] = useMonth();
  const { user } = useAuth();
  // Same query key as ExpensesLedger's own useExpenses(month) — React Query
  // dedups it into a single request, so the header metric costs nothing extra.
  const expenses = useExpenses(month);
  const myTotal = expenses.data
    ? expenses.data.filter((e) => e.userId === user?.id).reduce((s, e) => s + e.amount, 0)
    : null;

  return (
    <>
      <PageHeader
        title="Gastos"
        description={`Lançamentos e importações da família em ${monthLabel(month)}.`}
        action={
          <Card>
            <Metric
              label="Total de meus gastos no mês"
              value={myTotal === null ? '—' : brl(myTotal)}
            />
          </Card>
        }
      />

      <Tabs defaultValue="lancamentos" keepMounted={false}>
        <Tabs.List mb="md">
          <Tabs.Tab value="lancamentos">Lançamentos</Tabs.Tab>
          <Tabs.Tab value="importacoes">Importações</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="lancamentos">
          <ExpensesLedger />
        </Tabs.Panel>
        <Tabs.Panel value="importacoes">
          <ExpensesImports />
        </Tabs.Panel>
      </Tabs>
    </>
  );
}
