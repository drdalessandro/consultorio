// SPDX-FileCopyrightText: Copyright EPA Bienestar
// SPDX-License-Identifier: Apache-2.0
import { Anchor, Badge, Button, List, Stack, Text, Title } from '@mantine/core';
import { Document } from '@medplum/react';
import type { JSX } from 'react';
import { Link } from 'react-router';

export function LandingPage(): JSX.Element {
  return (
    <Document width={640}>
      <Stack align="center" gap="md">
        <Badge size="lg" color="epa" variant="light">
          EPA Bienestar IA · FemTech
        </Badge>
        <Title order={1} fz={32} ta="center">
          Consultorio
        </Title>
        <Text ta="center" c="dimmed" fw={500}>
          Salud cardiovascular de la mujer en cada etapa de la vida.
        </Text>
        <Text ta="center" c="dimmed" size="sm">
          Plataforma clínica guiada por el estándar{' '}
          <Anchor href="https://hl7.org/fhir/" target="_blank" rel="noreferrer">
            FHIR R4 / R5 / R6
          </Anchor>{' '}
          que optimiza el flujo de trabajo del profesional: historia longitudinal, pedidos de
          estudios, agenda, Plan Bienestar 100 Días e interpretación asistida por IA. Integrado a
          los programas de{' '}
          <Anchor href="https://www.epa-bienestar.com.ar" target="_blank" rel="noreferrer">
            epa-bienestar.com.ar
          </Anchor>
          .
        </Text>
        <List size="sm" c="dimmed" withPadding>
          <List.Item>Historia clínica longitudinal por paciente y por programa</List.Item>
          <List.Item>Pedidos de laboratorio e imágenes con códigos LOINC</List.Item>
          <List.Item>Plan Bienestar 100 Días: objetivos, actividades y seguimiento</List.Item>
          <List.Item>Devices conectados (tensiómetro, balanza, glucómetro, actividad)</List.Item>
          <List.Item>Sugerencia e interpretación clínica por IA, con datos de-identificados</List.Item>
        </List>
        <Button component={Link} to="/signin" size="lg" radius="xl" mt="sm">
          Ingresar
        </Button>
      </Stack>
    </Document>
  );
}
