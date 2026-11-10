import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const directory = dirname(fileURLToPath(import.meta.url));
const sourceArgument = process.argv.find((arg) => arg.startsWith('--source='))?.slice(9);
const sourcePath = resolve(sourceArgument
  ?? resolve(directory, '../../finn-backend/contracts/public-api/openapi.json'));
const check = process.argv.includes('--check');
let source;
try { source = await readFile(sourcePath); }
catch (error) {
  if (error.code !== 'ENOENT' || sourceArgument) throw error;
  // Standalone frontend checkouts consume the reviewed immutable contract copy.
  source = await readFile(resolve(directory, 'canonical.openapi.json'));
}
const document = JSON.parse(source.toString('utf8'));
if (!document.openapi?.startsWith('3.1.') || !document.info?.version) {
  throw new Error('Expected a versioned OpenAPI 3.1 document.');
}
const schemas = document.components?.schemas;
if (!schemas || Object.keys(schemas).length === 0) throw new Error('No canonical schemas found.');
const names = Object.keys(schemas).sort();
const supported = new Set([
  '$ref', '$schema', '$id', 'title', 'description', 'type', 'properties', 'required',
  'additionalProperties', 'items', 'enum', 'const', 'oneOf', 'anyOf', 'allOf',
  'minItems', 'maxItems', 'uniqueItems', 'minimum', 'maximum', 'exclusiveMinimum',
  'exclusiveMaximum', 'minLength', 'maxLength', 'pattern', 'format',
  'examples', 'example', 'default', 'deprecated', 'readOnly', 'writeOnly', 'discriminator',
]);
const formats = new Set(['date', 'date-time', 'uuid', 'uri', 'uri-reference']);
function inspect(schema) {
  if (typeof schema === 'boolean') return;
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) throw new Error('Invalid schema.');
  for (const key of Object.keys(schema)) {
    if (!supported.has(key) && !key.startsWith('x-')) throw new Error(`Unsupported schema keyword: ${key}`);
  }
  if (schema.format && !formats.has(schema.format)) throw new Error(`Unsupported format: ${schema.format}`);
  if (schema.$ref) {
    const name = schema.$ref.replace('#/components/schemas/', '');
    if (schema.$ref !== `#/components/schemas/${name}` || !Object.hasOwn(schemas, name)) {
      throw new Error(`Unsupported or unresolved schema reference: ${schema.$ref}`);
    }
  }
  for (const child of Object.values(schema.properties ?? {})) inspect(child);
  if (schema.items !== undefined) inspect(schema.items);
  if (typeof schema.additionalProperties === 'object') inspect(schema.additionalProperties);
  for (const key of ['oneOf', 'anyOf', 'allOf']) for (const child of schema[key] ?? []) inspect(child);
}
function typeOf(schema) {
  if (schema === true) return 'unknown';
  if (schema === false) return 'never';
  const components = [];
  if (schema.$ref) components.push(schema.$ref.slice('#/components/schemas/'.length));
  if (Object.hasOwn(schema, 'const')) components.push(JSON.stringify(schema.const));
  if (schema.enum) components.push(schema.enum.map((value) => JSON.stringify(value)).join(' | ') || 'never');
  for (const key of ['oneOf', 'anyOf', 'allOf']) {
    if (schema[key]) components.push(schema[key].map((child) => `(${typeOf(child)})`).join(key === 'allOf' ? ' & ' : ' | '));
  }
  const types = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : [];
  const primitive = (type) => {
    if (type === 'null') return 'null';
    if (type === 'integer' || type === 'number') return 'number';
    if (type === 'string' || type === 'boolean') return type;
    if (type === 'array') return `Array<${typeOf(schema.items ?? true)}>`;
    if (type === 'object') {
      const properties = Object.entries(schema.properties ?? {}).map(([key, value]) =>
        `  ${JSON.stringify(key)}${schema.required?.includes(key) ? '' : '?'}: ${typeOf(value)};`);
      const object = `{\n${properties.join('\n')}\n}`;
      if (schema.additionalProperties === false) return object;
      if (typeof schema.additionalProperties === 'object' && properties.length) {
        throw new Error('Typed additional properties with named fields need an explicit generator update.');
      }
      return schema.additionalProperties && typeof schema.additionalProperties === 'object'
        ? `Record<string, ${typeOf(schema.additionalProperties)}>`
        : `${object} & Record<string, unknown>`;
    }
    throw new Error(`Unsupported schema type: ${type}`);
  };
  if (types.length) components.push(types.map(primitive).join(' | '));
  else if (schema.properties) components.push(primitive('object'));
  return components.length ? components.map((part) => `(${part})`).join(' & ') : 'unknown';
}
for (const name of names) {
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)) throw new Error(`Invalid TypeScript schema name: ${name}`);
  inspect(schemas[name]);
}
const metadata = {
  contractVersion: document.info.version,
  openapiVersion: document.openapi,
  source: 'finn-backend/contracts/public-api/openapi.json',
  sourceSha256: createHash('sha256').update(source).digest('hex'),
  schemaNames: names,
};
const warning = '// Generated from the backend OpenAPI authority. Run contracts/generate.mjs; do not edit.\n';
const models = warning + names.map((name) => `export type ${name} = ${typeOf(schemas[name])};`).join('\n\n')
  + '\n\nexport interface ContractTypes {\n' + names.map((name) => `  ${name}: ${name};`).join('\n') + '\n}\n';
const registry = warning + `export const contractMetadata = ${JSON.stringify(metadata, null, 2)} as const;\n\n`
  + `export const contractSchemas = ${JSON.stringify(Object.fromEntries(names.map((name) => [name, schemas[name]])), null, 2)} as const;\n`;
const outputs = {
  'canonical.openapi.json': source.toString('utf8'),
  'generated/models.ts': models,
  'generated/schema.ts': registry,
  'generated/manifest.json': JSON.stringify(metadata, null, 2) + '\n',
};
await mkdir(resolve(directory, 'generated'), { recursive: true });
for (const [name, content] of Object.entries(outputs)) {
  const target = resolve(directory, name);
  if (check) {
    if (await readFile(target, 'utf8') !== content) throw new Error(`Contract snapshot drift: ${name}. Regenerate and review.`);
  } else {
    await writeFile(target, content, 'utf8');
  }
}
process.stdout.write(`${check ? 'Verified' : 'Generated'} ${names.length} schemas for contract ${metadata.contractVersion}.\n`);
