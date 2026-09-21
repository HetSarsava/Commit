import { existsSync, copyFileSync, readFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import net from 'node:net';
import path from 'node:path';
import pg from 'pg';

const { Client } = pg;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(root, '.env');
const envExamplePath = path.join(root, '.env.example');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
let localEnvironment = {};
let childEnvironment = { ...process.env };

function log(message) {
  console.log(`[commit] ${message}`);
}

function fail(message) {
  console.error(`\n[commit] ERROR: ${message}`);
  process.exitCode = 1;
}

function commandAvailable(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'ignore', windowsHide: true });
  return !result.error && result.status === 0;
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: options.stdio ?? 'inherit',
      shell: false,
      windowsHide: true,
      env: childEnvironment,
    });

    child.once('error', reject);
    child.once('close', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(' ')} exited with ${signal ? `signal ${signal}` : `code ${code}`}`));
    });
  });
}

async function runChecked(command, args, description) {
  log(description);
  try {
    await run(command, args);
    log(`${description} complete.`);
  } catch (error) {
    throw new Error(`${description} failed. ${error.message}`);
  }
}

function unquote(value) {
  if (value.length >= 2 && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))) {
    return value.slice(1, -1);
  }

  return value;
}

function parseEnvironment(text) {
  const values = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (match) {
      values[match[1]] = unquote(match[2].trim());
    }
  }

  return values;
}

function ensureDependencies() {
  const requiredPackages = ['concurrently', 'pg'];
  const missing = requiredPackages.filter((packageName) => !existsSync(path.join(root, 'node_modules', packageName)));
  if (!existsSync(path.join(root, 'node_modules')) || missing.length > 0) {
    throw new Error(`Node dependencies are not installed${missing.length ? ` (${missing.join(', ')})` : ''}. Run npm install, then rerun npm run dev.`);
  }

  log('Node dependencies detected.');
}

function ensureNodeVersion() {
  const majorVersion = Number(process.versions.node.split('.')[0]);
  if (majorVersion < 20) {
    throw new Error(`Node.js 20 or newer is required. Detected ${process.version}. Install a supported Node.js version, then rerun npm run dev.`);
  }

  log(`Node.js ${process.version} detected.`);
}

function ensureEnvironment() {
  if (!existsSync(envPath)) {
    if (!existsSync(envExamplePath)) {
      throw new Error('Neither .env nor .env.example exists. Restore .env.example and rerun npm run dev.');
    }

    copyFileSync(envExamplePath, envPath);
    log('Created .env from .env.example using local development defaults.');
  }

  localEnvironment = { ...parseEnvironment(readFileSync(envPath, 'utf8')), ...process.env };
  const requiredKeys = ['DATABASE_URL', 'NEXT_PUBLIC_API_URL', 'AUTH_SECRET'];
  const missingKeys = requiredKeys.filter((key) => !localEnvironment[key]);
  if (missingKeys.length > 0) {
    throw new Error(`.env is missing: ${missingKeys.join(', ')}. Copy .env.example to .env and configure the missing values.`);
  }

  childEnvironment = { ...localEnvironment };
}

function readEnvironmentValue(key, fallback) {
  return localEnvironment[key] || fallback;
}

function parseUrl(value, key) {
  try {
    return new URL(value);
  } catch {
    throw new Error(`${key} is invalid. Use a full URL such as http://localhost:4000/api.`);
  }
}

