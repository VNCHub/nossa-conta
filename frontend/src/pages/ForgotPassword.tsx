import { useState } from 'react';
import { Alert, Anchor, Button, Card, Center, Stack, Text, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { Link } from 'react-router-dom';
import { useForgotPassword } from '../api/hooks';

export default function ForgotPassword() {
  const forgotPassword = useForgotPassword();
  const [sent, setSent] = useState(false);

  const form = useForm({
    mode: 'uncontrolled',
    initialValues: { email: '' },
    validate: {
      email: (v) => (/^\S+@\S+\.\S+$/.test(v) ? null : 'Informe um e-mail válido.'),
    },
  });

  const submit = form.onSubmit(async (v) => {
    // The backend always answers the same way whether the e-mail has an
    // account or not — showing the same state here keeps that guarantee end to end.
    await forgotPassword.mutateAsync(v.email).catch(() => undefined);
    setSent(true);
  });

  return (
    <Center mih="100vh" p="lg">
      <Stack w="100%" maw={420} gap={0}>
        <Title order={1}>Esqueci minha senha</Title>
        <Text c="dimmed" size="md" mt={6} mb="xl">
          Informe seu e-mail e mandamos um link pra você escolher uma senha nova.
        </Text>

        <Card component="form" onSubmit={submit}>
          <Stack gap="md">
            {sent ? (
              <Alert color="petrol" variant="light">
                Se esse e-mail tiver uma conta, o link pra redefinir a senha já foi enviado.
              </Alert>
            ) : (
              <>
                <TextInput
                  label="E-mail"
                  type="email"
                  placeholder="voce@email.com"
                  autoComplete="email"
                  autoFocus
                  key={form.key('email')}
                  {...form.getInputProps('email')}
                />
                <Button type="submit" loading={forgotPassword.isPending} fullWidth>
                  Enviar link
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
