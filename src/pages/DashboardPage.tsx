// SPDX-FileCopyrightText: Copyright EPA Bienestar
// SPDX-License-Identifier: Apache-2.0
//
// Resumen del consultorio · scope al Project Mujer (configurable via env).
// Filosofía: el estándar FHIR R4/R5/R6 marca el camino. Cada tarjeta consulta
// recursos canónicos sin abstraer demasiado, para que el profesional entienda
// qué pregunta se está haciendo.
import {
  Anchor,
  Badge,
  Card,
  Group,
  Progress,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import type { Patient } from '@medplum/fhirtypes';
import { useMedplum } from '@medplum/react';
import {
  IconActivity,
  IconCalendarEvent,
  IconClipboardList,
  IconDeviceHeartMonitor,
  IconDroplet,
  IconHeart,
  IconReportMedical,
  IconRobot,
  IconScale,
  IconStethoscope,
  IconUser,
  IconUsers,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import type { JSX } from 'react';
import { Link } from 'react-router';
import { CLINICAL_DEVICES } from '../clinicalDevices';
import type { ClinicalDeviceKind, ClinicalDeviceProfile } from '../clinicalDevices';
import { getConfig } from '../config';
import { distributeByLifeStage } from '../lifeStages';
import type { LifeStageDistribution } from '../lifeStages';
import { PLAN_100_CANONICAL, PLAN_100_TITLE } from '../plan100Dias';
import { ACTIVE_PROGRAMS } from '../programs';
import { withProjectScope, programTagValue } from '../projectScope';

interface GlobalKpis {
  totalPatients: number;
  pendingOrders: number;
  recentResults: number;
  upcomingAppointments: number;
  pendingAiSuggestions: number;
}

interface ProgramKpis {
  code: string;
  patients: number;
  encounters: number;
  pendingOrders: number;
}

interface Plan100Kpis {
  totalEnrolled: number;
  activeGoals: number;
  achievedGoals: number;
  upcomingActivities: number;
}

interface DeviceKpis {
  kind: ClinicalDeviceKind;
  total: number;
  active: number;
  inactive: number;
}

const ICON_MAP: Record<ClinicalDeviceProfile['icon'], JSX.Element> = {
  heartbeat: <IconHeart size={20} />,
  scale: <IconScale size={20} />,
  droplet: <IconDroplet size={20} />,
  activity: <IconActivity size={20} />,
};

export function DashboardPage(): JSX.Element {
  const medplum = useMedplum();
  const cfg = getConfig();
  const [global, setGlobal] = useState<GlobalKpis>();
  const [programs, setPrograms] = useState<ProgramKpis[]>();
  const [plan, setPlan] = useState<Plan100Kpis>();
  const [stages, setStages] = useState<LifeStageDistribution[]>();
  const [devices, setDevices] = useState<DeviceKpis[]>();

  useEffect(() => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const today = new Date().toISOString().slice(0, 10);

    async function load(): Promise<void> {
      // KPIs globales (scoped al Project activo)
      const [allPatients, pendingOrders, recentResults, appts, aiTasks] = await Promise.all([
        medplum.search('Patient', withProjectScope({ _summary: 'count' })),
        medplum.search('ServiceRequest', withProjectScope({ status: 'active', _summary: 'count' })),
        medplum.search(
          'DiagnosticReport',
          withProjectScope({ _lastUpdated: `gt${sevenDaysAgo}`, _summary: 'count' })
        ),
        medplum.search(
          'Appointment',
          withProjectScope({ status: 'booked', date: `ge${today}`, _summary: 'count' })
        ),
        medplum.search(
          'Task',
          withProjectScope({ code: 'ai-order-suggestion', status: 'requested', _summary: 'count' })
        ),
      ]);
      setGlobal({
        totalPatients: allPatients.total ?? 0,
        pendingOrders: pendingOrders.total ?? 0,
        recentResults: recentResults.total ?? 0,
        upcomingAppointments: appts.total ?? 0,
        pendingAiSuggestions: aiTasks.total ?? 0,
      });

      // Tarjetas por programa activo (Mujer + Hábitos)
      const programStats: ProgramKpis[] = [];
      for (const p of ACTIVE_PROGRAMS) {
        const tag = programTagValue(p.code);
        const [pat, enc, ord] = await Promise.all([
          medplum.search('Patient', withProjectScope({ _tag: tag, _summary: 'count' })),
          medplum.search('Encounter', withProjectScope({ _tag: tag, _summary: 'count' })),
          medplum.search(
            'ServiceRequest',
            withProjectScope({ _tag: tag, status: 'active', _summary: 'count' })
          ),
        ]);
        programStats.push({
          code: p.code,
          patients: pat.total ?? 0,
          encounters: enc.total ?? 0,
          pendingOrders: ord.total ?? 0,
        });
      }
      setPrograms(programStats);

      // Plan Bienestar 100 Días
      const [enrolled, activeGoals, achievedGoals, upcomingActivities] = await Promise.all([
        medplum.search(
          'CarePlan',
          withProjectScope({
            'instantiates-canonical': PLAN_100_CANONICAL,
            status: 'active',
            _summary: 'count',
          })
        ),
        medplum.search(
          'Goal',
          withProjectScope({ 'lifecycle-status': 'active', _summary: 'count' })
        ),
        medplum.search(
          'Goal',
          withProjectScope({ 'achievement-status': 'achieved', _summary: 'count' })
        ),
        medplum.search(
          'Task',
          withProjectScope({ status: 'requested', _summary: 'count' })
        ),
      ]);
      setPlan({
        totalEnrolled: enrolled.total ?? 0,
        activeGoals: activeGoals.total ?? 0,
        achievedGoals: achievedGoals.total ?? 0,
        upcomingActivities: upcomingActivities.total ?? 0,
      });

      // Etapas de la vida (calculadas client-side desde Patient.birthDate)
      const patientsForStages = await medplum.searchResources(
        'Patient',
        withProjectScope({
          gender: 'female',
          _count: '500',
          _elements: 'birthDate,gender',
        })
      );
      setStages(distributeByLifeStage(patientsForStages as Patient[]));

      // Devices clínicos (TA, peso, glucemia, actividad)
      const inactivityDate = (days: number): string =>
        new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const deviceStats: DeviceKpis[] = [];
      for (const profile of CLINICAL_DEVICES) {
        const code = profile.deviceTypes[0].code as string;
        const [total, recent] = await Promise.all([
          medplum.search('Device', withProjectScope({ type: code, _summary: 'count' })),
          medplum.search(
            'Observation',
            withProjectScope({
              code: profile.observationLoincs.join(','),
              date: `gt${inactivityDate(profile.inactivityDays)}`,
              _summary: 'count',
            })
          ),
        ]);
        const totalCount = total.total ?? 0;
        const activeCount = Math.min(totalCount, recent.total ?? 0);
        deviceStats.push({
          kind: profile.kind,
          total: totalCount,
          active: activeCount,
          inactive: Math.max(0, totalCount - activeCount),
        });
      }
      setDevices(deviceStats);
    }

    load().catch(console.error);
  }, [medplum]);

  return (
    <Stack p="md" gap="md">
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={2}>Resumen del consultorio</Title>
          <Text c="dimmed" size="sm">
            {cfg.projectLabel ?? 'Project activo'} · Salud cardiovascular de la mujer en cada etapa de la vida
          </Text>
        </div>
        <Badge color="epa" variant="light" size="lg">
          FHIR-first
        </Badge>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, md: 5 }} spacing="md">
        <KpiCard
          icon={<IconUser size={24} />}
          label="Pacientes"
          value={global?.totalPatients}
          href="/Patient"
          color="epa"
        />
        <KpiCard
          icon={<IconClipboardList size={24} />}
          label="Pedidos pendientes"
          value={global?.pendingOrders}
          href="/ServiceRequest?status=active"
          color="orange"
        />
        <KpiCard
          icon={<IconReportMedical size={24} />}
          label="Resultados (7d)"
          value={global?.recentResults}
          href="/DiagnosticReport"
          color="green"
        />
        <KpiCard
          icon={<IconCalendarEvent size={24} />}
          label="Próximos turnos"
          value={global?.upcomingAppointments}
          href="/Appointment?status=booked"
          color="cyan"
        />
        <KpiCard
          icon={<IconRobot size={24} />}
          label="Sugerencias IA"
          value={global?.pendingAiSuggestions}
          href="/Task?code=ai-order-suggestion&status=requested"
          color="grape"
        />
      </SimpleGrid>

      <Plan100Card kpis={plan} />

      <Title order={3} mt="md">
        Por programa
      </Title>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        {(programs ?? []).map((s) => {
          const p = ACTIVE_PROGRAMS.find((pg) => pg.code === s.code);
          if (!p) return null;
          return (
            <Card key={s.code} withBorder shadow="xs">
              <Group justify="space-between" align="flex-start">
                <Badge color={p.color} variant="filled" size="lg">
                  {p.display}
                </Badge>
                <IconStethoscope size={20} color="#0369A1" />
              </Group>
              <SimpleGrid cols={3} mt="md">
                <KpiInline label="Pacientes" value={s.patients} />
                <KpiInline label="Consultas" value={s.encounters} />
                <KpiInline label="Pedidos" value={s.pendingOrders} />
              </SimpleGrid>
              <Group gap="xs" mt="sm">
                <Anchor
                  component={Link}
                  to={`/Patient?_tag=${programTagValue(s.code)}`}
                  size="xs"
                >
                  Ver pacientes
                </Anchor>
                <Anchor href={p.url} target="_blank" rel="noreferrer" size="xs">
                  Abrir programa →
                </Anchor>
              </Group>
            </Card>
          );
        })}
      </SimpleGrid>

      <LifeStagesCard stages={stages} />

      <DevicesCard devices={devices} />
    </Stack>
  );
}

