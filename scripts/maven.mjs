import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { externalWorkspace } from './workspace.mjs';

const actions = { verify: ['verify'], release: ['clean', 'verify'], test: ['test'], package: ['package'], run: ['spring-boot:run'] };
const action = process.argv[2] ?? 'verify';
if (!Object.hasOwn(actions, action)) throw new Error('Choose verify, release, test, package or run.');
const root = await externalWorkspace();
await mkdir(join(root, 'cache/maven-wrapper'), { recursive: true });
const env = { ...process.env, MAVEN_USER_HOME: join(root, 'cache/maven-wrapper'),
  JAVA_TOOL_OPTIONS: `${process.env.JAVA_TOOL_OPTIONS ?? ''} -Djava.io.tmpdir="${join(root, 'tmp/backend')}" -Duser.home="${join(root, 'cache/java-home')}"`.trim() };
if (action === 'run' && !env.SPRING_PROFILES_ACTIVE) env.SPRING_PROFILES_ACTIVE = 'local';
const windows = process.platform === 'win32';
const args = ['-B', '-ntp', ...actions[action]];
// Windows invokes only a fixed, reviewed action; no caller text is passed into the shell.
const child = spawn(windows ? 'cmd.exe' : './mvnw', windows ? ['/d', '/s', '/c', `mvnw.cmd ${args.join(' ')}`] : args,
  { cwd: dirname(dirname(fileURLToPath(import.meta.url))), env, stdio: 'inherit', windowsHide: true });
child.on('error', () => { console.error('Maven could not start. Check JAVA_HOME and the documented tool prerequisites.'); process.exitCode = 1; });
child.on('exit', (code) => { process.exitCode = code ?? 1; });
