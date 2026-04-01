import React, { useState, useRef } from 'react';
import type { TerminalTab } from '../types';

interface TabBarProps {
  tabs: TerminalTab[];
  activeTabId: string | null;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onRename: (id: string, label: string) => void;
  onNewTab: () => void;
}

export const TabBar: React.FC<TabBarProps> = ({ tabs, activeTabId, onSelect, onClose, onRename, onNewTab }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDoubleClick = (id: string) => {
    setEditingId(id);
    setTimeout(() => inputRef.current?.select(), 10);
  };

  const handleRenameSubmit = (id: string, value: string) => {
    if (value.trim()) onRename(id, value.trim());
    setEditingId(null);
  };

  return (
    <div className="flex items-center h-9 bg-sys-surface/60 border-b border-white/[0.06] overflow-x-auto shrink-0">
      <div className="flex items-center gap-0.5 px-2 min-w-0">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              className={`group relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium cursor-pointer transition-all min-w-0 max-w-[180px] ${
                isActive
                  ? 'bg-white/[0.08] text-white'
                  : 'text-white/40 hover:text-white/60 hover:bg-white/[0.03]'
              }`}
              onClick={() => onSelect(tab.id)}
              onDoubleClick={() => handleDoubleClick(tab.id)}
            >
              {/* Color indicator */}
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: tab.color }}
              />

              {/* Tab icon */}
              <span className="text-[10px] shrink-0">{tab.icon}</span>

              {/* Label */}
              {editingId === tab.id ? (
                <input
                  ref={inputRef}
                  className="bg-transparent border-none outline-none text-white text-[11px] font-medium w-full min-w-[40px]"
                  defaultValue={tab.label}
                  onBlur={(e) => handleRenameSubmit(tab.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameSubmit(tab.id, e.currentTarget.value);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="truncate">{tab.label}</span>
              )}

              {/* Close button */}
              <button
                className={`shrink-0 w-4 h-4 rounded flex items-center justify-center text-[10px] transition-colors ${
                  isActive
                    ? 'text-white/40 hover:text-white hover:bg-white/10'
                    : 'text-white/20 opacity-0 group-hover:opacity-100 hover:text-white hover:bg-white/10'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(tab.id);
                }}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      {/* New tab button */}
      <button
        onClick={() => onNewTab()}
        className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all ml-1 mr-2"
        title="New tab (⌘T)"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M6 1v10M1 6h10" />
        </svg>
      </button>
    </div>
  );
};
