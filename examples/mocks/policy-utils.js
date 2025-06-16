/**
 * Mock implementation of the policy-utils package for examples
 */

export interface Policy {
  id: string;
  name: string;
  description: string;
  version: string;
  rules: any[];
}

interface CompilationResult {
  rego?: string;
  errors?: string[];
}

interface EvaluationResult {
  allowed: boolean;
  reasons?: string[];
  errors?: string[];
}

export class PolicyCompiler {
  constructor() {
    console.log('[MOCK] Created Policy Compiler instance');
  }

  async compile(policy: Policy): Promise<CompilationResult> {
    console.log(`[MOCK] Compiling policy: ${policy.id}`);

    // Check if the policy has valid rules
    if (!policy.rules || policy.rules.length === 0) {
      return {
        errors: ['Policy must have at least one rule'],
      };
    }

    // Generate mock Rego code
    const regoCode = `
package ${policy.id.replace(/-/g, '_')}

default allow = false

# Policy: ${policy.name}
# Description: ${policy.description}
# Version: ${policy.version}

allow {
    # Rule evaluation logic
    count(satisfied_rules) == count(input.rules)
}

# Helper to count satisfied rules
satisfied_rules[rule.id] {
    rule := input.rules[_]
    evaluate_rule(rule)
}

# Rule evaluation function
evaluate_rule(rule) {
    # Mock rule evaluation logic
    true
}
`;

    return {
      rego: regoCode,
    };
  }

  async evaluate(policy: Policy, data: any): Promise<EvaluationResult> {
    console.log(`[MOCK] Evaluating policy: ${policy.id}`);

    // Simple mock evaluation logic
    let allowed = true;
    const reasons: string[] = [];

    // Process each rule
    for (let i = 0; i < policy.rules.length; i++) {
      const rule = policy.rules[i];
      const ruleResult = this.evaluateRule(rule, data);

      if (ruleResult.allowed) {
        reasons.push(`Rule ${i + 1} satisfied`);
      } else {
        allowed = false;
        reasons.push(`Rule ${i + 1} not satisfied: ${ruleResult.reason}`);
      }
    }

    return {
      allowed,
      reasons,
    };
  }

  private evaluateRule(
    rule: any,
    data: any
  ): { allowed: boolean; reason?: string } {
    // Mock rule evaluation based on common JSON Logic patterns
    try {
      // Handle AND operator
      if (rule.and) {
        for (const subRule of rule.and) {
          const result = this.evaluateRule(subRule, data);
          if (!result.allowed) {
            return result;
          }
        }
        return { allowed: true };
      }

      // Handle OR operator
      if (rule.or) {
        for (const subRule of rule.or) {
          const result = this.evaluateRule(subRule, data);
          if (result.allowed) {
            return result;
          }
        }
        return { allowed: false, reason: 'No OR conditions met' };
      }

      // Handle equality
      if (rule['==']) {
        const [left, right] = rule['=='];
        const leftValue = this.resolveValue(left, data);
        const rightValue = this.resolveValue(right, data);
        return {
          allowed: leftValue === rightValue,
          reason:
            leftValue !== rightValue
              ? `${leftValue} is not equal to ${rightValue}`
              : undefined,
        };
      }

      // Handle inequality
      if (rule['!=']) {
        const [left, right] = rule['!='];
        const leftValue = this.resolveValue(left, data);
        const rightValue = this.resolveValue(right, data);
        return {
          allowed: leftValue !== rightValue,
          reason:
            leftValue === rightValue
              ? `${leftValue} is equal to ${rightValue}`
              : undefined,
        };
      }

      // Handle greater than
      if (rule['>']) {
        const [left, right] = rule['>'];
        const leftValue = this.resolveValue(left, data);
        const rightValue = this.resolveValue(right, data);
        return {
          allowed: leftValue > rightValue,
          reason:
            leftValue <= rightValue
              ? `${leftValue} is not greater than ${rightValue}`
              : undefined,
        };
      }

      // Handle less than
      if (rule['<']) {
        const [left, right] = rule['<'];
        const leftValue = this.resolveValue(left, data);
        const rightValue = this.resolveValue(right, data);
        return {
          allowed: leftValue < rightValue,
          reason:
            leftValue >= rightValue
              ? `${leftValue} is not less than ${rightValue}`
              : undefined,
        };
      }

      // Handle in operator
      if (rule['in']) {
        const [item, list] = rule['in'];
        const itemValue = this.resolveValue(item, data);
        const listValue = this.resolveValue(list, data);

        if (Array.isArray(listValue)) {
          return {
            allowed: listValue.includes(itemValue),
            reason: !listValue.includes(itemValue)
              ? `${itemValue} is not in the list`
              : undefined,
          };
        }
        return {
          allowed: false,
          reason: 'Second argument to "in" is not an array',
        };
      }

      // Default case for unhandled operators
      return { allowed: true };
    } catch (error) {
      return { allowed: false, reason: `Error evaluating rule: ${error}` };
    }
  }

  private resolveValue(expr: any, data: any): any {
    // Handle variable references
    if (expr && typeof expr === 'object' && expr.var) {
      return this.getNestedValue(data, expr.var);
    }

    // Return literal values as is
    return expr;
  }

  private getNestedValue(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }
}
