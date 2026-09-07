import { useState } from 'react';
import { Alert, Button, Card, Center, Stack, Text, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';

/**
 * Estado possível para uma conta que ficou sem família (o criador saiu, por
 * exemplo). Sem isso, o app cairia em 403 em todas as telas.
 */
export default function SemFamilia() {
  const { usuario, recarregarUsuario, sair } = useAuth();
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const form = useForm({
    mode: 'uncontrolled',
    initialValues: { codigo: '', nome: '' },
    validate: {
      nome: (v, vals) =>
        !v.trim() && !vals.codigo.trim()
          ? 'Informe um código de convite ou o nome da nova família.'
          : null,
    },
  });

  const enviar = form.onSubmit(async (v) => {
    setErro('');
    setEnviando(true);
    try {
      if (v.codigo.trim()) await api.post('/familias/entrar', { codigo: v.codigo.trim() });
      else await api.post('/familias', { nome: v.nome.trim() });
      await recarregarUsuario();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível concluir.');
    } finally {
      setEnviando(false);
    }
  });

  return (
    <Center mih="100vh" p="lg">
      <Stack w="100%" maw={420} gap={0}>
        <Title order={1}>Olá, {usuario?.nome}</Title>
        <Text c="dimmed" size="md" mt={6} mb="xl">
          Você ainda não faz parte de uma família. Entre em uma ou crie a sua.
        </Text>

        <Card component="form" onSubmit={enviar}>
          <Stack gap="md">
            <TextInput label="Código de convite" placeholder="VILA-7K2M" key={form.key('codigo')} {...form.getInputProps('codigo')} />
            <TextInput label="ou crie uma família" placeholder="Nome da família" key={form.key('nome')} {...form.getInputProps('nome')} />
            <Button type="submit" loading={enviando} fullWidth>Continuar</Button>
            {erro && <Alert color="tijolo" variant="light">{erro}</Alert>}
            <Button variant="subtle" color="gray" onClick={() => void sair()}>Sair da conta</Button>
          </Stack>
        </Card>
      </Stack>
    </Center>
  );
}
