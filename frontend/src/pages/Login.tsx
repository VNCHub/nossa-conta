import { useState } from 'react';
import {
  Alert,
  Anchor,
  Box,
  Button,
  Card,
  Center,
  Checkbox,
  Grid,
  Group,
  PasswordInput,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import logo from '../assets/login-logo.webp';
import loginLeft from '../assets/login-left.webp';
import loginRight from '../assets/login-right.webp';

type Mode = 'signin' | 'signup';

export default function Login() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const form = useForm({
    mode: 'uncontrolled',
    initialValues: {
      name: '',
      email: '',
      password: '',
      inviteCode: '',
      familyName: '',
      rememberMe: false,
    },
    validate: {
      name: (v) => (mode === 'signup' && !v.trim() ? 'Informe seu nome.' : null),
      email: (v) => (/^\S+@\S+\.\S+$/.test(v) ? null : 'Informe um e-mail válido.'),
      password: (v) =>
        mode === 'signup' && v.length < 6 ? 'A senha precisa ter 6 caracteres ou mais.' : null,
      familyName: (v, values) =>
        mode === 'signup' && !v.trim() && !values.inviteCode.trim()
          ? 'Crie uma família ou entre com um código de convite.'
          : null,
    },
  });

  const switchMode = (m: Mode) => {
    setMode(m);
    setError('');
    form.clearErrors();
  };

  const submit = form.onSubmit(async (v) => {
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'signin') {
        await signIn(v.email, v.password, v.rememberMe);
      } else {
        await signUp({
          name: v.name,
          email: v.email,
          password: v.password,
          inviteCode: v.inviteCode.trim() || undefined,
          familyName: v.inviteCode.trim() ? undefined : v.familyName.trim(),
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível entrar.');
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Center mih="100vh" p="lg" pos="relative" style={{ overflow: 'hidden' }}>
      {/* Decorative picnic scene, split so each half hugs one edge of the screen.
          Hidden on phones, where it would crowd the form. */}
      <Box
        visibleFrom="md"
        aria-hidden
        style={{
          position: 'fixed',
          insetBlock: 0,
          left: 0,
          width: 'clamp(180px, 24vw, 380px)',
          backgroundImage: `url(${loginLeft})`,
          backgroundSize: 'cover',
          backgroundPosition: 'right bottom',
          maskImage: 'linear-gradient(to right, #000 55%, transparent)',
          WebkitMaskImage: 'linear-gradient(to right, #000 55%, transparent)',
          pointerEvents: 'none',
        }}
      />
      <Box
        visibleFrom="md"
        aria-hidden
        style={{
          position: 'fixed',
          insetBlock: 0,
          right: 0,
          width: 'clamp(180px, 24vw, 380px)',
          backgroundImage: `url(${loginRight})`,
          backgroundSize: 'cover',
          backgroundPosition: 'left bottom',
          maskImage: 'linear-gradient(to left, #000 55%, transparent)',
          WebkitMaskImage: 'linear-gradient(to left, #000 55%, transparent)',
          pointerEvents: 'none',
        }}
      />

      <Stack w="100%" maw={480} gap={0} pos="relative">
        <Card shadow="lg" padding="xl">
          <img
            src={logo}
            alt="Nossa Conta"
            style={{ display: 'block', width: 'min(230px, 60%)', margin: '0 auto' }}
          />
          <Text c="dimmed" fz={{ base: 15, sm: 16 }} mt="sm" mb="xl" ta="center">
            A gente cuida das contas e das somas — você fica com o resto do dia livre.
          </Text>

          <SegmentedControl
            fullWidth
            color="petrol"
            value={mode}
            onChange={(v) => switchMode(v as Mode)}
            data={[
              { value: 'signin', label: 'Entrar' },
              { value: 'signup', label: 'Criar conta' },
            ]}
            mb="lg"
          />

          <form onSubmit={submit}>
            <Stack gap="md">
              {mode === 'signup' && (
                <TextInput label="Nome" autoComplete="name" key={form.key('name')} {...form.getInputProps('name')} />
              )}

              <TextInput
                label="E-mail"
                type="email"
                placeholder="voce@email.com"
                autoComplete="email"
                autoFocus
                key={form.key('email')}
                {...form.getInputProps('email')}
              />

              <PasswordInput
                label="Senha"
                placeholder="Sua senha"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                key={form.key('password')}
                {...form.getInputProps('password')}
              />

              {mode === 'signin' && (
                <Group justify="space-between">
                  <Checkbox
                    label="Lembre de mim"
                    key={form.key('rememberMe')}
                    {...form.getInputProps('rememberMe', { type: 'checkbox' })}
                  />
                  <Anchor component={Link} to="/esqueci-senha" size="sm">
                    Esqueci minha senha
                  </Anchor>
                </Group>
              )}

              {mode === 'signup' && (
                <Grid gap="sm">
                  <Grid.Col span={{ base: 12, xs: 6 }}>
                    <TextInput
                      label="Código de convite" placeholder="VILA-7K2M"
                      key={form.key('inviteCode')} {...form.getInputProps('inviteCode')}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, xs: 6 }}>
                    <TextInput
                      label="ou crie uma família" placeholder="Nome da família"
                      key={form.key('familyName')} {...form.getInputProps('familyName')}
                    />
                  </Grid.Col>
                </Grid>
              )}

              {error && <Alert color="brick" variant="light">{error}</Alert>}

              <Button type="submit" loading={submitting} fullWidth>
                {mode === 'signin' ? 'Entrar' : 'Criar conta'}
              </Button>

              <Text c="dimmed" size="sm" ta="center">
                Seus lançamentos ficam visíveis só para a sua família.
              </Text>
            </Stack>
          </form>
        </Card>
      </Stack>
    </Center>
  );
}
