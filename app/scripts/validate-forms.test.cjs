const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateForm } = require('./validate-forms.cjs');

const schema = { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] };
const control = { type: 'Control', scope: '#/properties/name' };

test('accepts six Controls and declared required fields', () => {
  assert.doesNotThrow(() => validateForm(schema, { elements: Array(6).fill(control) }));
});
test('rejects more than six Controls', () => {
  assert.throws(() => validateForm(schema, { elements: Array(7).fill(control) }), /Maximum 6/);
});
test('rejects unresolved scopes', () => {
  assert.throws(() => validateForm(schema, { ...control, scope: '#/properties/missing' }), /Invalid Control scope/);
});
test('rejects undeclared required fields', () => {
  assert.throws(() => validateForm({ ...schema, required: ['missing'] }, control), /not declared/);
});
test('AJV rejects invalid schemas', () => {
  assert.throws(() => validateForm({ ...schema, properties: { name: { type: 'invalid' } } }, control));
});
test('resolves escaped JSON pointer keys', () => {
  assert.doesNotThrow(() => validateForm(
    { type: 'object', properties: { 'a/b': { type: 'string' } } },
    { type: 'Control', scope: '#/properties/a~1b' },
  ));
});