function KpiCard({
  icon,
  label,
  value,
  href,
  color,
}: {
  icon: JSX.Element;
  label: string;
  value: number | string | undefined;
  href: string;
  color: string;
}): JSX.Element {
  return (
    <Card component={Link} to={href} withBorder shadow="xs" style={{ textDecoration: 'none' }}>
      <Group>
        <ThemeIcon color={color} size="xl" radius="md" variant="light">
          {icon}
        </ThemeIcon>
        <div>
          <Text size="xs" c="dimmed">
            {label}
          </Text>
          <Text size="xl" fw={600}>
            {value ?? '—'}
          </Text>
        </div>
      </Group>
    </Card>
  );
}

function KpiInline({ label, value }: { label: string; value: number }): JSX.Element {
  return (
    <div>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text size="lg" fw={600}>
        {value}
      </Text>
    </div>
  );
}

function Plan100Card({ kpis }: { kpis: Plan100Kpis | undefined }): JSX.Element {
  const enrolled = kpis?.totalEnrolled ?? 0;
  const active = kpis?.activeGoals ?? 0;
  const achieved = kpis?.achievedGoals ?? 0;
  const totalGoals = active + achieved;
  const pct = totalGoals > 0 ? Math.round((achieved / totalGoals) * 100) : 0;

  return (
    <Card withBorder shadow="xs" radius="md" p="lg">
      <Group justify="space-between" align="flex-start">
        <Group gap="sm">
          <ThemeIcon size="xl" radius="md" color="pink" variant="light">
            <IconHeart size={24} />
          </ThemeIcon>
          <div>
            <Title order={3}>{PLAN_100_TITLE}</Title>
            <Text size="xs" c="dimmed">
              Transformación de hábitos cardiovasculares · Life's Essential 8
            </Text>
          </div>
        </Group>
        <Anchor
          component={Link}
          to={`/CarePlan?instantiates-canonical=${encodeURIComponent(PLAN_100_CANONICAL)}&status=active`}
          size="sm"
        >
          Ver pacientes inscriptas →
        </Anchor>
      </Group>

      <SimpleGrid cols={{ base: 2, sm: 4 }} mt="md">
        <Stack gap={2}>
          <Text size="xs" c="dimmed">
            Pacientes inscriptas
          </Text>
          <Text size="xl" fw={600}>
            {enrolled}
          </Text>
        </Stack>
        <Stack gap={2}>
          <Text size="xs" c="dimmed">
            Goals activos
          </Text>
          <Text size="xl" fw={600}>
            {active}
          </Text>
        </Stack>
        <Stack gap={2}>
          <Text size="xs" c="dimmed">
            Goals alcanzados
          </Text>
          <Text size="xl" fw={600}>
            {achieved}
          </Text>
        </Stack>
        <Stack gap={2}>
          <Text size="xs" c="dimmed">
            Activities pendientes
          </Text>
          <Text size="xl" fw={600}>
            {kpis?.upcomingActivities ?? 0}
          </Text>
        </Stack>
      </SimpleGrid>

      <Stack gap={4} mt="md">
        <Group justify="space-between">
          <Text size="xs" c="dimmed">
            Cumplimiento global de goals
          </Text>
          <Text size="xs" c="dimmed">
            {pct}%
          </Text>
        </Group>
        <Progress value={pct} color="pink" size="md" radius="sm" />
      </Stack>
    </Card>
  );
}

