import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Badge, Card, Group, Pagination, SimpleGrid, Stack, Table, Text, Title } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useAuth } from '../auth/AuthContext';
import { useAdminOverview, useAdminUsers, useErrorIssues } from '../api/hooks';
import { PageHeader, Metric, Loading, Empty } from '../components/ui';
import { ErrorIssueModal } from '../components/ErrorIssueModal';

const PAGE_SIZE = 20;

export default function AdminPanel() {
  const { user } = useAuth();
  // Botões de página do Mantine são pequenos demais para o toque; no celular
  // crescem (lg ≈ 44px) e mostram menos vizinhos para caber sem transbordar.
  const isMobile = useMediaQuery('(max-width: 47.99em)') ?? false;
  const pagerProps = { size: isMobile ? 'lg' : 'md', siblings: isMobile ? 0 : 1 } as const;
  const [page, setPage] = useState(1);
  const overview = useAdminOverview();
  const users = useAdminUsers(page, PAGE_SIZE);

  const [issuesPage, setIssuesPage] = useState(1);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const issues = useErrorIssues(issuesPage, PAGE_SIZE);

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
            {/* Só 2 colunas, mas "Último login" já não cabe ao lado do nome numa tela
                de celular — abaixo de sm vira lista de cards em vez de forçar
                rolagem horizontal numa tabela minúscula. */}
            <Table.ScrollContainer minWidth={420} visibleFrom="sm">
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
            </Table.ScrollContainer>
            <Stack gap="xs" hiddenFrom="sm">
              {users.data.items.map((u) => (
                <Card key={u.id} padding="sm" radius="md">
                  <Text fw={600} size="sm">{u.name}</Text>
                  <Text size="xs" c="dimmed" mt={2}>
                    {u.lastLoginAt
                      ? `Último login: ${new Date(u.lastLoginAt).toLocaleString('pt-BR')}`
                      : 'Nunca entrou'}
                  </Text>
                </Card>
              ))}
            </Stack>
            {users.data.total > PAGE_SIZE && (
              <Group justify={isMobile ? 'center' : 'flex-end'} mt="md">
                <Pagination
                  {...pagerProps}
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
        {!issues.data ? (
          issues.error ? <Empty>{issues.error.message}</Empty> : <Loading />
        ) : issues.data.items.length === 0 ? (
          <Empty>Nenhum erro registrado.</Empty>
        ) : (
          <>
            {/* 4 colunas com título de erro livre não cabem numa tela de celular sem
                truncar ou rolar horizontalmente — abaixo de sm vira lista de cards,
                cada um já tocável por inteiro (mesma ação de abrir o detalhe). */}
            <Table.ScrollContainer minWidth={620} visibleFrom="sm">
              <Table verticalSpacing="sm" highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Origem</Table.Th>
                    <Table.Th>Erro</Table.Th>
                    <Table.Th>Ocorrências</Table.Th>
                    <Table.Th>Última vez</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {issues.data.items.map((i) => (
                    <Table.Tr
                      key={i.id}
                      onClick={() => setSelectedIssueId(i.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <Table.Td>
                        <Badge color={i.source === 'backend' ? 'grape' : 'petrol'} variant="light" tt="none">
                          {i.source === 'backend' ? 'Backend' : 'Frontend'}
                        </Badge>
                      </Table.Td>
                      <Table.Td>{i.title}</Table.Td>
                      <Table.Td>{i.eventsCount}</Table.Td>
                      <Table.Td>{new Date(i.lastSeenAt).toLocaleString('pt-BR')}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
            <Stack gap="xs" hiddenFrom="sm">
              {issues.data.items.map((i) => (
                <Card
                  key={i.id}
                  padding="sm"
                  radius="md"
                  component="button"
                  type="button"
                  onClick={() => setSelectedIssueId(i.id)}
                  style={{ cursor: 'pointer', width: '100%', textAlign: 'left', minHeight: 44 }}
                >
                  <Group justify="space-between" wrap="nowrap" gap="xs" mb={6}>
                    <Badge color={i.source === 'backend' ? 'grape' : 'petrol'} variant="light" tt="none">
                      {i.source === 'backend' ? 'Backend' : 'Frontend'}
                    </Badge>
                    <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                      {new Date(i.lastSeenAt).toLocaleString('pt-BR')}
                    </Text>
                  </Group>
                  <Text size="sm" fw={500} style={{ overflowWrap: 'break-word' }}>
                    {i.title}
                  </Text>
                  <Text size="xs" c="dimmed" mt={4}>
                    {i.eventsCount} ocorrência(s) · toque para ver detalhes
                  </Text>
                </Card>
              ))}
            </Stack>
            {issues.data.total > PAGE_SIZE && (
              <Group justify={isMobile ? 'center' : 'flex-end'} mt="md">
                <Pagination
                  {...pagerProps}
                  value={issuesPage}
                  onChange={setIssuesPage}
                  total={Math.ceil(issues.data.total / PAGE_SIZE)}
                />
              </Group>
            )}
          </>
        )}
      </Card>

      {selectedIssueId && (
        <ErrorIssueModal issueId={selectedIssueId} onClose={() => setSelectedIssueId(null)} />
      )}
    </>
  );
}
