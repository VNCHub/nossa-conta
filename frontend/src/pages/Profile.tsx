import { Button, Card, Divider, PasswordInput, Stack, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useAuth } from '../auth/AuthContext';
import { useUpdateProfile } from '../api/hooks';
import { PageHeader } from '../components/ui';
import { notifyError, notifySuccess } from '../feedback';

// iOS Safari zooms the whole page in when a focused input's font-size is
// below 16px — the theme's default sizes are 13.5–14.5px, so every field on
// this screen needs the override to stay usable on a phone.
const noZoomInputStyles = { input: { fontSize: 16, minHeight: 44 } };

// Mantine's "md" button is 42px tall; 44px is the minimum comfortable touch target.
const touchButtonStyles = { root: { minHeight: 44 } };

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

      <Card component="form" onSubmit={submitName} maw={420} w="100%">
        <Stack gap="md">
          <TextInput
            label="Nome"
            size="md"
            autoComplete="name"
            autoCapitalize="words"
            styles={noZoomInputStyles}
            key={nameForm.key('name')}
            {...nameForm.getInputProps('name')}
          />
          <TextInput
            label="E-mail"
            description="Não pode ser alterado"
            size="md"
            styles={noZoomInputStyles}
            value={user?.email ?? ''}
            disabled
          />
          <Button type="submit" size="md" loading={updateProfile.isPending} styles={touchButtonStyles} fullWidth>
            Salvar nome
          </Button>
        </Stack>
      </Card>

      <Divider maw={420} w="100%" label="Trocar senha" labelPosition="left" />

      <Card component="form" onSubmit={submitPassword} maw={420} w="100%">
        <Stack gap="md">
          {/* Hidden username so mobile password managers associate the saved
              credential with "Senha atual" and offer to fill it in — typing a
              real password on a phone keyboard is the worst part of this form. */}
          <input type="text" name="email" autoComplete="username" value={user?.email ?? ''} readOnly hidden />
          <PasswordInput
            label="Senha atual"
            size="md"
            autoComplete="current-password"
            styles={noZoomInputStyles}
            key={passwordForm.key('currentPassword')}
            {...passwordForm.getInputProps('currentPassword')}
          />
          <PasswordInput
            label="Nova senha"
            size="md"
            autoComplete="new-password"
            styles={noZoomInputStyles}
            key={passwordForm.key('newPassword')}
            {...passwordForm.getInputProps('newPassword')}
          />
          <PasswordInput
            label="Confirme a nova senha"
            size="md"
            autoComplete="new-password"
            styles={noZoomInputStyles}
            key={passwordForm.key('confirm')}
            {...passwordForm.getInputProps('confirm')}
          />
          <Button type="submit" size="md" loading={updateProfile.isPending} styles={touchButtonStyles} fullWidth>
            Salvar senha
          </Button>
        </Stack>
      </Card>
    </Stack>
  );
}
