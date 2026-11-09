import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

const JSON_MEDIA_TYPE = 'application/json';

const contract: unknown = parse(
    readFileSync(join(__dirname, '..', '..', '..', 'contracts', 'openapi.yaml'), 'utf8'),
);

// Strict mode stays on so a misspelled keyword in the contract fails. `strictTypes` is off: it refuses `allOf` parts
// without a `type`, which the error responses use to narrow `DomainError`.
const ajv = new Ajv2020({ allErrors: true, strictTypes: false });
addFormats(ajv);
// Lets each schema carry the contract's components, so its `#/components/...` references resolve
ajv.addKeyword('components');

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function at(node: unknown, ...keys: string[]): unknown {
    return keys.reduce<unknown>(
        (current, key) => (isRecord(current) ? current[key] : undefined),
        node,
    );
}

/** Follows a `$ref` to another part of the contract; anything else is returned as it is. */
function resolve(node: unknown): unknown {
    const ref = at(node, '$ref');
    return typeof ref === 'string' ? at(contract, ...ref.split('/').slice(1)) : node;
}

function schemaErrors(mediaType: unknown, value: unknown): string[] {
    const schema = at(mediaType, 'schema');
    if (!isRecord(schema)) {
        return ['no schema in the contract'];
    }
    const validate = ajv.compile({ ...schema, components: at(contract, 'components') });
    validate(value);
    return (validate.errors ?? []).map(
        ({ instancePath, message, params }) =>
            `${instancePath || '/'} ${message ?? ''} ${JSON.stringify(params)}`,
    );
}

/**
 * Differences between a response and the contract, for `expect(...).toEqual([])`. A response the contract declares
 * without a body (204) only has its status checked.
 */
export function contractErrors(
    method: 'get' | 'post' | 'patch' | 'delete',
    path: string,
    response: { status: number; body: unknown },
): string[] {
    const declared = resolve(
        at(contract, 'paths', path, method, 'responses', `${response.status}`),
    );
    if (declared === undefined) {
        return [`${method.toUpperCase()} ${path} declares no ${response.status} response`];
    }
    const content = at(declared, 'content');
    return content === undefined ? [] : schemaErrors(at(content, JSON_MEDIA_TYPE), response.body);
}

/** Every example of the contract (requests and responses) with what it breaks in its own schema. */
export function contractExamples(): { name: string; errors: string[] }[] {
    const examples: { name: string; errors: string[] }[] = [];

    const collect = (name: string, mediaType: unknown): void => {
        const example = at(mediaType, 'example');
        if (example !== undefined) {
            examples.push({ name, errors: schemaErrors(mediaType, example) });
        }
        const named = at(mediaType, 'examples');
        for (const [key, value] of Object.entries(isRecord(named) ? named : {})) {
            const errors = schemaErrors(mediaType, at(resolve(value), 'value'));
            examples.push({ name: `${name} (${key})`, errors });
        }
    };

    const paths = at(contract, 'paths');
    for (const [path, item] of Object.entries(isRecord(paths) ? paths : {})) {
        for (const [method, operation] of Object.entries(isRecord(item) ? item : {})) {
            const name = `${method.toUpperCase()} ${path}`;
            collect(`${name} request`, at(operation, 'requestBody', 'content', JSON_MEDIA_TYPE));
            const responses = at(operation, 'responses');
            for (const [status, response] of Object.entries(isRecord(responses) ? responses : {})) {
                collect(`${name} ${status}`, at(resolve(response), 'content', JSON_MEDIA_TYPE));
            }
        }
    }
    return examples;
}
