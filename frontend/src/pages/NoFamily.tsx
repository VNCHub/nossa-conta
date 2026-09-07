import { useState } from 'react';
import { Alert, Button, Card, Center, Stack, Text, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';

/**
 * Possible state for an account left without a family (the creator left, for
 * example). Without this, the app would fall into 403 on every screen.
 */
export default function NoFamily() {
  const { user, reloadUser, signOut } = useAuth();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const form = useForm({
    mode: 'uncontrolled',
    initialValues: { code: '', name: '' },
    validate: {
      name: (v, vals) =>
        !v.trim() && !vals.code.trim()
          ? 'Informe um código de convite ou o nome da nova família.'
          : null,
    },
  });

  const submit = form.onSubmit(async (v) => {
    setError('');
    setSubmitting(true);
    try {
      if (v.code.trim()) await api.post('/familias/entrar', { code: v.code.trim() });
      else await api.post('/familias', { name: v.name.trim() });
      await reloadUser();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível concluir.');
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Center mih="100vh" p="lg">
      <Stack w="100%" maw={420} gap={0}>
        <Title order={1}>Olá, {user?.name}</Title>
        <Text c="dimmed" size="md" mt={6} mb="xl">
          Você ainda não faz parte de uma família. Entre em uma ou crie a sua.
        </Text>

        <Card component="form" onSubmit={submit}>
          <Stack gap="md">
            <TextInput label="Código de convite" placeholder="VILA-7K2M" key={form.key('code')} {...form.getInputProps('code')} />
            <TextInput label="ou crie uma família" placeholder="Nome da família" key={form.key('name')} {...form.getInputProps('name')} />
            <Button type="submit" loading={submitting} fullWidth>Continuar</Button>
            {error && <Alert color="brick" variant="light">{error}</Alert>}
            <Button variant="subtle" color="gray" onClick={() => void signOut()}>Sair da conta</Button>
          </Stack>
        </Card>
      </Stack>
    </Center>
  );
}
