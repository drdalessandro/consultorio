// SPDX-FileCopyrightText: Copyright EPA Bienestar
// SPDX-License-Identifier: Apache-2.0
import { Stack, Text, Title } from '@mantine/core';
import { SignInForm } from '@medplum/react';
import type { JSX } from 'react';
import { useNavigate } from 'react-router';
import { EpaLogo } from '../components/EpaLogo';
import { getConfig } from '../config';

export function SignInPage(): JSX.Element {
  const navigate = useNavigate();
  return (
    <SignInForm
      googleClientId={getConfig().googleClientId}
      onSuccess={() => navigate('/')?.catch(console.error)}
      clientId={getConfig().clientId}
      projectId={getConfig().projectId}
    >
      <Stack align="center" gap={4}>
        <EpaLogo size={48} />
        <Title order={2}>Consultorio</Title>
        <Text size="xs" c="dimmed">
          EPA Bienestar IA · FemTech cardiovascular
        </Text>
      </Stack>
    </SignInForm>
  );
}
