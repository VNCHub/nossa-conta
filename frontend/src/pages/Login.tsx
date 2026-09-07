import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Center,
  Grid,
  PasswordInput,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useAuth } from '../auth/AuthContext';

type Mode = 'signin' | 'signup';

export default function Login() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const form = useForm({
    mode: 'uncontrolled',
    initialValues: { name: '', email: '', password: '', inviteCode: '', familyName: '' },
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
        await signIn(v.email, v.password);
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
    <Center mih="100vh" p="lg">
      <Stack w="100%" maw={420} gap={0}>
        <Title order={1}>Nossa Conta</Title>
        <Text c="dimmed" size="md" mt={6} mb="xl">
          Cada um lança o que gastou. No fim do mês, o app diz quem paga quanto pra quem.
        </Text>

        <Card>
          <SegmentedControl
            fullWidth
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

              <TextInput label="E-mail" type="email" autoComplete="email" key={form.key('email')} {...form.getInputProps('email')} />

              <PasswordInput
                label="Senha"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                key={form.key('password')}
                {...form.getInputProps('password')}
              />

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

              <Button type="submit" loading={submitting} fullWidth>
                {mode === 'signin' ? 'Entrar' : 'Criar conta'}
              </Button>

              {error && <Alert color="brick" variant="light">{error}</Alert>}
            </Stack>
          </form>
        </Card>
      </Stack>
    </Center>
  );
}
