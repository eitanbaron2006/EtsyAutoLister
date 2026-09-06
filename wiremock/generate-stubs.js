const fs = require('fs');
const path = require('path');

const specPath = path.resolve(__dirname, '../etsy-spec.json');
const mappingsDir = path.resolve(__dirname, 'mappings');

if (!fs.existsSync(mappingsDir)) {
  fs.mkdirSync(mappingsDir, { recursive: true });
}

const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));

function resolveSchema(schema, components) {
  if (!schema) return {};
  if (schema.$ref) {
    const refKey = schema.$ref.replace('#/components/schemas/', '');
    return components.schemas?.[refKey] || {};
  }
  return schema;
}

function generateMockValue(schema, components, depth = 0) {
  if (depth > 3) return {};
  if (!schema) return {};
  if (schema.$ref) {
    schema = resolveSchema(schema, components);
  }
  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;

  const type = schema.type;
  if (type === 'string') {
    if (schema.enum && schema.enum.length > 0) return schema.enum[0];
    if (schema.format === 'uri' || schema.format === 'url') return 'https://example.com/etsy-asset.jpg';
    if (schema.format === 'date-time') return new Date().toISOString();
    return schema.description?.slice(0, 30) || 'sample_string';
  }
  if (type === 'integer' || type === 'number') {
    return schema.minimum !== undefined ? schema.minimum : 123456789;
  }
  if (type === 'boolean') {
    return true;
  }
  if (type === 'array') {
    const itemSchema = schema.items || {};
    return [generateMockValue(itemSchema, components, depth + 1)];
  }
  if (type === 'object' || schema.properties) {
    const obj = {};
    const props = schema.properties || {};
    for (const [key, propSchema] of Object.entries(props)) {
      obj[key] = generateMockValue(propSchema, components, depth + 1);
    }
    return obj;
  }
  return {};
}

let count = 0;

for (const [routePath, methods] of Object.entries(spec.paths)) {
  for (const [httpMethod, operation] of Object.entries(methods)) {
    if (['get', 'post', 'put', 'delete', 'patch'].indexOf(httpMethod.toLowerCase()) === -1) continue;

    const opMethod = httpMethod.toUpperCase();
    const opId = operation.operationId || `${httpMethod}_${routePath.replace(/[^a-zA-Z0-9]/g, '_')}`;

    // Convert OpenAPI path params {param} to WireMock regex
    const hasParams = routePath.includes('{');
    const requestConfig = {
      method: opMethod,
    };

    if (hasParams) {
      const regexPath = routePath.replace(/\{[^}]+\}/g, '[^/]+');
      requestConfig.urlPathPattern = `^${regexPath}$`;
    } else {
      requestConfig.urlPath = routePath;
    }

    // Determine 200 / 2xx response
    const responses = operation.responses || {};
    const successCode = Object.keys(responses).find(code => code.startsWith('2')) || '200';
    const respObj = responses[successCode] || {};
    const content = respObj.content || {};
    const jsonContent = content['application/json'] || {};
    const schema = jsonContent.schema || null;

    let mockBody = {};
    if (schema) {
      mockBody = generateMockValue(schema, spec.components || {});
    }

    const mapping = {
      id: require('crypto').randomUUID(),
      name: opId,
      request: requestConfig,
      response: {
        status: parseInt(successCode, 10) || 200,
        headers: {
          'Content-Type': 'application/json'
        },
        jsonBody: mockBody
      }
    };

    const fileName = `${String(count).padStart(3, '0')}_${opMethod}_${opId.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
    fs.writeFileSync(path.join(mappingsDir, fileName), JSON.stringify(mapping, null, 2), 'utf8');
    count++;
  }
}

console.log(`Generated ${count} WireMock stub mappings in wiremock/mappings/`);
