import { existsSync, readFileSync } from 'fs';
import { readFile } from 'fs/promises';
import { hostname as resolveHostname } from 'os';
import { request as httpRequest } from 'node:http';
import {
  SESAME_EXPECTED_VOLUMES,
  SesameExpectedVolume,
  SesameVolumeCategory,
} from '~/_common/constants/sesame-expected-volumes.constant';

export interface DockerMountInfo {
  mountPoint: string;
  source: string;
  type: string;
  options: string;
  readOnly: boolean;
}

export interface SesameVolumeStatus {
  id: string;
  category: SesameVolumeCategory;
  label: string;
  composeHint: string;
  mountPoint: string;
  status: 'active' | 'inactive';
  required: boolean;
  source: string | null;
  type: string | null;
  options: string | null;
  readOnly: boolean | null;
}

export interface DockerContainerMetadata {
  id: string | null;
  name: string | null;
  image: string | null;
  labels: Record<string, string>;
  inspectSource: 'docker-api' | 'mountinfo';
  socketAvailable: boolean;
  inspectDetail: string | null;
}

export interface DockerVolumeSnapshot {
  volumes: SesameVolumeStatus[];
  metadata: DockerContainerMetadata;
  rawMounts: DockerMountInfo[];
}

const RELEVANT_MOUNT_PREFIXES = ['/data', '/etc/supervisor'];
const DOCKER_SOCKET_PATH = process.env.SESAME_DOCKER_SOCKET_PATH || '/var/run/docker.sock';

export function isRunningInContainer(): boolean {
  return existsSync('/.dockerenv');
}

export function isVolumeMountActive(expectedMountPoint: string, mounts: DockerMountInfo[]): boolean {
  return mounts.some(({ mountPoint }) => {
    if (expectedMountPoint === mountPoint) {
      return true;
    }

    if (expectedMountPoint.startsWith(`${mountPoint}/`)) {
      return true;
    }

    if (mountPoint.startsWith(`${expectedMountPoint}/`)) {
      return true;
    }

    return false;
  });
}

function findMatchingMount(expectedMountPoint: string, mounts: DockerMountInfo[]): DockerMountInfo | null {
  const exact = mounts.find((mount) => mount.mountPoint === expectedMountPoint);
  if (exact) {
    return exact;
  }

  const parent = mounts
    .filter(
      (mount) =>
        expectedMountPoint.startsWith(`${mount.mountPoint}/`) || mount.mountPoint.startsWith(`${expectedMountPoint}/`),
    )
    .sort((a, b) => b.mountPoint.length - a.mountPoint.length)[0];

  return parent || null;
}

function buildSesameVolumeStatuses(
  expectedVolumes: SesameExpectedVolume[],
  mounts: DockerMountInfo[],
): SesameVolumeStatus[] {
  return expectedVolumes.map((expected) => {
    const active = isVolumeMountActive(expected.mountPoint, mounts);
    const matchingMount = active ? findMatchingMount(expected.mountPoint, mounts) : null;

    return {
      id: expected.id,
      category: expected.category,
      label: expected.label,
      composeHint: expected.composeHint,
      mountPoint: expected.mountPoint,
      status: active ? 'active' : 'inactive',
      required: expected.required,
      source: matchingMount?.source || null,
      type: matchingMount?.type || null,
      options: matchingMount?.options || null,
      readOnly: matchingMount?.readOnly ?? null,
    };
  });
}

function readEtcHostname(): string | null {
  try {
    const value = readFileSync('/etc/hostname', 'utf8').trim();
    return value || null;
  } catch {
    return null;
  }
}

export function collectContainerIdCandidates(): string[] {
  const candidates = new Set<string>();

  try {
    const cgroup = readFileSync('/proc/self/cgroup', 'utf8');
    const dockerMatch = cgroup.match(/docker[/-]([0-9a-f]{64})/i);
    if (dockerMatch?.[1]) {
      candidates.add(dockerMatch[1]);
    }

    const scopeMatch = cgroup.match(/docker-([0-9a-f]{64})\.scope/i);
    if (scopeMatch?.[1]) {
      candidates.add(scopeMatch[1]);
    }

    const hexMatch = cgroup.match(/[0-9a-f]{64}/i);
    if (hexMatch?.[0]) {
      candidates.add(hexMatch[0]);
    }
  } catch {
    // ignore
  }

  for (const value of [process.env.HOSTNAME, resolveHostname(), readEtcHostname()]) {
    const normalized = `${value || ''}`.trim();
    if (/^[0-9a-f]{12,64}$/i.test(normalized)) {
      candidates.add(normalized);
    }
  }

  return [...candidates];
}

function getContainerId(): string | null {
  return collectContainerIdCandidates()[0] || null;
}

function dockerApiRequest<T>(path: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = httpRequest(
      {
        socketPath: DOCKER_SOCKET_PATH,
        path,
        method: 'GET',
        headers: {
          Host: 'localhost',
          Accept: 'application/json',
        },
      },
      (res) => {
        let raw = '';

        res.on('data', (chunk) => {
          raw += chunk.toString();
        });

        res.on('end', () => {
          if ((res.statusCode || 500) >= 400) {
            reject(new Error(`docker_api_status_${res.statusCode}`));
            return;
          }

          try {
            resolve(JSON.parse(raw) as T);
          } catch (error) {
            reject(error);
          }
        });
      },
    );

    req.on('error', reject);
    req.end();
  });
}

interface DockerInspectMount {
  Type?: string;
  Source?: string;
  Destination?: string;
  Mode?: string;
  RW?: boolean;
}

export interface DependencyContainerMetadata {
  containerName: string;
  image: string | null;
  id: string | null;
  status: string | null;
  startedAt: string | null;
  labels: Record<string, string>;
}

