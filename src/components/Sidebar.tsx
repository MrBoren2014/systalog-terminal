import React, { useState } from 'react';
import type { ProviderConfig, ModelOption, CustomLaunch, Provider } from '../types';

interface SidebarProps {
  providers: ProviderConfig[];
  models: ModelOption[];
  customLaunches: CustomLaunch[];
  onLaunchModel: (model: ModelOption, cwd?: string) => void;
  onLaunchShell: (cwd?: string) => void;
  onLaunchCustom: (item: CustomLaunch) => void;
  onAddCustom: (item: CustomLaunch) => void;
  onRemoveCustom: (id: string) => void;
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  providers, models, customLaunches,
  onLaunchModel, onLaunchShell, onLaunchCustom, onAddCustom, onRemoveCustom, onOpenSettings,
}) => {
  const [activeProvider, setActiveProvider] = useState<Provider | 'custom' | 'all'>('all');
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customForm, setCustomForm] = useState({ label: '', command: '', cwd: '', icon: '⚙️' });

  // Filter models by provider
  const filteredModels = activeProvider === 'all'
    ? models
    : activeProvider === 'custom'
      ? []
      : models.filter((m) => m.provider === activeProvider);

  const allModels = filteredModels;

  const handleAddCustom = () => {
    if (!customForm.label.trim() || !customForm.command.trim()) return;
    onAddCustom({
      id: `custom-${Date.now()}`,
      label: customForm.label,
      icon: customForm.icon || '⚙️',
      command: customForm.command,
      cwd: customForm.cwd || undefined,
      color: '#7c3aed',
      provider: 'custom',
    });
    setCustomForm({ label: '', command: '', cwd: '', icon: '⚙️' });
    setShowAddCustom(false);
  };

  return (
    <div className="w-60 border-r border-white/[0.06] bg-sys-surface/30 flex flex-col shrink-0 overflow-hidden">
      {/* Provider filter tabs */}
      <div className="p-2 border-b border-white/[0.06]">
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setActiveProvider('all')}
            className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all ${
              activeProvider === 'all' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/50'
            }`}
          >
            All
          </button>
          {providers.filter(p => p.id !== 'shell').map((p) => (
            <button
              key={p.id}
              onClick={() => setActiveProvider(p.id)}
              className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all ${
                activeProvider === p.id ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/50'
              }`}
            >
              <span className="mr-1">{p.icon}</span>{p.label.split(' ')[0]}
            </button>
          ))}
          <button
            onClick={() => setActiveProvider('custom')}
            className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all ${
              activeProvider === 'custom' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/50'
            }`}
          >
            Custom
          </button>
        </div>
      </div>

      {/* Model list */}
      <div className="flex-1 overflow-y-auto p-2">
        {activeProvider !== 'custom' && (
          <>
            <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-white/20 mb-2 px-1 font-mono">
              Models {allModels.length > 0 && `(${allModels.length})`}
            </p>
            <div className="space-y-0.5">
              {allModels.map((model) => {
                const provider = providers.find((p) => p.id === model.provider);
                return (
                  <button
                    key={model.id}
                    onClick={() => onLaunchModel(model)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all hover:bg-white/[0.05] active:scale-[0.98] group"
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0"
                      style={{ background: `${provider?.color || '#7c3aed'}12`, border: `1px solid ${provider?.color || '#7c3aed'}25` }}
                    >
                      {provider?.icon || '💻'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold text-white/70 group-hover:text-white truncate leading-tight">
                        {model.name}
                      </p>
                      <p className="text-[9px] text-white/25 truncate leading-tight">
                        {model.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Shell launcher */}
            <div className="mt-3 pt-3 border-t border-white/[0.04]">
              <button
                onClick={() => onLaunchShell()}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all hover:bg-white/[0.05] active:scale-[0.98]"
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs bg-[#7c3aed]/10 border border-[#7c3aed]/20">💻</div>
                <div>
                  <p className="text-[11px] font-semibold text-white/70">New Shell</p>
                  <p className="text-[9px] text-white/25">Clean terminal</p>
                </div>
              </button>
            </div>
          </>
        )}

        {/* Custom launches */}
        {(activeProvider === 'custom' || activeProvider === 'all') && (
          <div className={activeProvider === 'all' ? 'mt-3 pt-3 border-t border-white/[0.04]' : ''}>
            <div className="flex items-center justify-between mb-2 px-1">
              <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-white/20 font-mono">
                Custom ({customLaunches.length})
              </p>
              <button
                onClick={() => setShowAddCustom(true)}
                className="text-[9px] text-[#e85d3f] hover:text-[#f2a33b] font-semibold"
              >
                + Add
              </button>
            </div>
            {customLaunches.map((item) => (
              <div key={item.id} className="group flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-white/[0.05]">
                <button onClick={() => onLaunchCustom(item)} className="flex items-center gap-2.5 flex-1 min-w-0 text-left">
                  <span className="text-sm shrink-0">{item.icon}</span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-white/70 truncate">{item.label}</p>
                    <p className="text-[9px] text-white/25 truncate font-mono">{item.command}</p>
                  </div>
                </button>
                <button
                  onClick={() => onRemoveCustom(item.id)}
                  className="opacity-0 group-hover:opacity-100 text-[10px] text-white/20 hover:text-[#e85d3f] transition-all shrink-0"
                >
                  ×
                </button>
              </div>
            ))}

            {/* Add custom form */}
            {showAddCustom && (
              <div className="mt-2 p-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] space-y-2">
                <input
                  placeholder="Label (e.g. Dev Server)"
                  value={customForm.label}
                  onChange={(e) => setCustomForm((f) => ({ ...f, label: e.target.value }))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-[10px] text-white placeholder:text-white/20 outline-none focus:border-[#e85d3f]/40 font-mono"
                />
                <input
                  placeholder="Command (e.g. npm run dev)"
                  value={customForm.command}
                  onChange={(e) => setCustomForm((f) => ({ ...f, command: e.target.value }))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-[10px] text-white placeholder:text-white/20 outline-none focus:border-[#e85d3f]/40 font-mono"
                />
                <input
                  placeholder="Working dir (optional)"
                  value={customForm.cwd}
                  onChange={(e) => setCustomForm((f) => ({ ...f, cwd: e.target.value }))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-[10px] text-white placeholder:text-white/20 outline-none focus:border-[#e85d3f]/40 font-mono"
                />
                <div className="flex gap-1.5">
                  <button onClick={handleAddCustom} className="flex-1 py-1.5 rounded-lg bg-[linear-gradient(135deg,#e85d3f,#f2a33b)] text-[10px] font-bold text-white">
                    Add
                  </button>
                  <button onClick={() => setShowAddCustom(false)} className="flex-1 py-1.5 rounded-lg border border-white/10 text-[10px] font-medium text-white/50">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="p-2 border-t border-white/[0.06] space-y-1">
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[10px] font-medium text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-all"
        >
          <span>⚙️</span> Settings & API Keys
        </button>
      </div>
    </div>
  );
};
