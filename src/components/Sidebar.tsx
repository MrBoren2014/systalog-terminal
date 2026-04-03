import React, { useEffect, useMemo, useState } from 'react';
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

type ProviderFilter = Provider | 'all';

const QUICK_LIMIT = 5;

export const Sidebar: React.FC<SidebarProps> = ({
  providers,
  models,
  customLaunches,
  onLaunchModel,
  onLaunchShell,
  onLaunchCustom,
  onAddCustom,
  onRemoveCustom,
  onOpenSettings,
}) => {
  const [activeProvider, setActiveProvider] = useState<ProviderFilter>('all');
  const [selectedModelId, setSelectedModelId] = useState('');
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customForm, setCustomForm] = useState({ label: '', command: '', cwd: '', icon: '⚙️' });

  const launcherProviders = useMemo(
    () => providers.filter((provider) => provider.id !== 'shell'),
    [providers],
  );

  const filteredModels = useMemo(() => {
    if (activeProvider === 'all') return models;
    return models.filter((model) => model.provider === activeProvider);
  }, [activeProvider, models]);

  useEffect(() => {
    if (filteredModels.length === 0) {
      setSelectedModelId('');
      return;
    }
    if (!filteredModels.some((model) => model.id === selectedModelId)) {
      setSelectedModelId(filteredModels[0].id);
    }
  }, [filteredModels, selectedModelId]);

  const selectedModel = filteredModels.find((model) => model.id === selectedModelId) || null;
  const selectedProvider = providers.find((provider) => provider.id === selectedModel?.provider);
  const quickModels = filteredModels.slice(0, QUICK_LIMIT);

  const handleAddCustom = () => {
    if (!customForm.label.trim() || !customForm.command.trim()) return;
    onAddCustom({
      id: `custom-${Date.now()}`,
      label: customForm.label.trim(),
      icon: customForm.icon.trim() || '⚙️',
      command: customForm.command.trim(),
      cwd: customForm.cwd.trim() || undefined,
      color: '#7c3aed',
      provider: 'custom',
    });
    setCustomForm({ label: '', command: '', cwd: '', icon: '⚙️' });
    setShowAddCustom(false);
  };

  return (
    <div className="w-72 border-r border-white/[0.06] bg-[linear-gradient(180deg,rgba(7,17,31,0.98),rgba(3,10,20,0.92))] flex flex-col shrink-0 overflow-hidden">
      <div className="border-b border-white/[0.06] px-4 py-4">
        <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-white/25 font-mono">Launch Deck</p>
        <h2 className="mt-2 text-[15px] font-black tracking-tight text-white">One selector, less clutter</h2>
        <p className="mt-1 text-[11px] leading-5 text-white/35">
          Pick a stack, choose the exact model, then launch cleanly.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-4">
          <div className="grid gap-3">
            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.2em] text-white/35 font-mono">Stack</span>
              <select
                value={activeProvider}
                onChange={(event) => setActiveProvider(event.target.value as ProviderFilter)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-[#07111f] px-3 py-3 text-[12px] font-semibold text-white outline-none"
              >
                <option value="all">All stacks</option>
                {launcherProviders.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/35 font-mono">Model</span>
                <span className="text-[10px] text-white/20 font-mono">{filteredModels.length} listed</span>
              </div>
              <select
                value={selectedModelId}
                onChange={(event) => setSelectedModelId(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-[#07111f] px-3 py-3 text-[12px] font-semibold text-white outline-none"
                disabled={filteredModels.length === 0}
              >
                {filteredModels.map((model) => {
                  const provider = providers.find((item) => item.id === model.provider);
                  return (
                    <option key={model.id} value={model.id}>
                      {activeProvider === 'all' ? `${provider?.label || model.provider} · ${model.name}` : model.name}
                    </option>
                  );
                })}
              </select>
            </label>
          </div>

          {selectedModel ? (
            <div className="mt-4 rounded-[22px] border border-white/10 bg-[#020611]/70 p-4">
              <div className="flex items-start gap-3">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border text-base shrink-0"
                  style={{
                    background: `${selectedProvider?.color || '#7c3aed'}18`,
                    borderColor: `${selectedProvider?.color || '#7c3aed'}35`,
                  }}
                >
                  {selectedProvider?.icon || '💻'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[13px] font-bold text-white">{selectedModel.name}</p>
                    <span
                      className="rounded-full px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em]"
                      style={{
                        background: `${selectedProvider?.color || '#7c3aed'}14`,
                        color: selectedProvider?.color || '#c4b5fd',
                      }}
                    >
                      {selectedProvider?.label || selectedModel.provider}
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] leading-5 text-white/45">
                    {selectedModel.description || 'No launch notes yet.'}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => onLaunchModel(selectedModel)}
                  className="flex-1 rounded-2xl bg-[linear-gradient(135deg,#e85d3f,#f2a33b)] px-4 py-3 text-[11px] font-bold text-white shadow-lg shadow-[#e85d3f]/10"
                >
                  Launch session
                </button>
                <button
                  onClick={() => onLaunchShell()}
                  className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-[11px] font-semibold text-white/70"
                >
                  Shell
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-[22px] border border-dashed border-white/10 bg-[#020611]/40 px-4 py-6 text-[11px] text-white/35">
              No models are wired for this stack yet.
            </div>
          )}

          {quickModels.length > 1 && (
            <div className="mt-4">
              <p className="text-[9px] uppercase tracking-[0.22em] text-white/25 font-mono">Quick picks</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {quickModels.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => setSelectedModelId(model.id)}
                    className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold transition-all ${
                      selectedModelId === model.id
                        ? 'border-white/20 bg-white/[0.08] text-white'
                        : 'border-white/10 bg-white/[0.03] text-white/45 hover:text-white/70'
                    }`}
                  >
                    {model.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/28 font-mono">Custom tools</p>
              <p className="mt-1 text-[11px] text-white/40">Pin your own commands and launchers.</p>
            </div>
            <button
              onClick={() => setShowAddCustom((value) => !value)}
              className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[10px] font-semibold text-[#f2a33b]"
            >
              {showAddCustom ? 'Hide' : '+ Add'}
            </button>
          </div>

          {showAddCustom && (
            <div className="mt-4 space-y-2 rounded-[22px] border border-white/10 bg-[#020611]/55 p-3">
              <input
                placeholder="Label"
                value={customForm.label}
                onChange={(event) => setCustomForm((state) => ({ ...state, label: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-[#07111f] px-3 py-2 text-[11px] text-white placeholder:text-white/25 outline-none"
              />
              <input
                placeholder="Command"
                value={customForm.command}
                onChange={(event) => setCustomForm((state) => ({ ...state, command: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-[#07111f] px-3 py-2 text-[11px] text-white placeholder:text-white/25 outline-none font-mono"
              />
              <input
                placeholder="Working dir (optional)"
                value={customForm.cwd}
                onChange={(event) => setCustomForm((state) => ({ ...state, cwd: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-[#07111f] px-3 py-2 text-[11px] text-white placeholder:text-white/25 outline-none font-mono"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddCustom}
                  className="flex-1 rounded-2xl bg-[linear-gradient(135deg,#7c3aed,#38bdf8)] px-3 py-2 text-[11px] font-semibold text-white"
                >
                  Save launcher
                </button>
                <button
                  onClick={() => setShowAddCustom(false)}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] font-semibold text-white/55"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="mt-4 space-y-2">
            {customLaunches.length === 0 ? (
              <div className="rounded-[20px] border border-dashed border-white/10 bg-[#020611]/30 px-3 py-4 text-[11px] text-white/28">
                No custom launchers yet.
              </div>
            ) : (
              customLaunches.map((item) => (
                <div key={item.id} className="group flex items-center gap-2 rounded-[20px] border border-white/10 bg-[#020611]/40 px-3 py-3">
                  <button onClick={() => onLaunchCustom(item)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <span className="text-sm shrink-0">{item.icon}</span>
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-semibold text-white/75">{item.label}</p>
                      <p className="truncate text-[10px] text-white/28 font-mono">{item.command}</p>
                    </div>
                  </button>
                  <button
                    onClick={() => onRemoveCustom(item.id)}
                    className="rounded-full px-2 py-1 text-[10px] text-white/25 transition-all hover:text-[#e85d3f]"
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-white/[0.06] p-3">
        <button
          onClick={onOpenSettings}
          className="w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-[11px] font-semibold text-white/70 transition-all hover:bg-white/[0.06]"
        >
          <span className="mr-2">⚙️</span>
          Settings, onboarding, and stack config
        </button>
      </div>
    </div>
  );
};