interface DockerContainerInspectResponse {
  Id?: string;
  Name?: string;
  Created?: string;
  Config?: {
    Image?: string;
    Labels?: Record<string, string>;
  };
  State?: {
    Status?: string;
    Running?: boolean;
    StartedAt?: string;
  };
  Mounts?: DockerInspectMount[];
}

interface DockerContainerListItem {
  Id?: string;
  Names?: string[];
}

function mapInspectToResult(
  inspect: DockerContainerInspectResponse,
  containerId: string,
): {
  mounts: DockerMountInfo[];
  metadata: DockerContainerMetadata;
} {
  const mounts = (inspect.Mounts || [])
    .map((mount) => ({
      mountPoint: mount.Destination || '',
      source: mount.Source || '',
      type: mount.Type || 'unknown',
      options: mount.Mode || '',
      readOnly: mount.RW === false || `${mount.Mode || ''}`.includes('ro'),
    }))
    .filter((mount) => mount.mountPoint.length > 0);

  return {
    mounts,
    metadata: {
      id: inspect.Id || containerId,
      name: inspect.Name?.replace(/^\//, '') || null,
      image: inspect.Config?.Image || null,
      labels: inspect.Config?.Labels || {},
      inspectSource: 'docker-api',
      socketAvailable: true,
      inspectDetail: null,
    },
  };
}

export async function resolveDependencyContainerMetadata(
  containerName: string,
): Promise<DependencyContainerMetadata | null> {
  if (!existsSync(DOCKER_SOCKET_PATH)) {
    return null;
  }

  try {
    const inspect = await resolveContainerInspectByName(containerName);
    if (!inspect?.Id) {
      return null;
    }

    return {
      containerName,
      image: inspect.Config?.Image || null,
      id: inspect.Id,
      status: inspect.State?.Status || null,
      startedAt: inspect.State?.StartedAt || inspect.Created || null,
      labels: inspect.Config?.Labels || {},
    };
  } catch {
    return null;
  }
}

async function resolveContainerInspectByName(containerName: string): Promise<DockerContainerInspectResponse | null> {
  const filters = encodeURIComponent(JSON.stringify({ name: [containerName] }));
  const containers = await dockerApiRequest<DockerContainerListItem[]>(`/containers/json?all=true&filters=${filters}`);

  const containerId = containers[0]?.Id;
  if (!containerId) {
    return null;
  }

  return dockerApiRequest<DockerContainerInspectResponse>(`/containers/${containerId}/json`);
}

async function resolveMountsFromDockerApi(): Promise<{
  mounts: DockerMountInfo[];
  metadata: DockerContainerMetadata;
} | null> {
  if (!existsSync(DOCKER_SOCKET_PATH)) {
    return null;
  }

  const candidates = collectContainerIdCandidates();

  for (const containerId of candidates) {
    try {
      const inspect = await dockerApiRequest<DockerContainerInspectResponse>(`/containers/${containerId}/json`);
      return mapInspectToResult(inspect, containerId);
    } catch {
      // Try the next candidate.
    }
  }

  const containerName = (process.env.SESAME_CONTAINER_NAME || 'sesame-orchestrator').trim();
  if (containerName) {
    try {
      const inspect = await resolveContainerInspectByName(containerName);
      if (inspect?.Id) {
        return mapInspectToResult(inspect, inspect.Id);
      }
    } catch {
      // Fall back to mountinfo below.
    }
  }

  return null;
}

export async function resolveMountsFromMountInfo(): Promise<DockerMountInfo[]> {
  if (!existsSync('/proc/self/mountinfo')) {
    return [];
  }

  const raw = await readFile('/proc/self/mountinfo', 'utf8');
  const mounts: DockerMountInfo[] = [];
  const seen = new Set<string>();

  for (const line of raw.split('\n')) {
    if (!line.trim()) {
      continue;
    }

    const separatorIndex = line.indexOf(' - ');
    if (separatorIndex === -1) {
      continue;
    }

    const leftFields = line.slice(0, separatorIndex).trim().split(/\s+/);
    const rightFields = line
      .slice(separatorIndex + 3)
      .trim()
      .split(/\s+/);

    if (leftFields.length < 6 || rightFields.length < 2) {
      continue;
    }

    const mountPoint = leftFields[4];
    const options = leftFields[5] || '';
    const type = rightFields[0] || 'unknown';
    const source = rightFields[1] || '';

    if (!RELEVANT_MOUNT_PREFIXES.some((prefix) => mountPoint === prefix || mountPoint.startsWith(`${prefix}/`))) {
      continue;
    }

    const key = `${source}|${mountPoint}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    mounts.push({
      mountPoint,
      source,
      type,
      options,
      readOnly: options.includes('ro'),
    });
  }

  return mounts.sort((a, b) => a.mountPoint.localeCompare(b.mountPoint));
}

export async function resolveDockerVolumes(): Promise<DockerVolumeSnapshot> {
  const dockerApiResult = await resolveMountsFromDockerApi();
  const rawMounts = dockerApiResult?.mounts || (await resolveMountsFromMountInfo());
  const socketAvailable = existsSync(DOCKER_SOCKET_PATH);
  const metadata: DockerContainerMetadata = dockerApiResult?.metadata || {
    id: getContainerId(),
    name: process.env.SESAME_CONTAINER_NAME || null,
    image: null,
    labels: {},
    inspectSource: 'mountinfo',
    socketAvailable,
    inspectDetail: socketAvailable
      ? 'Docker API indisponible ou conteneur non identifié (fallback mountinfo)'
      : 'Socket Docker non monté (fallback mountinfo)',
  };

  return {
    volumes: buildSesameVolumeStatuses(SESAME_EXPECTED_VOLUMES, rawMounts),
    metadata,
    rawMounts,
  };
}
