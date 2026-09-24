// applicability.rules.ts
// Regulatory rules for test applicability under OIML R 76-1:2006

import {
  InstrumentApplicabilityContext,
  ApplicabilityEvaluationResult
} from './applicability.types.js';

export class ApplicabilityRules {
  /**
   * Evaluates the applicability of a test type code given the instrument's verified characteristics.
   * Deterministically returns APPLICABLE, NOT_APPLICABLE, or REVIEW_REQUIRED.
   */
  static evaluate(
    testCode: string,
    context: InstrumentApplicabilityContext
  ): ApplicabilityEvaluationResult {
    const cfg = context.configuration || {};

    switch (testCode) {
      // 1. WEIGHING PERFORMANCE (Clause 3.5.1 & A.4.4.3)
      case 'WEIGHING_PERFORMANCE':
        return {
          testCode,
          applicability: 'APPLICABLE',
          reason: 'Mandatory core intrinsic error evaluation for all NAWI instruments across operational range.',
          ruleId: 'R76-3.5.1-A.4.4.3',
          clause: 'Clause 3.5.1 & A.4.4.3'
        };

      // 2. REPEATABILITY (Clause 3.6.1 & A.4.10)
      case 'REPEATABILITY':
        return {
          testCode,
          applicability: 'APPLICABLE',
          reason: 'Mandatory repeatability evaluation for all NAWI instruments (evaluated at ~50% Max and ~100% Max).',
          ruleId: 'R76-3.6.1-A.4.10',
          clause: 'Clause 3.6.1 & A.4.10'
        };

      // 3. ECCENTRIC LOADING (Clause 3.6.2 & A.4.7)
      case 'ECCENTRIC_LOADING': {
        if (cfg.receptorType === 'SUSPENDED' && cfg.supportsCount === 1) {
          return {
            testCode,
            applicability: 'NOT_APPLICABLE',
            reason: 'Single-point freely suspended load receptor is exempt from off-centre load testing under Clause 3.6.2.',
            ruleId: 'R76-3.6.2-A.4.7',
            clause: 'Clause 3.6.2'
          };
        }
        return {
          testCode,
          applicability: 'APPLICABLE',
          reason: 'Mandatory off-centre loading evaluation based on receptor geometry and support configuration.',
          ruleId: 'R76-3.6.2-A.4.7',
          clause: 'Clause 3.6.2 & A.4.7'
        };
      }

      // 4. ZERO-SETTING & ZERO-TRACKING (Clause 4.5 & A.4.2)
      case 'ZERO_SETTING': {
        if (cfg.hasZeroDevice === false) {
          return {
            testCode,
            applicability: 'NOT_APPLICABLE',
            reason: 'Instrument configuration specifies no zero-setting or zero-tracking device.',
            ruleId: 'R76-4.5-A.4.2.1',
            clause: 'Clause 4.5'
          };
        }
        return {
          testCode,
          applicability: 'APPLICABLE',
          reason: 'Mandatory evaluation for instruments equipped with zero-setting or zero-tracking devices.',
          ruleId: 'R76-4.5-A.4.2.1',
          clause: 'Clause 4.5 & A.4.2'
        };
      }

      // 5. DISCRIMINATION (Clause 3.8 & A.4.8)
      case 'DISCRIMINATION': {
        const indType = cfg.indicationType || 'digital';
        if (indType === 'digital') {
          // Normalize scale interval d to milligrams
          let dMg: number;
          const unit = (context.unit || 'kg').toLowerCase();
          if (unit === 'kg') dMg = context.d * 1_000_000;
          else if (unit === 'g') dMg = context.d * 1_000;
          else if (unit === 'mg') dMg = context.d;
          else dMg = context.d * 1_000_000; // default assumption

          if (dMg < 5) {
            return {
              testCode,
              applicability: 'NOT_APPLICABLE',
              reason: `Not applicable: digital instrument scale interval d = ${context.d} ${context.unit} (${dMg} mg) is less than 5 mg (exempt under Clause 3.8).`,
              ruleId: 'R76-3.8-A.4.8.2',
              clause: 'Clause 3.8'
            };
          }
          return {
            testCode,
            applicability: 'APPLICABLE',
            reason: `Applicable: digital indicating instrument with d = ${context.d} ${context.unit} >= 5 mg requires 1.4d additional load evaluation.`,
            ruleId: 'R76-3.8-A.4.8.2',
            clause: 'Clause 3.8 & A.4.8.2'
          };
        }
        return {
          testCode,
          applicability: 'APPLICABLE',
          reason: 'Applicable for analog / non-self-indicating instruments (Clause 3.8).',
          ruleId: 'R76-3.8-A.4.8.1',
          clause: 'Clause 3.8 & A.4.8.1'
        };
      }

      // 6. MULTIPLE INDICATING DEVICES (Clause 3.6.3)
      case 'MULTIPLE_INDICATING_DEVICES': {
        if (cfg.hasMultipleIndicators === true || cfg.hasRemoteDisplay === true || cfg.hasPrinter === true) {
          return {
            testCode,
            applicability: 'APPLICABLE',
            reason: 'Applicable: verified instrument configuration includes secondary indicator, remote display, or physical printer output.',
            ruleId: 'R76-3.6.3',
            clause: 'Clause 3.6.3'
          };
        }
        if (cfg.hasMultipleIndicators === false && !cfg.hasRemoteDisplay && !cfg.hasPrinter) {
          return {
            testCode,
            applicability: 'NOT_APPLICABLE',
            reason: 'This test is not applicable because the verified instrument configuration does not contain the relevant additional indicating device.',
            ruleId: 'R76-3.6.3',
            clause: 'Clause 3.6.3'
          };
        }
        // Insufficient configuration data
        return {
          testCode,
          applicability: 'REVIEW_REQUIRED',
          reason: 'Instrument configuration does not specify whether auxiliary indicating devices, remote displays, or printers are present (Clause 3.6.3). Manual technician review required.',
          ruleId: 'R76-3.6.3',
          clause: 'Clause 3.6.3'
        };
      }

      // 7. DIFFERENT POSITIONS OF EQUILIBRIUM (Clause 3.6.4)
      case 'DIFFERENT_POSITIONS_OF_EQUILIBRIUM': {
        if (cfg.hasEquilibriumExtension === true) {
          return {
            testCode,
            applicability: 'APPLICABLE',
            reason: 'Applicable: instrument equipped with device extending self-indication capacity (Clause 3.6.4).',
            ruleId: 'R76-3.6.4',
            clause: 'Clause 3.6.4'
          };
        }
        if (cfg.hasEquilibriumExtension === false) {
          return {
            testCode,
            applicability: 'NOT_APPLICABLE',
            reason: 'This test is not applicable because the verified instrument does not feature devices extending self-indication capacity.',
            ruleId: 'R76-3.6.4',
            clause: 'Clause 3.6.4'
          };
        }
        // Insufficient configuration data
        return {
          testCode,
          applicability: 'REVIEW_REQUIRED',
          reason: 'Instrument configuration does not specify whether self-indication capacity extension devices are present (Clause 3.6.4). Manual technician review required.',
          ruleId: 'R76-3.6.4',
          clause: 'Clause 3.6.4'
        };
      }

      // 8. TARE BALANCING & TARE WEIGHING (Clause 4.6 & A.4.6)
      case 'TARE': {
        if (cfg.hasTareDevice === false) {
          return {
            testCode,
            applicability: 'NOT_APPLICABLE',
            reason: 'Instrument configuration explicitly specifies no tare mechanism.',
            ruleId: 'R76-4.6-A.4.6',
            clause: 'Clause 4.6'
          };
        }
        return {
          testCode,
          applicability: 'APPLICABLE',
          reason: 'Applicable for instruments equipped with tare-balancing or tare-weighing devices (Clause 4.6).',
          ruleId: 'R76-4.6-A.4.6',
          clause: 'Clause 4.6 & A.4.6'
        };
      }

      // 9. TILTING INFLUENCE TEST (Clause 3.9.1 & A.5.1)
      case 'TILTING': {
        if (context.regulatoryMode === 'SERVICE_INSPECTION') {
          return {
            testCode,
            applicability: 'NOT_APPLICABLE',
            reason: 'Tilting influence test is not required during routine Service Inspection (Clause 3.9.1).',
            ruleId: 'R76-3.9.1-A.5.1',
            clause: 'Clause 3.9.1'
          };
        }
        if (cfg.isTiltSensitive === true) {
          return {
            testCode,
            applicability: 'APPLICABLE',
            reason: 'Applicable for instruments liable to tilting without level-stabilization (Clause 3.9.1).',
            ruleId: 'R76-3.9.1-A.5.1',
            clause: 'Clause 3.9.1 & A.5.1'
          };
        }
        if (cfg.isTiltSensitive === false) {
          return {
            testCode,
            applicability: 'NOT_APPLICABLE',
            reason: 'Not applicable: permanently installed / level-stabilized instrument not liable to tilting.',
            ruleId: 'R76-3.9.1-A.5.1',
            clause: 'Clause 3.9.1'
          };
        }
        return {
          testCode,
          applicability: 'REVIEW_REQUIRED',
          reason: 'Instrument tilt sensitivity and installation type not specified in configuration.',
          ruleId: 'R76-3.9.1-A.5.1',
          clause: 'Clause 3.9.1'
        };
      }

      // Default for influence / other tests
      default: {
        if (context.regulatoryMode === 'SERVICE_INSPECTION') {
          return {
            testCode,
            applicability: 'NOT_APPLICABLE',
            reason: `Influence and endurance testing (${testCode}) is exempt under Service Inspection protocol.`,
            ruleId: `R76-${testCode}`,
            clause: 'Clause 3.5.2'
          };
        }
        return {
          testCode,
          applicability: 'REVIEW_REQUIRED',
          reason: `Specialized test requirement (${testCode}) requires verification of laboratory test chamber applicability.`,
          ruleId: `R76-${testCode}`,
          clause: 'Clause 3.9'
        };
      }
    }
  }
}
