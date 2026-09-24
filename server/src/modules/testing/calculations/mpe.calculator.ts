import { AccuracyClass, RegulatoryMode, MpeResult } from './calculation.types.js';
import { OIML_R76_TABLE_6_ZONES } from './mpe.rules.js';
import { DecimalUtils, Decimal } from './decimal.utils.js';

export class MpeCalculator {
  static calculate(
    load: number | string | Decimal,
    e: number | string | Decimal,
    accuracyClass: AccuracyClass,
    regulatoryMode: RegulatoryMode = 'TYPE_EVALUATION'
  ): MpeResult {
    const loadDec = DecimalUtils.from(load);
    const eDec = DecimalUtils.from(e);

    if (DecimalUtils.lte(eDec, 0)) {
      throw new Error(`Invalid verification scale interval e=${eDec.toString()}. Must be positive.`);
    }
    if (DecimalUtils.lt(loadDec, 0)) {
      throw new Error(`Invalid test load=${loadDec.toString()}. Load cannot be negative.`);
    }

    // Number of verification intervals m = L / e
    const mDec = DecimalUtils.div(loadDec, eDec);

    const zones = OIML_R76_TABLE_6_ZONES[accuracyClass];
    if (!zones) {
      throw new Error(`Unsupported accuracy class: ${accuracyClass}`);
    }

    // Find applicable zone
    let matchedZone = zones[0];
    for (const zone of zones) {
      const gteMin = zone.zoneIndex === 1
        ? DecimalUtils.gte(mDec, zone.minM)
        : DecimalUtils.gt(mDec, zone.minM);

      const lteMax = zone.maxM === null || DecimalUtils.lte(mDec, zone.maxM);

      if (gteMin && lteMax) {
        matchedZone = zone;
        break;
      }
    }

    // If load is beyond the highest defined Table 6 bound, it stays in the highest zone
    if (mDec.greaterThan(zones[zones.length - 1].maxM || DecimalUtils.from(Infinity))) {
      matchedZone = zones[zones.length - 1];
    }

    // Determine multiplier based on regulatory mode
    const isServiceInspection = regulatoryMode === 'SERVICE_INSPECTION';
    const modeMultiplier = isServiceInspection ? DecimalUtils.from(2) : DecimalUtils.from(1);

    const effectiveFactorE = DecimalUtils.mul(matchedZone.factorE, modeMultiplier);
    const mpeValueDec = DecimalUtils.mul(effectiveFactorE, eDec);

    const ruleId = isServiceInspection ? 'R76-3.5.2' : 'R76-3.5.1-T6';
    const clause = isServiceInspection ? '3.5.2' : '3.5.1 (Table 6)';

    const explanation = isServiceInspection
      ? `OIML R 76-1:2006 Clause 3.5.2: In-service inspection MPE is 2x Table 6 value (2 * ${matchedZone.factorE.toString()}e = ${effectiveFactorE.toString()}e = +/-${mpeValueDec.toString()}) for m = ${mDec.toString()} in Zone "${matchedZone.description}".`
      : `OIML R 76-1:2006 Clause 3.5.1 (Table 6): Initial verification MPE is +/-${matchedZone.factorE.toString()}e (+/-${mpeValueDec.toString()}) for m = ${mDec.toString()} in Zone "${matchedZone.description}".`;

    return {
      load: DecimalUtils.toNumber(loadDec),
      e: DecimalUtils.toNumber(eDec),
      accuracyClass,
      m: DecimalUtils.toNumber(mDec),
      zone: matchedZone.description,
      mpeSigned: DecimalUtils.toNumber(mpeValueDec),
      mpeSignedLower: -DecimalUtils.toNumber(mpeValueDec),
      mpeSignedUpper: DecimalUtils.toNumber(mpeValueDec),
      mpeAbsolute: DecimalUtils.toNumber(mpeValueDec),
      factorE: DecimalUtils.toNumber(effectiveFactorE),
      regulatoryMode,
      ruleId,
      clause,
      explanation
    };
  }
}
