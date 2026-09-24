import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Clock, AlertTriangle } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  phase: number;
  phaseName: string;
  description: string;
  icon: LucideIcon;
  targetDeliverables: string[];
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  title,
  phase,
  phaseName,
  description,
  icon: Icon,
  targetDeliverables
}) => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-8 shadow-xs">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-slate-100 rounded-lg text-slate-700 border border-slate-200">
            <Icon className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Available in Phase {phase}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {phaseName}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">{title}</h2>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-200">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
            Planned Deliverables for Phase {phase}
          </h3>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {targetDeliverables.map((item, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-xs text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-200"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 p-3 bg-slate-50 rounded border border-slate-200 flex items-center gap-2.5 text-xs text-slate-600 font-mono">
          <AlertTriangle className="w-4 h-4 text-slate-500 flex-shrink-0" />
          <span>Notice: As per SIH development policy, mock or synthetic logic is omitted during Phase 1 foundation.</span>
        </div>
      </div>
    </div>
  );
};
