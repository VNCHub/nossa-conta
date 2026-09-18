import { useState } from 'react';
import { Alert, Anchor, Button, Card, Center, PasswordInput, Stack, Text, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useResetPassword } from '../api/hooks';
import { notifySuccess } from '../feedback';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const navigate = useNavigate();
  const resetPassword = useResetPassword();
  const [error, setError] = useState('');

  const form = useForm({
    mode: 'uncontrolled',
    initialValues: { password: '', confirm: '' },
    validate: {
      password: (v) => (v.length < 6 ? 'A senha precisa ter 6 caracteres ou mais.' : null),
      confirm: (v, values) => (v !== values.password ? 'As senhas não conferem.' : null),
    },
  });

  const submit = form.onSubmit(async (v) => {
    if (!token) return;
    setError('');
    try {
      await resetPassword.mutateAsync({ token, newPassword: v.password });
      notifySuccess('Senha redefinida. Você já pode entrar.');
      navigate('/', { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível redefinir a senha.');
    }
  });

  return (
    <Center mih="100vh" p="lg">
      <Stack w="100%" maw={420} gap={0}>
        <Title order={1}>Redefinir senha</Title>
        <Text c="dimmed" size="md" mt={6} mb="xl">
          Escolha uma senha nova pra sua conta.
        </Text>

        <Card component="form" onSubmit={submit}>
          <Stack gap="md">
            {!token ? (
              <Alert color="brick" variant="light">
                Link inválido. Peça um novo link em &quot;Esqueci minha senha&quot;.
              </Alert>
            ) : (
              <>
                <PasswordInput
                  label="Nova senha"
                  autoComplete="new-password"
                  autoFocus
                  key={form.key('password')}
                  {...form.getInputProps('password')}
                />
                <PasswordInput
                  label="Confirme a nova senha"
                  autoComplete="new-password"
                  key={form.key('confirm')}
                  {...form.getInputProps('confirm')}
                />
                {error && <Alert color="brick" variant="light">{error}</Alert>}
                <Button type="submit" loading={resetPassword.isPending} fullWidth>
                  Redefinir senha
                </Button>
              </>
            )}
            <Anchor component={Link} to="/" size="sm" ta="center">
              Voltar pro login
            </Anchor>
          </Stack>
        </Card>
      </Stack>
    </Center>
  );
}