function parsePort(value, key, fallback) {
  const port = Number(value || fallback);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${key} must be a TCP port between 1 and 65535.`);
  }

  return port;
}

function getRuntimeConfig() {
  const frontendUrl = parseUrl(readEnvironmentValue('FRONTEND_URL', 'http://localhost:3000'), 'FRONTEND_URL');
  const backendUrl = parseUrl(readEnvironmentValue('NEXT_PUBLIC_API_URL', 'http://localhost:4000/api'), 'NEXT_PUBLIC_API_URL');
  const apiPort = parsePort(readEnvironmentValue('API_PORT', backendUrl.port), 'API_PORT', 4000);
  const webPort = parsePort(readEnvironmentValue('WEB_PORT', frontendUrl.port), 'WEB_PORT', 3000);

  if (apiPort === webPort) {
    throw new Error(`API_PORT and WEB_PORT are both set to ${apiPort}. Configure different ports in .env.`);
  }

  childEnvironment.PORT = String(webPort);
  return {
    frontendUrl: frontendUrl.toString().replace(/\/$/, ''),
    backendUrl: backendUrl.toString().replace(/\/$/, ''),
    apiPort,
    webPort,
  };
}

function parseDatabaseUrl() {
  const raw = localEnvironment.DATABASE_URL;
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('DATABASE_URL is invalid. Use postgresql://user:password@localhost:5432/commit?schema=public.');
  }

  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error('DATABASE_URL must use the PostgreSQL format postgresql://user:password@host:5432/database.');
  }

  const database = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const port = parsePort(url.port, 'DATABASE_URL port', 5432);
  if (!host || !database || !url.username) {
    throw new Error('DATABASE_URL must include a host, database name and username. Example: postgresql://postgres:postgres@localhost:5432/commit.');
  }

  return { raw, url, host, port, database, user: decodeURIComponent(url.username) };
}

function isLocalHost(host) {
  return ['localhost', '127.0.0.1', '::1'].includes(host.toLowerCase());
}

function isSinglePortReachable(host, port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    let settled = false;
    const finish = (reachable) => {
      if (settled) {
        return;
      }

      settled = true;
      socket.destroy();
      resolve(reachable);
    };

    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
    socket.setTimeout(1500, () => finish(false));
  });
}

async function isPortReachable(host, port) {
  const hosts = host.toLowerCase() === 'localhost' ? ['127.0.0.1', '::1'] : [host];
  for (const candidate of hosts) {
    if (await isSinglePortReachable(candidate, port)) {
      return true;
    }
  }

  return false;
}

function getPostgresServices() {
  if (process.platform !== 'win32') {
    return [];
  }

  const result = spawnSync('sc.exe', ['query', 'type=', 'service', 'state=', 'all'], {
    encoding: 'utf8',
    windowsHide: true,
  });
  if (result.error || result.status !== 0) {
    return [];
  }

  return result.stdout
    .split(/(?=SERVICE_NAME:)/i)
    .map((block) => {
      const name = block.match(/SERVICE_NAME:\s*(\S+)/i)?.[1];
      const stateCode = Number(block.match(/STATE\s*:\s*(\d+)/i)?.[1]);
      return name ? { name, running: stateCode === 4 } : null;
    })
    .filter((service) => service && /^(postgresql|pgsql)/i.test(service.name));
}

function tryStartPostgresService() {
  const services = getPostgresServices();
  const stopped = services.filter((service) => !service.running);
  for (const service of stopped) {
    log(`PostgreSQL service ${service.name} is stopped; attempting to start it.`);
    const result = spawnSync('sc.exe', ['start', service.name], { stdio: 'ignore', windowsHide: true });
    if (!result.error && result.status === 0) {
      return { attempted: true, serviceName: service.name };
    }
  }

  return { attempted: false, serviceName: stopped[0]?.name };
}

async function ensurePostgresServer(config) {
  if (await isPortReachable(config.host, config.port)) {
    log(`PostgreSQL server detected at ${config.host}:${config.port}.`);
    return;
  }

  if (!isLocalHost(config.host)) {
    throw new Error(`PostgreSQL was not reachable at ${config.host}:${config.port}. Check the configured server and network connection, then run npm run dev again.`);
  }

  const serviceStart = tryStartPostgresService();
  if (serviceStart.attempted) {
    log('Waiting for the PostgreSQL Windows service to accept connections...');
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline) {
      if (await isPortReachable(config.host, config.port)) {
        log(`PostgreSQL server detected at ${config.host}:${config.port}.`);
        return;
      }
      await delay(1_000);
    }
  }

  if (serviceStart.serviceName) {
    throw new Error(`PostgreSQL is installed but its Windows service is not running. Start PostgreSQL from Windows Services or run: net start ${serviceStart.serviceName}. Then run npm run dev again.`);
  }

  const installationHelp = process.platform === 'win32'
    ? 'Install PostgreSQL for Windows and ensure its service is running'
    : 'Install PostgreSQL locally and ensure its service is running';
  throw new Error(`PostgreSQL was not detected at ${config.host}:${config.port}. ${installationHelp}, configure DATABASE_URL in .env, then run npm run dev.`);
}

function databaseClient(config, database = config.database) {
  const url = new URL(config.raw);
  url.pathname = `/${encodeURIComponent(database)}`;
  return new Client({ connectionString: url.toString(), connectionTimeoutMillis: 5_000 });
}

async function canConnectToDatabase(config) {
  const client = databaseClient(config);
  try {
    await client.connect();
    await client.query('SELECT 1');
    return { connected: true };
  } catch (error) {
    return { connected: false, error };
  } finally {
    await client.end().catch(() => undefined);
  }
}

function isMissingDatabase(error) {
  return error?.code === '3D000' || /database .* does not exist/i.test(error?.message || '');
}

function quoteIdentifier(value) {
  return `"${value.replace(/"/g, '""')}"`;
}

function databaseCreationInstruction(config) {
  return `Create it with PostgreSQL (for example, from SQL Shell/psql): CREATE DATABASE ${quoteIdentifier(config.database)}; Then run npm run dev again.`;
}

