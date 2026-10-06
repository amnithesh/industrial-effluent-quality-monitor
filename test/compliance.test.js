import { test, describe } from 'node:test';
import assert from 'node:assert';
import { evaluateCompliance, DEFAULT_SETTINGS } from '../src/utils/compliance.js';

describe('Effluent Compliance & Valve Interlock Logic', () => {
  test('Normal condition: pH = 7.21, Turbidity = 18.4 -> COMPLIANT, Valve OPEN', () => {
    const result = evaluateCompliance(7.21, 18.4, DEFAULT_SETTINGS);
    assert.strictEqual(result.compliance, 'COMPLIANT');
    assert.strictEqual(result.valve, 'OPEN');
    assert.strictEqual(result.isCompliant, true);
    assert.strictEqual(result.statusPh, 'NORMAL');
    assert.strictEqual(result.statusTurbidity, 'NORMAL');
    assert.strictEqual(result.reasons.length, 0);
  });

  test('pH Fault: pH = 4.80, Turbidity = 18.0 -> NON-COMPLIANT, Valve CLOSED', () => {
    const result = evaluateCompliance(4.80, 18.0, DEFAULT_SETTINGS);
    assert.strictEqual(result.compliance, 'NON-COMPLIANT');
    assert.strictEqual(result.valve, 'CLOSED');
    assert.strictEqual(result.isCompliant, false);
    assert.strictEqual(result.statusPh, 'OUT OF LIMIT');
    assert.strictEqual(result.statusTurbidity, 'NORMAL');
  });

  test('Turbidity Fault: pH = 7.20, Turbidity = 72.0 -> NON-COMPLIANT, Valve CLOSED', () => {
    const result = evaluateCompliance(7.20, 72.0, DEFAULT_SETTINGS);
    assert.strictEqual(result.compliance, 'NON-COMPLIANT');
    assert.strictEqual(result.valve, 'CLOSED');
    assert.strictEqual(result.isCompliant, false);
    assert.strictEqual(result.statusPh, 'NORMAL');
    assert.strictEqual(result.statusTurbidity, 'HIGH');
  });

  test('Both Faults: pH = 4.80, Turbidity = 72.0 -> NON-COMPLIANT, Valve CLOSED', () => {
    const result = evaluateCompliance(4.80, 72.0, DEFAULT_SETTINGS);
    assert.strictEqual(result.compliance, 'NON-COMPLIANT');
    assert.strictEqual(result.valve, 'CLOSED');
    assert.strictEqual(result.isCompliant, false);
    assert.strictEqual(result.statusPh, 'OUT OF LIMIT');
    assert.strictEqual(result.statusTurbidity, 'HIGH');
  });

  test('CRITICAL RULE: UI/Logic NEVER permits NON-COMPLIANT + VALVE OPEN', () => {
    // Testing multiple invalid states
    const testCases = [
      { ph: 5.9, turb: 20 },
      { ph: 9.1, turb: 10 },
      { ph: 2.0, turb: 100 },
      { ph: 7.0, turb: 50.1 },
      { ph: 14.0, turb: 90 }
    ];

    for (const tc of testCases) {
      const res = evaluateCompliance(tc.ph, tc.turb, DEFAULT_SETTINGS);
      assert.strictEqual(res.compliance, 'NON-COMPLIANT');
      assert.strictEqual(res.valve, 'CLOSED', `Failed for ph=${tc.ph}, turb=${tc.turb}`);
    }
  });

  test('Boundary conditions: exactly at threshold limits', () => {
    // At exactly phMin (6.0) and turbidityMax (50.0) -> COMPLIANT, OPEN
    const atMin = evaluateCompliance(6.0, 50.0, DEFAULT_SETTINGS);
    assert.strictEqual(atMin.compliance, 'COMPLIANT');
    assert.strictEqual(atMin.valve, 'OPEN');

    // At exactly phMax (9.0) and turbidity (50.0) -> COMPLIANT, OPEN
    const atMax = evaluateCompliance(9.0, 50.0, DEFAULT_SETTINGS);
    assert.strictEqual(atMax.compliance, 'COMPLIANT');
    assert.strictEqual(atMax.valve, 'OPEN');

    // Just below phMin (5.99) -> NON-COMPLIANT, CLOSED
    const belowMin = evaluateCompliance(5.99, 50.0, DEFAULT_SETTINGS);
    assert.strictEqual(belowMin.compliance, 'NON-COMPLIANT');
    assert.strictEqual(belowMin.valve, 'CLOSED');

    // Just above turbidityMax (50.1) -> NON-COMPLIANT, CLOSED
    const aboveTurb = evaluateCompliance(7.0, 50.1, DEFAULT_SETTINGS);
    assert.strictEqual(aboveTurb.compliance, 'NON-COMPLIANT');
    assert.strictEqual(aboveTurb.valve, 'CLOSED');
  });

  test('Sensor Disconnect / Null / Invalid values -> Fail-safe CLOSED', () => {
    const nullPh = evaluateCompliance(null, 18.0, DEFAULT_SETTINGS);
    assert.strictEqual(nullPh.hasSensorError, true);
    assert.strictEqual(nullPh.statusPh, 'DATA_UNAVAILABLE');
    assert.strictEqual(nullPh.valve, 'CLOSED');

    const nullTurb = evaluateCompliance(7.2, null, DEFAULT_SETTINGS);
    assert.strictEqual(nullTurb.hasSensorError, true);
    assert.strictEqual(nullTurb.statusTurbidity, 'DATA_UNAVAILABLE');
    assert.strictEqual(nullTurb.valve, 'CLOSED');

    const bothNull = evaluateCompliance(null, null, DEFAULT_SETTINGS);
    assert.strictEqual(bothNull.hasSensorError, true);
    assert.strictEqual(bothNull.valve, 'CLOSED');
  });

  test('Dynamic threshold settings test', () => {
    const customSettings = { phMin: 6.5, phMax: 8.5, turbidityMax: 30.0 };
    // A reading of pH 6.2 was compliant under default (6.0-9.0), but non-compliant under custom (6.5-8.5)
    const res = evaluateCompliance(6.2, 20.0, customSettings);
    assert.strictEqual(res.compliance, 'NON-COMPLIANT');
    assert.strictEqual(res.valve, 'CLOSED');
  });
});
