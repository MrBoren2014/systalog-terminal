import React from 'react';
import type { ProviderConfig, ModelOption } from '../types';

interface WelcomeScreenProps {
  providers: ProviderConfig[];
  models: ModelOption[];
  onLaunchModel: (model: ModelOption) => void;
  onLaunchShell: () => void;
}

// Show top picks — one per provider
const TOP_PICKS = ['claude-sonnet-4.6', 'glm-5-turbo', 'codex-default', 'ollama-minimax-m2.7', 'openclaw-dashboard'];

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ providers, models, onLaunchModel, onLaunchShell }) => {
  const topModels = TOP_PICKS.map((id) => models.find((m) => m.id === id)).filter(Boolean) as ModelOption[];

  return (
    <div className="h-full w-full flex items-center justify-center bg-sys-bg relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 left-1/3 w-[400px] h-[400px] bg-[#e85d3f]/[0.04] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/3 w-[300px] h-[300px] bg-[#38bdf8]/[0.03] rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-md w-full px-6 text-center">
        {/* Logo */}
        <div className="mb-10">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-[#e85d3f] to-[#f2a33b] flex items-center justify-center shadow-xl shadow-[#e85d3f]/15 mb-4">
            <span className="text-xl font-extrabold text-white">S</span>
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-white mb-1.5">
            SYSTALOG Terminal
          </h1>
          <p className="text-[11px] text-white/30 font-mono tracking-wide">
            AI Agent Command Center
          </p>
        </div>

        {/* Quick launch */}
        <div className="space-y-1.5 mb-8">
          {topModels.map((model) => {
            const provider = providers.find((p) => p.id === model.provider);
            return (
              <button
                key={model.id}
                onClick={() => onLaunchModel(model)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all active:scale-[0.98] group text-left"
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
                  style={{ background: `${provider?.color || '#7c3aed'}12`, border: `1px solid ${provider?.color || '#7c3aed'}20` }}
                >
                  {provider?.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-white/70 group-hover:text-white">{model.name}</p>
                  <p className="text-[10px] text-white/25">{model.description}</p>
                </div>
                <span className="text-[10px] text-white/15 group-hover:text-white/30 font-mono shrink-0">launch →</span>
              </button>
            );
          })}

          <button
            onClick={onLaunchShell}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all active:scale-[0.98] group text-left"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base bg-[#7c3aed]/10 border border-[#7c3aed]/20 shrink-0">
              💻
            </div>
            <div className="flex-1">
              <p className="text-[12px] font-semibold text-white/70 group-hover:text-white">New Shell</p>
              <p className="text-[10px] text-white/25">Clean terminal session</p>
            </div>
            <span className="text-[10px] text-white/15 group-hover:text-white/30 font-mono shrink-0">⌘T</span>
          </button>
        </div>

        {/* Hint */}
        <p className="text-[9px] text-white/20 font-mono">
          Use the sidebar to browse all models and providers
        </p>
      </div>
    </div>
  );
};
