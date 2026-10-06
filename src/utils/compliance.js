/**
 * Compliance evaluation logic for Industrial Effluent Quality Monitor.
 *
 * Central evaluation rule:
 * IF:
 *   ph >= phMin AND ph <= phMax AND turbidity <= turbidityMax
 * THEN:
 *   COMPLIANT, Valve OPEN
 * ELSE:
 *   NON-COMPLIANT, Valve CLOSED
 *
 * CRITICAL SAFETY REQUIREMENT:
 * The system must NEVER allow NON-COMPLIANT + VALVE OPEN.
 */

export const DEFAULT_SETTINGS = {
  phMin: 6.0,
  phMax: 9.0,
  turbidityMax: 50.0
};

/**
 * Evaluates effluent compliance and determines valve control state.
 *
 * @param {number|string|null} ph - pH sensor reading (0 - 14)
 * @param {number|string|null} turbidity - Turbidity reading in NTU
 * @param {object} settings - Threshold settings { phMin, phMax, turbidityMax }
 * @returns {object} Evaluation results
 */
export function evaluateCompliance(ph, turbidity, settings = DEFAULT_SETTINGS) {
  const currentSettings = {
    phMin: typeof settings?.phMin === 'number' ? settings.phMin : DEFAULT_SETTINGS.phMin,
    phMax: typeof settings?.phMax === 'number' ? settings.phMax : DEFAULT_SETTINGS.phMax,
    turbidityMax: typeof settings?.turbidityMax === 'number' ? settings.turbidityMax : DEFAULT_SETTINGS.turbidityMax
  };

  const isPhValidNumber = ph !== null && ph !== undefined && ph !== '' && !isNaN(Number(ph));
  const isTurbValidNumber = turbidity !== null && turbidity !== undefined && turbidity !== '' && !isNaN(Number(turbidity));

  // Missing or sensor failure case
  if (!isPhValidNumber || !isTurbValidNumber) {
    const reasons = [];
    if (!isPhValidNumber) reasons.push('pH sensor data unavailable');
    if (!isTurbValidNumber) reasons.push('Turbidity sensor data unavailable');

    return {
      compliance: 'NON-COMPLIANT',
      valve: 'CLOSED', // Fail-safe: shut off discharge if sensor data is lost
      isCompliant: false,
      hasSensorError: true,
      statusPh: !isPhValidNumber ? 'DATA_UNAVAILABLE' : 'NORMAL',
      statusTurbidity: !isTurbValidNumber ? 'DATA_UNAVAILABLE' : 'NORMAL',
      reasons,
      settings: currentSettings
    };
  }

  const phVal = Number(ph);
  const turbVal = Number(turbidity);

  const phInLimit = phVal >= currentSettings.phMin && phVal <= currentSettings.phMax;
  const turbInLimit = turbVal <= currentSettings.turbidityMax;

  const isCompliant = phInLimit && turbInLimit;
  const compliance = isCompliant ? 'COMPLIANT' : 'NON-COMPLIANT';
  // Fail-safe valve rule: OPEN only when compliant; CLOSED when non-compliant
  const valve = isCompliant ? 'OPEN' : 'CLOSED';

  let statusPh = 'NORMAL';
  if (!phInLimit) {
    statusPh = 'OUT OF LIMIT';
  }

  let statusTurbidity = 'NORMAL';
  if (!turbInLimit) {
    statusTurbidity = 'HIGH';
  }

  const reasons = [];
  if (!phInLimit) {
    if (phVal < currentSettings.phMin) {
      reasons.push(`pH ${phVal.toFixed(2)} is below minimum threshold (${currentSettings.phMin})`);
    } else {
      reasons.push(`pH ${phVal.toFixed(2)} exceeds maximum threshold (${currentSettings.phMax})`);
    }
  }
  if (!turbInLimit) {
    reasons.push(`Turbidity ${turbVal.toFixed(1)} NTU exceeds limit (${currentSettings.turbidityMax} NTU)`);
  }

  return {
    compliance,
    valve,
    isCompliant,
    hasSensorError: false,
    statusPh,
    statusTurbidity,
    reasons,
    settings: currentSettings
  };
}
