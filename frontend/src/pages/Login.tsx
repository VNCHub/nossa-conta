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

type Modo = 'entrar' | 'criar';

export default function Login() {
  const { entrar, cadastrar } = useAuth();
  const [modo, setModo] = useState<Modo>('entrar');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const form = useForm({
    mode: 'uncontrolled',
    initialValues: { nome: '', email: '', senha: '', codigoConvite: '', nomeFamilia: '' },
    validate: {
      nome: (v) => (modo === 'criar' && !v.trim() ? 'Informe seu nome.' : null),
      email: (v) => (/^\S+@\S+\.\S+$/.test(v) ? null : 'Informe um e-mail válido.'),
      senha: (v) =>
        modo === 'criar' && v.length < 6 ? 'A senha precisa ter 6 caracteres ou mais.' : null,
      nomeFamilia: (v, valores) =>
        modo === 'criar' && !v.trim() && !valores.codigoConvite.trim()
          ? 'Crie uma família ou entre com um código de convite.'
          : null,
    },
  });

  const trocarModo = (m: Modo) => {
    setModo(m);
    setErro('');
    form.clearErrors();
  };

  const enviar = form.onSubmit(async (v) => {
    setErro('');
    setEnviando(true);
    try {
      if (modo === 'entrar') {
        await entrar(v.email, v.senha);
      } else {
        await cadastrar({
          nome: v.nome,
          email: v.email,
          senha: v.senha,
          codigoConvite: v.codigoConvite.trim() || undefined,
          nomeFamilia: v.codigoConvite.trim() ? undefined : v.nomeFamilia.trim(),
        });
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível entrar.');
    } finally {
      setEnviando(false);
    }
  });

  return (
    <Center mih="100vh" p="lg">
      <Stack w="100%" maw={420} gap={0}>
        <Title order={1}>Grana a Dois</Title>
        <Text c="dimmed" size="md" mt={6} mb="xl">
          Cada um lança o que gastou. No fim do mês, o app diz quem paga quanto pra quem.
        </Text>

        <Card>
          <SegmentedControl
            fullWidth
            value={modo}
            onChange={(v) => trocarModo(v as Modo)}
            data={[
              { value: 'entrar', label: 'Entrar' },
              { value: 'criar', label: 'Criar conta' },
            ]}
            mb="lg"
          />

          <form onSubmit={enviar}>
            <Stack gap="md">
              {modo === 'criar' && (
                <TextInput label="Nome" autoComplete="name" key={form.key('nome')} {...form.getInputProps('nome')} />
              )}

              <TextInput label="E-mail" type="email" autoComplete="email" key={form.key('email')} {...form.getInputProps('email')} />

              <PasswordInput
                label="Senha"
                autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
                key={form.key('senha')}
                {...form.getInputProps('senha')}
              />

              {modo === 'criar' && (
                <Grid gap="sm">
                  <Grid.Col span={{ base: 12, xs: 6 }}>
                    <TextInput
                      label="Código de convite" placeholder="VILA-7K2M"
                      key={form.key('codigoConvite')} {...form.getInputProps('codigoConvite')}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, xs: 6 }}>
                    <TextInput
                      label="ou crie uma família" placeholder="Nome da família"
                      key={form.key('nomeFamilia')} {...form.getInputProps('nomeFamilia')}
                    />
                  </Grid.Col>
                </Grid>
              )}

              <Button type="submit" loading={enviando} fullWidth>
                {modo === 'entrar' ? 'Entrar' : 'Criar conta'}
              </Button>

              {erro && <Alert color="tijolo" variant="light">{erro}</Alert>}
            </Stack>
          </form>
        </Card>
      </Stack>
    </Center>
  );
}
