import { AccuracyClass } from './calculation.types.js';
import { DecimalUtils, Decimal } from './decimal.utils.js';

export interface MpeZoneDefinition {
  zoneIndex: number;
  description: string;
  minM: Decimal;
  maxM: Decimal | null; // null for unbounded (e.g. Class I > 200,000)
  factorE: Decimal; // 0.5, 1.0, 1.5
}

export const OIML_R76_TABLE_6_ZONES: Record<AccuracyClass, MpeZoneDefinition[]> = {
  I: [
    {
      zoneIndex: 1,
      description: '0 <= m <= 50 000 e',
      minM: DecimalUtils.from(0),
      maxM: DecimalUtils.from(50000),
      factorE: DecimalUtils.from('0.5')
    },
    {
      zoneIndex: 2,
      description: '50 000 e < m <= 200 000 e',
      minM: DecimalUtils.from(50000),
      maxM: DecimalUtils.from(200000),
      factorE: DecimalUtils.from('1.0')
    },
    {
      zoneIndex: 3,
      description: 'm > 200 000 e',
      minM: DecimalUtils.from(200000),
      maxM: null,
      factorE: DecimalUtils.from('1.5')
    }
  ],
  II: [
    {
      zoneIndex: 1,
      description: '0 <= m <= 5 000 e',
      minM: DecimalUtils.from(0),
      maxM: DecimalUtils.from(5000),
      factorE: DecimalUtils.from('0.5')
    },
    {
      zoneIndex: 2,
      description: '5 000 e < m <= 20 000 e',
      minM: DecimalUtils.from(5000),
      maxM: DecimalUtils.from(20000),
      factorE: DecimalUtils.from('1.0')
    },
    {
      zoneIndex: 3,
      description: '20 000 e < m <= 100 000 e',
      minM: DecimalUtils.from(20000),
      maxM: DecimalUtils.from(100000),
      factorE: DecimalUtils.from('1.5')
    }
  ],
  III: [
    {
      zoneIndex: 1,
      description: '0 <= m <= 500 e',
      minM: DecimalUtils.from(0),
      maxM: DecimalUtils.from(500),
      factorE: DecimalUtils.from('0.5')
    },
    {
      zoneIndex: 2,
      description: '500 e < m <= 2 000 e',
      minM: DecimalUtils.from(500),
      maxM: DecimalUtils.from(2000),
      factorE: DecimalUtils.from('1.0')
    },
    {
      zoneIndex: 3,
      description: '2 000 e < m <= 10 000 e',
      minM: DecimalUtils.from(2000),
      maxM: DecimalUtils.from(10000),
      factorE: DecimalUtils.from('1.5')
    }
  ],
  IIII: [
    {
      zoneIndex: 1,
      description: '0 <= m <= 50 e',
      minM: DecimalUtils.from(0),
      maxM: DecimalUtils.from(50),
      factorE: DecimalUtils.from('0.5')
    },
    {
      zoneIndex: 2,
      description: '50 e < m <= 200 e',
      minM: DecimalUtils.from(50),
      maxM: DecimalUtils.from(200),
      factorE: DecimalUtils.from('1.0')
    },
    {
      zoneIndex: 3,
      description: '200 e < m <= 1 000 e',
      minM: DecimalUtils.from(200),
      maxM: DecimalUtils.from(1000),
      factorE: DecimalUtils.from('1.5')
    }
  ]
};