function LifeStagesCard({ stages }: { stages: LifeStageDistribution[] | undefined }): JSX.Element {
  const total = (stages ?? []).reduce((sum, s) => sum + s.count, 0);
  return (
    <Card withBorder shadow="xs" radius="md" p="lg">
      <Group gap="sm" mb="md">
        <ThemeIcon size="xl" radius="md" color="grape" variant="light">
          <IconUsers size={24} />
        </ThemeIcon>
        <div>
          <Title order={3}>Etapas de la vida</Title>
          <Text size="xs" c="dimmed">
            Distribución de pacientes femeninas por edad ({total} total)
          </Text>
        </div>
      </Group>
      {!stages || total === 0 ? (
        <Text c="dimmed" size="sm">
          Sin pacientes femeninas con fecha de nacimiento cargada.
        </Text>
      ) : (
        <Stack gap="xs">
          {stages.map(({ stage, count }) => {
            const pct = total > 0 ? (count / total) * 100 : 0;
            return (
              <Stack key={stage.code} gap={2}>
                <Group justify="space-between">
                  <Group gap={6}>
                    <Badge color={stage.color} variant="light" size="sm">
                      {stage.label}
                    </Badge>
                    <Text size="xs" c="dimmed">
                      {stage.ageRange[0]}-{stage.ageRange[1] === 130 ? '+' : stage.ageRange[1]} años
                    </Text>
                  </Group>
                  <Text size="sm" fw={500}>
                    {count}
                  </Text>
                </Group>
                <Progress value={pct} color={stage.color} size="sm" radius="sm" />
              </Stack>
            );
          })}
        </Stack>
      )}
    </Card>
  );
}

