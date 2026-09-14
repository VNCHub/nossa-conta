import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, Group, Pagination, SimpleGrid, Table, Title } from '@mantine/core';
import { useAuth } from '../auth/AuthContext';
import { useAdminOverview, useAdminUsers } from '../api/hooks';
import { PageHeader, Metric, Loading, Empty } from '../components/ui';

const PAGE_SIZE = 20;

export default function AdminPanel() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const overview = useAdminOverview();
  const users = useAdminUsers(page, PAGE_SIZE);

  // Backend already refuses non-admins with 403; this just avoids flashing the
  // panel for someone who reached the URL directly.
  if (!user?.roles.includes('admin')) return <Navigate to="/" replace />;

  return (
    <>
      <PageHeader
        title="Painel Administrativo"
        description="Visão geral da plataforma — restrito a quem administra."
      />

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="lg">
        <Card><Metric label="Usuários" value={overview.data ? String(overview.data.totalUsers) : '—'} /></Card>
        <Card><Metric label="Famílias" value={overview.data ? String(overview.data.totalFamilies) : '—'} /></Card>
        <Card><Metric label="Gastos lançados" value={overview.data ? String(overview.data.totalExpenses) : '—'} /></Card>
        <Card><Metric label="Receitas lançadas" value={overview.data ? String(overview.data.totalIncomes) : '—'} /></Card>
      </SimpleGrid>

      <Card mb="lg">
        <Title order={3} mb="sm">Usuários</Title>
        {!users.data ? (
          users.error ? <Empty>{users.error.message}</Empty> : <Loading />
        ) : users.data.items.length === 0 ? (
          <Empty>Nenhum usuário cadastrado.</Empty>
        ) : (
          <>
            <Table verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Nome</Table.Th>
                  <Table.Th>Último login</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {users.data.items.map((u) => (
                  <Table.Tr key={u.id}>
                    <Table.Td>{u.name}</Table.Td>
                    <Table.Td>
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('pt-BR') : 'Nunca entrou'}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
            {users.data.total > PAGE_SIZE && (
              <Group justify="flex-end" mt="md">
                <Pagination
                  value={page}
                  onChange={setPage}
                  total={Math.ceil(users.data.total / PAGE_SIZE)}
                />
              </Group>
            )}
          </>
        )}
      </Card>

      <Card>
        <Title order={3} mb="sm">Observabilidade</Title>
        <Empty>Em breve — logs de erro do backend e do frontend.</Empty>
      </Card>
    </>
  );
}
