import { PolicyCompiler } from '../lib/policy-compiler';
import { Policy } from '../lib/types';

describe('JSON-Logic to Rego Conversion', () => {
  let compiler: PolicyCompiler;

  beforeEach(() => {
    compiler = new PolicyCompiler();
  });

  test('should compile simple comparison rule', async () => {
    const policy: Policy = {
      id: 'test-policy',
      name: 'Test Policy',
      description: 'A test policy with a simple comparison',
      version: '1.0.0',
      rules: [{ '>': [{ var: 'value' }, 0] }],
    };

    const result = await compiler.compile(policy);

    expect(result.rego).toBeDefined();
    expect(result.errors).toBeUndefined();
    expect(result.rego).toContain('input.value > 0');
  });

  test('should compile logical AND rule', async () => {
    const policy: Policy = {
      id: 'test-policy',
      name: 'Test Policy',
      description: 'A test policy with logical AND',
      version: '1.0.0',
      rules: [
        {
          and: [
            { '>': [{ var: 'value' }, 0] },
            { '<': [{ var: 'value' }, 100] },
          ],
        },
      ],
    };

    const result = await compiler.compile(policy);

    expect(result.rego).toBeDefined();
    expect(result.errors).toBeUndefined();
    expect(result.rego).toContain('input.value > 0');
    expect(result.rego).toContain('input.value < 100');
  });

  test('should compile logical OR rule', async () => {
    const policy: Policy = {
      id: 'test-policy',
      name: 'Test Policy',
      description: 'A test policy with logical OR',
      version: '1.0.0',
      rules: [
        {
          or: [
            { '==': [{ var: 'status' }, 'active'] },
            { '==': [{ var: 'status' }, 'pending'] },
          ],
        },
      ],
    };

    const result = await compiler.compile(policy);

    expect(result.rego).toBeDefined();
    expect(result.errors).toBeUndefined();
    expect(result.rego).toContain('input.status == "active"');
    expect(result.rego).toContain('input.status == "pending"');
  });

  test('should compile nested path access', async () => {
    const policy: Policy = {
      id: 'test-policy',
      name: 'Test Policy',
      description: 'A test policy with nested path access',
      version: '1.0.0',
      rules: [{ '==': [{ var: 'user.role' }, 'admin'] }],
    };

    const result = await compiler.compile(policy);

    expect(result.rego).toBeDefined();
    expect(result.errors).toBeUndefined();
    expect(result.rego).toContain('input.user.role == "admin"');
  });

  test('should compile array operations', async () => {
    const policy: Policy = {
      id: 'test-policy',
      name: 'Test Policy',
      description: 'A test policy with array operations',
      version: '1.0.0',
      rules: [
        {
          in: [{ var: 'user.role' }, ['admin', 'manager', 'supervisor']],
        },
      ],
    };

    const result = await compiler.compile(policy);

    expect(result.rego).toBeDefined();
    expect(result.errors).toBeUndefined();
    expect(result.rego).toContain('input.user.role');
    expect(result.rego).toContain('["admin", "manager", "supervisor"]');
  });

  test('should handle errors in rules', async () => {
    const policy: Policy = {
      id: 'test-policy',
      name: 'Test Policy',
      description: 'A test policy with invalid rules',
      version: '1.0.0',
      rules: [
        null as any, // Invalid rule
      ],
    };

    const result = await compiler.compile(policy);

    expect(result.rego).toBeUndefined();
    expect(result.errors).toBeDefined();
    expect(result.errors?.length).toBeGreaterThan(0);
  });
});
