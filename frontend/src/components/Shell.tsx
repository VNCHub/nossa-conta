import { NavLink as RouterLink, Outlet } from 'react-router-dom';
import { AppShell, Burger, Group, NavLink, ScrollArea, Stack, Text, UnstyledButton } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useAuth } from '../auth/AuthContext';
import { useFamilia } from '../api/hooks';
import { Avatar, MesNav } from './ui';
import { useMes } from '../useMes';

const TELAS = [
  { para: '/', rotulo: 'Painel da família', fim: true },
  { para: '/meu-painel', rotulo: 'Meu painel' },
  { para: '/gastos', rotulo: 'Gastos' },
  { para: '/entradas', rotulo: 'Entradas' },
  { para: '/familia', rotulo: 'Família e rateios' },
];

export default function Shell() {
  const { usuario, sair } = useAuth();
  const { data: familia } = useFamilia();
  const [mes, setMes] = useMes();
  const [aberto, { toggle, close }] = useDisclosure(false);

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 236, breakpoint: 'sm', collapsed: { mobile: !aberto } }}
      padding="lg"
    >
      <AppShell.Header bg="var(--gf-card)">
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <Burger opened={aberto} onClick={toggle} hiddenFrom="sm" size="sm" aria-label="Menu" />
            <Text ff="'Newsreader', Georgia, serif" fz={20} hiddenFrom="sm">Nossa Conta</Text>
          </Group>
          <MesNav mes={mes} setMes={setMes} />
        </Group>
      </AppShell.Header>

      <AppShell.Navbar bg="var(--gf-ink)" p="md" style={{ border: 'none' }}>
        <AppShell.Section>
          <Text ff="'Newsreader', Georgia, serif" fz={20} c="#fff" lh={1.2}>
            Nossa Conta
          </Text>
          <Text fz="xs" c="#8FAFA4" mt={4} style={{ letterSpacing: '0.04em' }}>
            {familia?.nome ?? '—'}
          </Text>
        </AppShell.Section>

        <AppShell.Section grow component={ScrollArea} mt="lg">
          <Stack gap={2}>
            {TELAS.map((t) => (
              <NavLink
                key={t.para}
                component={RouterLink}
                to={{ pathname: t.para, search: `?mes=${mes}` }}
                end={t.fim}
                label={t.rotulo}
                onClick={close}
                styles={{
                  root: { borderRadius: 8, color: '#B9CCC5' },
                  label: { fontSize: 13.5 },
                }}
                // O react-router aplica .active; o Mantine estiliza pelo data-attr.
                className="rail-link"
              />
            ))}
          </Stack>
        </AppShell.Section>

        <AppShell.Section pt="md" style={{ borderTop: '1px solid #2A4B43' }}>
          <Group gap="sm" mb="sm">
            {usuario && <Avatar user={usuario} />}
            <Text c="#fff" size="md">{usuario?.nome}</Text>
          </Group>
          <UnstyledButton onClick={() => void sair()}>
            <Text c="#B9CCC5" size="sm" td="underline">Sair da conta</Text>
          </UnstyledButton>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        <div style={{ maxWidth: 1180 }}>
          <Outlet />
        </div>
      </AppShell.Main>
    </AppShell>
  );
}