function DevicesCard({ devices }: { devices: DeviceKpis[] | undefined }): JSX.Element {
  return (
    <Card withBorder shadow="xs" radius="md" p="lg">
      <Group gap="sm" mb="md">
        <ThemeIcon size="xl" radius="md" color="cyan" variant="light">
          <IconDeviceHeartMonitor size={24} />
        </ThemeIcon>
        <div>
          <Title order={3}>Devices monitoreados</Title>
          <Text size="xs" c="dimmed">
            Tensiómetros, balanzas, glucómetros y trackers de actividad vinculados a pacientes
          </Text>
        </div>
      </Group>
      <SimpleGrid cols={{ base: 2, md: 4 }}>
        {CLINICAL_DEVICES.map((profile) => {
          const k = devices?.find((d) => d.kind === profile.kind);
          const total = k?.total ?? 0;
          const inactive = k?.inactive ?? 0;
          return (
            <Card key={profile.kind} withBorder bg="gray.0" radius="md" p="md">
              <Group justify="space-between" align="flex-start">
                <ThemeIcon color={profile.color} variant="light" size="lg" radius="md">
                  {ICON_MAP[profile.icon]}
                </ThemeIcon>
                {inactive > 0 && (
                  <Badge color="red" size="xs" variant="filled">
                    {inactive} inactivo{inactive === 1 ? '' : 's'}
                  </Badge>
                )}
              </Group>
              <Text size="xs" c="dimmed" mt="xs">
                {profile.label}
              </Text>
              <Text size="xl" fw={600}>
                {total}
              </Text>
              <Text size="xs" c="dimmed">
                {k?.active ?? 0} activos · alerta &gt; {profile.inactivityDays}d sin transmitir
              </Text>
            </Card>
          );
        })}
      </SimpleGrid>
      <Anchor component={Link} to="/Device" size="xs" mt="sm">
        Ver inventario completo de Devices →
      </Anchor>
    </Card>
  );
}
