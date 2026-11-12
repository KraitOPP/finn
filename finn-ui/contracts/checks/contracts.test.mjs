import assert from 'node:assert/strict';
import { readFile, access, mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { dirname, resolve, join, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { decodeContract, ContractError } from '../decode.ts';
import { quotePresentation, historicalReturnPresentation, problemPresentation, delayText } from '../presentation.ts';
import { contractMetadata, contractSchemas } from '../generated/schema.ts';

const directory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const quote = JSON.parse(await readFile(join(directory, 'fixtures/quote.synthetic.json'), 'utf8'));
const problem = JSON.parse(await readFile(join(directory, 'fixtures/problem.synthetic.json'), 'utf8'));
const changed = (mutate) => { const value = structuredClone(quote); mutate(value); return value; };

test('a saved monitoring thesis accepts blank optional text', () => {
  const thesis = {
    thesisId: 'c308d6ec-eafa-4faa-9a05-d7e82d51dfa5',
    companyId: '09d7a968-3445-4dd8-8ea6-ff3f2e48cbc9',
    revision: 1, title: 'Fictional company thesis', rationale: 'Review the next results.',
    risks: '', milestones: '', decision: 'MONITOR', decisionNote: '',
    review: null, anchorIds: [], reminderId: null, savedAt: '2025-07-22T10:00:00Z',
  };
  assert.deepEqual(decodeContract('InvestmentTheses', { items: [thesis] }).items, [thesis]);
  assert.throws(() => decodeContract('InvestmentThesis', { ...thesis, title: '' }), ContractError);
});

test('valid fictional quote preserves exact decimal text and nullable volume', () => {
  const decoded = decodeContract('QuoteResponse', quote);
  const display = quotePresentation(decoded);
  assert.equal(display.value, '123.450000000000000001');
  assert.equal(display.valueText, 'INR 123.450000000000000001');
  assert.equal(display.volumeText, 'Unavailable');
  assert.equal(display.sourceText, 'Synthetic demonstration');
});

test('receipt time never replaces unknown observation time or unknown delay', () => {
  const display = quotePresentation(decodeContract('QuoteResponse', quote));
  assert.equal(display.observedAt, null);
  assert.equal(display.receivedAt, '2026-11-06T12:00:00Z');
  assert.equal(display.delaySeconds, null);
  assert.equal(display.delayText, 'Source delay unknown');
  assert.equal(display.frequency, 'End of day');
  assert.doesNotMatch(display.freshnessText, /live|real.?time/i);
});

test('unknown, EOD and delayed are distinct and zero delay is not inferred', () => {
  assert.equal(delayText(decodeContract('Delay', { kind: 'EOD', seconds: null, basis: 'SOURCE_DECLARED' })), 'End-of-day data');
  assert.equal(delayText(decodeContract('Delay', { kind: 'DELAYED', seconds: 900, basis: 'SOURCE_DECLARED' })), 'Source-declared delay: 900 seconds');
  assert.throws(() => decodeContract('Delay', { kind: 'UNKNOWN', seconds: 0, basis: 'UNKNOWN' }), ContractError);
  assert.throws(() => decodeContract('Delay', { kind: 'DELAYED', seconds: 0, basis: 'SOURCE_DECLARED' }), ContractError);
});

test('stale and unknown freshness remain distinct from source delay', () => {
  for (const [state, label] of [['STALE', 'Stale data'], ['UNKNOWN', 'Freshness unknown']]) {
    const input = changed((value) => { value.freshness.state = state; });
    const display = quotePresentation(decodeContract('QuoteResponse', input));
    assert.equal(display.freshnessText, label);
    assert.equal(display.delaySeconds, null);
  }
});

test('unavailable quote does not synthesize a zero price or observation timestamp', () => {
  const input = changed((value) => {
    value.availability = 'NOT_COVERED';
    value.observation = null;
    value.freshness.state = 'NOT_APPLICABLE';
    value.freshness.latestSessionDate = null;
  });
  const display = quotePresentation(decodeContract('QuoteResponse', input), 'public-demo');
  assert.equal(display.state, 'unavailable');
  assert.equal(display.value, undefined);
  assert.equal(display.valueText, 'Unavailable');
  assert.equal(display.sessionDate, null);
  assert.equal(display.observedAt, null);
});

test('shape validation rejects missing required fields, unknown fields and availability contradictions', () => {
  for (const mutate of [
    (value) => { delete value.requestId; },
    (value) => { value.live = true; },
    (value) => { value.availability = 'AVAILABLE'; value.observation = null; },
    (value) => { value.availability = 'NOT_COVERED'; },
    (value) => { value.observation.provenance.delay.kind = 'REALTIME'; },
  ]) {
    assert.throws(() => decodeContract('QuoteResponse', changed(mutate)), ContractError);
  }
});

test('money and traded prices reject binary numbers, exponent text, separators and zero', () => {
  for (const close of [123.45, '1.2345e2', '1,234.50', '0', '-1.00', 'NaN']) {
    assert.throws(() => decodeContract('QuoteResponse', changed((value) => { value.observation.close = close; })), ContractError);
  }
  assert.equal(decodeContract('DecimalString', '-0.0050'), '-0.0050');
});

test('session dates are calendar dates and UTC instants require actual UTC timestamps', () => {
  assert.equal(decodeContract('SessionDate', '2024-02-29'), '2024-02-29');
  assert.equal(decodeContract('UtcInstant', '2026-11-06T12:00:00.123456Z'), '2026-11-06T12:00:00.123456Z');
  for (const date of ['2026-02-29', '2026-02-30', '2026-11-06T12:00:00Z']) {
    assert.throws(() => decodeContract('SessionDate', date), ContractError);
  }
  for (const instant of ['2026-11-06', '2026-11-06T17:30:00+05:30', '2026-11-06T25:00:00Z']) {
    assert.throws(() => decodeContract('UtcInstant', instant), ContractError);
  }
});

test('clock fields reject midnight rollover, invalid minutes/seconds and unsupported leap seconds', () => {
  assert.equal(decodeContract('UtcInstant', '2026-11-06T23:59:59.999999Z'), '2026-11-06T23:59:59.999999Z');
  for (const instant of [
    '2026-11-06T24:00:00Z',
    '2026-11-06T24:00:00.000000Z',
    '2026-11-06T12:60:00Z',
    '2026-11-06T12:00:60Z',
    '2016-12-31T23:59:60Z',
  ]) assert.throws(() => decodeContract('UtcInstant', instant), ContractError);
});

test('public demonstration mapping suppresses private provenance and values', () => {
  const input = changed((value) => {
    value.observation.provenance.provider = 'YAHOO_YFINANCE';
    value.observation.provenance.sourceName = 'Private test source';
    value.observation.provenance.rights.mode = 'PRIVATE_PERSONAL';
    value.observation.provenance.rights.publicDisplayAllowed = false;
  });
  const display = quotePresentation(decodeContract('QuoteResponse', input), 'public-demo');
  assert.equal(display.state, 'restricted');
  assert.equal(display.value, undefined);
  assert.equal(display.receivedAt, null);
  assert.doesNotMatch(JSON.stringify(display), /123\.45|Private test source/);
  assert.equal(quotePresentation(decodeContract('QuoteResponse', quote), 'public-demo').state, 'available');
});

test('omitted or unknown display modes cannot expose private observations', () => {
  const input = changed((value) => {
    value.observation.provenance.provider = 'YAHOO_YFINANCE';
    value.observation.provenance.sourceName = 'Private test source';
    value.observation.provenance.rights.mode = 'PRIVATE_PERSONAL';
    value.observation.provenance.rights.publicDisplayAllowed = false;
  });
  const decoded = decodeContract('QuoteResponse', input);
  for (const mode of [undefined, 'unexpected-mode', null, '']) {
    const display = quotePresentation(decoded, mode);
    assert.equal(display.state, 'restricted');
    assert.equal(display.value, undefined);
    assert.equal(display.receivedAt, null);
    assert.doesNotMatch(JSON.stringify(display), /123\.45|Private test source/);
  }
  assert.equal(quotePresentation(decoded, 'private').value, '123.450000000000000001');
  assert.equal(quotePresentation(decodeContract('QuoteResponse', quote), 'unexpected-mode').state, 'restricted');
});

test('holdings-only, partial and unknown histories cannot show historical returns', () => {
  for (const history of ['holdings-only', 'partial', 'unknown']) {
    assert.equal(historicalReturnPresentation('0.00', history).value, undefined);
    assert.equal(historicalReturnPresentation('25.00', history).value, undefined);
  }
  assert.equal(historicalReturnPresentation(null, 'verified-complete').value, undefined);
  assert.deepEqual(historicalReturnPresentation('0.00', 'verified-complete'), { value: '0.00', text: '0.00%' });
});

test('problem response validates code/status/trace shape and maps plain text fields', () => {
  const decoded = decodeContract('Problem', problem);
  assert.deepEqual(problemPresentation(decoded), {
    title: 'Data source unavailable',
    detail: 'The fictional test source is temporarily unavailable.',
    traceId: 'synthetic-trace-001',
  });
  assert.throws(() => decodeContract('Problem', { ...problem, status: 200 }), ContractError);
  assert.throws(() => decodeContract('Problem', { ...problem, stack: 'internal details' }), ContractError);
});

test('background job snapshots distinguish unfinished, failed and terminal outcomes', async () => {
  const jobs = JSON.parse(await readFile(join(directory, 'fixtures/jobs.synthetic.json'), 'utf8'));
  for (const job of jobs) assert.deepEqual(decodeContract('AsyncJobStatus', job), job);
  const queued = jobs.find((job) => job.state === 'QUEUED');
  const running = jobs.find((job) => job.state === 'RUNNING');
  const failed = jobs.find((job) => job.state === 'FAILED');
  assert.throws(() => decodeContract('AsyncJobStatus', { ...queued, startedAt: queued.updatedAt }), ContractError);
  assert.throws(() => decodeContract('AsyncJobStatus', { ...running, finishedAt: running.updatedAt }), ContractError);
  assert.throws(() => decodeContract('AsyncJobStatus', { ...failed, failureCode: null }), ContractError);
  assert.throws(() => decodeContract('AsyncJobStatus', { ...queued, revision: 0 }), ContractError);
  assert.throws(() => decodeContract('AsyncJobStatus', { ...failed, exception: 'fictional internal detail' }), ContractError);
});

test('generated registry and manifest identify the same schema snapshot', async () => {
  const manifest = JSON.parse(await readFile(join(directory, 'generated/manifest.json'), 'utf8'));
  assert.deepEqual(manifest, contractMetadata);
  assert.deepEqual(Object.keys(contractSchemas).sort(), manifest.schemaNames);
  assert.match(manifest.sourceSha256, /^[a-f0-9]{64}$/);
  assert.equal(quote.contractVersion, manifest.contractVersion);
});

test('canonical backend contract drift is detected when its checkout is available', async (context) => {
  const source = resolve(directory, '../../finn-backend/contracts/public-api/openapi.json');
  try { await access(source); } catch { context.skip('Separate backend checkout not supplied; run generate.mjs --check with --source in integration checks.'); return; }
  const bytes = await readFile(source);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), contractMetadata.sourceSha256);
  const result = spawnSync(process.execPath, [join(directory, 'generate.mjs'), '--check'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});

test('generator rejects unsupported validation constraints and changed contract snapshots', async (context) => {
  const workspace = process.env.FINN_WORKSPACE_ROOT;
  if (!workspace) { context.skip('FINN_WORKSPACE_ROOT is needed for external temporary test files.'); return; }
  if (!isAbsolute(workspace)) throw new Error('FINN_WORKSPACE_ROOT must be an absolute external path.');
  const repository = resolve(directory, '..');
  const withinRepository = relative(repository, resolve(workspace));
  if (!withinRepository.startsWith('..') && !isAbsolute(withinRepository)) {
    throw new Error('Temporary contract files must remain outside the frontend repository.');
  }
  const parent = resolve(workspace, 'tmp');
  await mkdir(parent, { recursive: true });
  const scratch = await mkdtemp(join(parent, 'frontend-contract-'));
  try {
    const invalid = join(scratch, 'unsupported.openapi.json');
    await writeFile(invalid, JSON.stringify({ openapi: '3.1.0', info: { version: '0.1.0' }, components: { schemas: { Example: { type: 'string', not: { const: 'invalid' } } } } }));
    const result = spawnSync(process.execPath, [join(directory, 'generate.mjs'), `--source=${invalid}`, '--check'], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Unsupported schema keyword: not/);
    const changedSource = join(scratch, 'changed.openapi.json');
    await writeFile(changedSource, JSON.stringify({ openapi: '3.1.0', info: { version: '9.0.0' }, components: { schemas: contractSchemas } }));
    const drift = spawnSync(process.execPath, [join(directory, 'generate.mjs'), `--source=${changedSource}`, '--check'], { encoding: 'utf8' });
    assert.notEqual(drift.status, 0);
    assert.match(drift.stderr, /Contract snapshot drift/);
  } finally {
    const target = resolve(scratch);
    const withinParent = relative(parent, target);
    if (!withinParent || withinParent.startsWith('..') || isAbsolute(withinParent)) {
      throw new Error('Refusing temporary cleanup outside the intended directory.');
    }
    await rm(target, { recursive: true, force: true });
  }
});
