import { NavLink as RouterLink, Outlet, useLocation } from 'react-router-dom';
import { AppShell, Burger, Group, NavLink, ScrollArea, Stack, Text, UnstyledButton } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { currentMonth } from '@shared/format';
import { useAuth } from '../auth/AuthContext';
import { useFamily } from '../api/hooks';
import { Avatar, MonthNav } from './ui';
import { useMonth } from '../useMonth';

const SCREENS = [
  { to: '/', label: 'Painel da família', end: true },
  { to: '/meu-painel', label: 'Meu painel' },
  { to: '/gastos', label: 'Gastos' },
  { to: '/entradas', label: 'Entradas' },
  { to: '/familia', label: 'Família e rateios' },
];

export default function Shell() {
  const { user, signOut } = useAuth();
  const { data: family } = useFamily();
  const [month, setMonth] = useMonth();
  const [opened, { toggle, close }] = useDisclosure(false);
  const isAdmin = user?.roles.includes('admin') ?? false;
  // The admin panel is platform-wide, not scoped to a month — the selector
  // that drives every family screen makes no sense there.
  const isAdminScreen = useLocation().pathname.startsWith('/administracao');

  return (
    <AppShell
      layout="alt"
      // Above "sm" the header only ever holds the month selector (the burger
      // and title are mobile-only) — on the admin screen, which has neither,
      // a 60px bar there would just be an empty stripe. The burger still
      // needs its 60px on mobile to open the nav.
      header={{ height: isAdminScreen ? { base: 60, sm: 0 } : 60 }}
      navbar={{ width: 236, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="lg"
    >
      <AppShell.Header bg="var(--gf-card)">
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" aria-label="Menu" />
            <Text ff="'Newsreader', Georgia, serif" fz={20} hiddenFrom="sm">Nossa Conta</Text>
          </Group>
          {!isAdminScreen && (
            <MonthNav
              month={month}
              setMonth={setMonth}
              min={family?.earliestMonth ?? undefined}
              max={currentMonth()}
            />
          )}
        </Group>
      </AppShell.Header>

      <AppShell.Navbar bg="var(--gf-ink)" p="md" style={{ border: 'none' }}>
        <AppShell.Section>
          <Text ff="'Newsreader', Georgia, serif" fz={20} c="#fff" lh={1.2}>
            Nossa Conta
          </Text>
          <Text fz="xs" c="#8FAFA4" mt={4} style={{ letterSpacing: '0.04em' }}>
            {family?.name ?? '—'}
          </Text>
        </AppShell.Section>

        <AppShell.Section grow component={ScrollArea} mt="lg">
          <Stack gap={2}>
            {SCREENS.map((s) => (
              <NavLink
                key={s.to}
                component={RouterLink}
                to={{ pathname: s.to, search: `?mes=${month}` }}
                end={s.end}
                label={s.label}
                onClick={close}
                styles={{
                  root: { borderRadius: 8, color: '#B9CCC5' },
                  label: { fontSize: 13.5 },
                }}
                // react-router applies .active; Mantine styles by the data attr.
                className="rail-link"
              />
            ))}
          </Stack>

          {/* Function separate from the family screens above: a platform-wide
              concern that happens to live in the same account, not one more
              item in the family list. */}
          {isAdmin && (
            <Stack gap={2} mt="lg" pt="md" style={{ borderTop: '1px solid #2A4B43' }}>
              <Text fz="xs" c="#8FAFA4" mb={2} style={{ letterSpacing: '0.04em' }}>
                ADMINISTRAÇÃO
              </Text>
              <NavLink
                component={RouterLink}
                to="/administracao"
                label="Painel Administrativo"
                onClick={close}
                styles={{
                  root: { borderRadius: 8, color: '#B9CCC5' },
                  label: { fontSize: 13.5 },
                }}
                className="rail-link"
              />
            </Stack>
          )}
        </AppShell.Section>

        <AppShell.Section pt="md" style={{ borderTop: '1px solid #2A4B43' }}>
          <Group gap="sm" mb="sm">
            {user && <Avatar user={user} />}
            <Text c="#fff" size="md">{user?.name}</Text>
          </Group>
          <Stack gap={4}>
            <UnstyledButton component={RouterLink} to="/perfil" onClick={close}>
              <Text c="#B9CCC5" size="sm" td="underline">Meu perfil</Text>
            </UnstyledButton>
            <UnstyledButton onClick={() => void signOut()}>
              <Text c="#B9CCC5" size="sm" td="underline">Sair da conta</Text>
            </UnstyledButton>
          </Stack>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        <div style={{ maxWidth: 1320, marginInline: 'auto' }}>
          <Outlet />
        </div>
      </AppShell.Main>
    </AppShell>
  );
}
