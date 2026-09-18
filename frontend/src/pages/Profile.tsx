import { Button, Card, Divider, PasswordInput, Stack, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useAuth } from '../auth/AuthContext';
import { useUpdateProfile } from '../api/hooks';
import { PageHeader } from '../components/ui';
import { notifyError, notifySuccess } from '../feedback';

export default function Profile() {
  const { user, reloadUser } = useAuth();
  const updateProfile = useUpdateProfile();

  const nameForm = useForm({
    mode: 'uncontrolled',
    initialValues: { name: user?.name ?? '' },
    validate: {
      name: (v) => (!v.trim() ? 'Informe seu nome.' : null),
    },
  });

  const passwordForm = useForm({
    mode: 'uncontrolled',
    initialValues: { currentPassword: '', newPassword: '', confirm: '' },
    validate: {
      currentPassword: (v) => (!v ? 'Informe a senha atual.' : null),
      newPassword: (v) => (v.length < 6 ? 'A senha precisa ter 6 caracteres ou mais.' : null),
      confirm: (v, values) => (v !== values.newPassword ? 'As senhas não conferem.' : null),
    },
  });

  const submitName = nameForm.onSubmit(async (v) => {
    try {
      await updateProfile.mutateAsync({ name: v.name.trim() });
      await reloadUser();
      notifySuccess('Nome atualizado.');
    } catch (e) {
      notifyError(e instanceof Error ? e.message : 'Não foi possível atualizar o nome.');
    }
  });

  const submitPassword = passwordForm.onSubmit(async (v) => {
    try {
      await updateProfile.mutateAsync({
        currentPassword: v.currentPassword,
        newPassword: v.newPassword,
      });
      passwordForm.reset();
      notifySuccess('Senha atualizada.');
    } catch (e) {
      notifyError(e instanceof Error ? e.message : 'Não foi possível atualizar a senha.');
    }
  });

  return (
    <Stack gap="xl">
      <PageHeader title="Meu perfil" description="Seus dados de conta." />

      <Card component="form" onSubmit={submitName} maw={420}>
        <Stack gap="md">
          <TextInput label="Nome" key={nameForm.key('name')} {...nameForm.getInputProps('name')} />
          <TextInput label="E-mail" value={user?.email ?? ''} disabled />
          <Button type="submit" loading={updateProfile.isPending} fullWidth>
            Salvar nome
          </Button>
        </Stack>
      </Card>

      <Divider maw={420} label="Trocar senha" labelPosition="left" />

      <Card component="form" onSubmit={submitPassword} maw={420}>
        <Stack gap="md">
          <PasswordInput
            label="Senha atual"
            autoComplete="current-password"
            key={passwordForm.key('currentPassword')}
            {...passwordForm.getInputProps('currentPassword')}
          />
          <PasswordInput
            label="Nova senha"
            autoComplete="new-password"
            key={passwordForm.key('newPassword')}
            {...passwordForm.getInputProps('newPassword')}
          />
          <PasswordInput
            label="Confirme a nova senha"
            autoComplete="new-password"
            key={passwordForm.key('confirm')}
            {...passwordForm.getInputProps('confirm')}
          />
          <Button type="submit" loading={updateProfile.isPending} fullWidth>
            Salvar senha
          </Button>
        </Stack>
      </Card>
    </Stack>
  );
}
