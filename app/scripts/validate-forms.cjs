const fs = require('node:fs');
const path = require('node:path');
const Ajv = require('ajv');

function validateForm(schema, ui) {
  // ODE supplies custom keywords/formats; this checks structure, not collected data.
  const ajv = new Ajv({ allErrors: true, strict: false, validateFormats: false });
  ajv.compile(schema);
  if (schema.type !== 'object' || !schema.properties) {
    throw new Error('Schema root must be an object with properties');
  }
  function checkRequired(node) {
    if (!node || typeof node !== 'object') return;
    for (const key of node.required || []) {
      if (!Object.hasOwn(node.properties || {}, key)) {
        throw new Error(`Required field ${key} is not declared in properties`);
      }
    }
    for (const child of Object.values(node.properties || {})) checkRequired(child);
    if (node.items) checkRequired(node.items);
    for (const keyword of ['allOf', 'anyOf', 'oneOf', '$defs', 'definitions']) {
      for (const child of Object.values(node[keyword] || {})) checkRequired(child);
    }
  }
  checkRequired(schema);
  let controls = 0;
  function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'Control') {
      controls++;
      const scope = node.scope;
      const target = typeof scope === 'string' && scope.startsWith('#/')
        ? scope.slice(2).split('/').reduce((value, key) => {
            key = key.replace(/~1/g, '/').replace(/~0/g, '~');
            return value && Object.hasOwn(value, key) ? value[key] : undefined;
          }, schema)
        : undefined;
      if (target === undefined) throw new Error(`Invalid Control scope: ${scope}`);
    }
    for (const child of Object.values(node)) walk(child);
  }
  walk(ui);
  if (controls > 6) throw new Error(`Maximum 6 Controls per form; found ${controls}`);
}

function validateForms(directory = path.resolve(__dirname, '../../forms')) {
  if (!fs.existsSync(directory)) throw new Error(`Forms directory not found: ${directory}`);
  const forms = fs.readdirSync(directory, { withFileTypes: true }).filter((entry) => entry.isDirectory());
  if (!forms.length) throw new Error('No forms found');
  for (const { name } of forms) {
    try {
      const read = (file) => JSON.parse(fs.readFileSync(path.join(directory, name, file), 'utf8'));
      validateForm(read('schema.json'), read('ui.json'));
    } catch (error) {
      throw new Error(`${name}: ${error.message}`);
    }
  }
  console.log(`Validated ${forms.length} forms (maximum 6 Controls each).`);
}

module.exports = { validateForm, validateForms };
if (require.main === module) {
  try {
    validateForms();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
