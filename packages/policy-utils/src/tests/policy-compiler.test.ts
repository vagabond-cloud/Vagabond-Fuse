import { PolicyCompiler } from '../lib/policy-compiler';
import { Policy } from '../lib/types';

describe('PolicyCompiler', () => {
  let compiler: PolicyCompiler;
  let samplePolicy: Policy;

  beforeEach(() => {
    compiler = new PolicyCompiler();
    samplePolicy = {
      id: 'test-policy',
      name: 'Test Policy',
      description: 'A test policy',
      version: '1.0.0',
      rules: [{ '>': [{ var: 'value' }, 0] }, { '<': [{ var: 'value' }, 100] }],
    };
  });

  test('should compile policy to Rego', async () => {
    const result = await compiler.compile(samplePolicy);
    expect(result.rego).toBeDefined();
    expect(result.errors).toBeUndefined();
    expect(result.rego).toContain('package policy.test_policy');
    expect(result.rego).toContain('import future.keywords');
    expect(result.rego).toContain('rule_0 = true { input.value > 0 }');
  });

  test('should compile policy to WASM', async () => {
    const result = await compiler.compile(samplePolicy, {
      outputFormat: 'wasm',
    });
    expect(result.rego).toBeDefined();
    expect(result.wasm).toBeDefined();
    expect(result.errors).toBeUndefined();
  });

  test('should evaluate policy against valid data', async () => {
    const data = { value: 50 };
    const result = await compiler.evaluate(samplePolicy, data);
    expect(result.allowed).toBe(true);
    expect(result.reasons).toContain('All rules passed');
    expect(result.errors).toBeUndefined();
  });

  test('should evaluate policy against invalid data', async () => {
    const data = { value: -10 };
    const result = await compiler.evaluate(samplePolicy, data);
    expect(result.allowed).toBe(false);
    expect(result.reasons).toContain('Some rules failed');
    expect(result.errors).toBeUndefined();
  });

  test('should handle errors during compilation', async () => {
    const invalidPolicy = {
      ...samplePolicy,
      rules: [null as any], // Invalid rule
    };

    const result = await compiler.compile(invalidPolicy);
    expect(result.rego).toBeUndefined();
    expect(result.errors).toBeDefined();
  });

  test('should handle errors during evaluation', async () => {
    const invalidPolicy = {
      ...samplePolicy,
      rules: [null as any], // Invalid rule
    };

    const result = await compiler.evaluate(invalidPolicy, {});
    expect(result.allowed).toBe(false);
    expect(result.errors).toBeDefined();
  });
});