async function createDatabaseIfPermitted(config) {
  if (!isLocalHost(config.host)) {
    throw new Error(`Database "${config.database}" does not exist on ${config.host}. Commit will not create databases on a non-local server. ${databaseCreationInstruction(config)}`);
  }

  const adminClient = databaseClient(config, 'postgres');
  try {
    await adminClient.connect();
    const existing = await adminClient.query('SELECT 1 FROM pg_database WHERE datname = $1', [config.database]);
    if (existing.rowCount === 0) {
      await adminClient.query(`CREATE DATABASE ${quoteIdentifier(config.database)}`);
      log(`Created local PostgreSQL database "${config.database}".`);
    }
  } catch (error) {
    if (error?.code === '42P04') {
      return;
    }

    throw new Error(`PostgreSQL is reachable, but Commit could not create database "${config.database}" with the configured credentials. ${databaseCreationInstruction(config)}`);
  } finally {
    await adminClient.end().catch(() => undefined);
  }
}

async function ensureDatabase(config) {
  let result = await canConnectToDatabase(config);
  if (result.connected) {
    log(`Database "${config.database}" is ready.`);
    return;
  }

  if (!isMissingDatabase(result.error)) {
    throw new Error(`PostgreSQL is reachable, but DATABASE_URL could not connect to database "${config.database}". Check the username, password, host, port and database name in .env.`);
  }

  log(`Database "${config.database}" does not exist; attempting safe local creation.`);
  await createDatabaseIfPermitted(config);
  result = await canConnectToDatabase(config);
  if (!result.connected) {
    throw new Error(`The PostgreSQL server is available, but database "${config.database}" could not be opened. ${databaseCreationInstruction(config)}`);
  }

  log(`Database "${config.database}" is ready.`);
}

function isPortInUse(port) {
  return isPortReachable('127.0.0.1', port);
}

async function ensureDevelopmentPorts(runtime) {
  const ports = [
    { name: 'backend', port: runtime.apiPort },
    { name: 'frontend', port: runtime.webPort },
  ];
  const occupied = (await Promise.all(ports.map(async (entry) => ({ ...entry, occupied: await isPortInUse(entry.port) })))).filter((entry) => entry.occupied);
  if (occupied.length > 0) {
    const entry = occupied[0];
    throw new Error(`Commit could not start because port ${entry.port} is already in use by the ${entry.name}. Stop the process using that port or configure another development port in .env.`);
  }
}

function terminateProcessTree(child) {
  if (!child.pid) {
    return;
  }

  if (process.platform === 'win32') {
    spawnSync('taskkill.exe', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore', windowsHide: true });
  } else {
    child.kill('SIGINT');
  }
}

async function waitForServices(child, runtime) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Backend/frontend services exited before both servers started (code ${child.exitCode}).`);
    }

    const [backendReady, frontendReady] = await Promise.all([isPortInUse(runtime.apiPort), isPortInUse(runtime.webPort)]);
    if (backendReady && frontendReady) {
      return;
    }

    await delay(500);
  }

  throw new Error(`Backend/frontend services did not start within 60 seconds on ports ${runtime.apiPort} and ${runtime.webPort}.`);
}

async function startServices(runtime) {
  log('Starting backend and frontend.');
  const services = spawn(npmCommand, ['run', 'dev:services'], {
    cwd: root,
    stdio: 'inherit',
    windowsHide: false,
    env: childEnvironment,
  });

  let interrupted = false;
  const stopServices = () => {
    interrupted = true;
    terminateProcessTree(services);
  };
  process.once('SIGINT', stopServices);
  process.once('SIGTERM', stopServices);

  try {
    await waitForServices(services, runtime);
    console.log('\n========================================');
    console.log('       COMMIT LOCAL DEVELOPMENT');
    console.log('========================================');
    console.log(`Frontend: ${runtime.frontendUrl}/login`);
    console.log(`Backend:  ${runtime.backendUrl}`);
    console.log('Demo:     admin@commit.local / Admin123!');
    console.log('Press Ctrl+C to stop.');
    console.log('========================================\n');
  } catch (error) {
    if (!interrupted) {
      terminateProcessTree(services);
    }
    throw error;
  }

  await new Promise((resolve, reject) => {
    services.once('error', reject);
    services.once('close', (code, signal) => {
      process.removeListener('SIGINT', stopServices);
      process.removeListener('SIGTERM', stopServices);
      if (code === 0 || interrupted || signal === 'SIGINT' || signal === 'SIGTERM') {
        resolve();
        return;
      }

      reject(new Error(`Backend/frontend services exited with ${signal ? `signal ${signal}` : `code ${code}`}.`));
    });
  });
}

async function main() {
  ensureNodeVersion();
  ensureDependencies();
  ensureEnvironment();
  const runtime = getRuntimeConfig();
  const database = parseDatabaseUrl();
  await ensureDevelopmentPorts(runtime);
  await ensurePostgresServer(database);
  await ensureDatabase(database);
  await runChecked(npmCommand, ['run', 'db:migrate'], 'Applying database migrations');
  await runChecked(npmCommand, ['run', 'db:seed'], 'Checking demo seed data');
  await startServices(runtime);
}

main().catch((error) => {
  fail(error.message);
});
