import React, { useEffect, useMemo, useState } from 'react';
import type { TerminalTab } from '../types';

interface EditorPaneProps {
  tab: TerminalTab;
  isActive: boolean;
}

interface MarkdownBlock {
  type: 'heading' | 'paragraph' | 'list' | 'code';
  level?: number;
  text?: string;
  items?: string[];
  language?: string;
}

function parseMarkdown(source: string): MarkdownBlock[] {
  const lines = source.split(/\r?\n/);
  const blocks: MarkdownBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed.startsWith('```')) {
      const language = trimmed.slice(3).trim();
      index += 1;
      const codeLines: string[] = [];
      while (index < lines.length && !lines[index].trim().startsWith('```')) {
        codeLines.push(lines[index]);
        index += 1;
      }
      index += 1;
      blocks.push({ type: 'code', text: codeLines.join('\n'), language });
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2] });
      index += 1;
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^[-*]\s+/, ''));
        index += 1;
      }
      blocks.push({ type: 'list', items });
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length) {
      const next = lines[index].trim();
      if (!next || next.startsWith('```') || /^#{1,6}\s+/.test(next) || /^[-*]\s+/.test(next)) break;
      paragraphLines.push(lines[index]);
      index += 1;
    }
    blocks.push({ type: 'paragraph', text: paragraphLines.join(' ') });
  }

  return blocks;
}

function inlineTokens(text: string) {
  return text.split(/(`[^`]+`)/g).map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={`${part}-${index}`} className="rounded-md bg-[#132036] px-1.5 py-0.5 text-[#f2a33b]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
  });
}

export const EditorPane: React.FC<EditorPaneProps> = ({ tab, isActive }) => {
  const [content, setContent] = useState('');
  const [savedContent, setSavedContent] = useState('');
  const [status, setStatus] = useState('Loading file...');

  useEffect(() => {
    if (!tab.filePath) return;
    window.systalog?.filesystem.readTextFile(tab.filePath).then((result) => {
      if (result?.success && typeof result.content === 'string') {
        setContent(result.content);
        setSavedContent(result.content);
        setStatus('Loaded');
      } else {
        setStatus(result?.error || 'Unable to read file.');
      }
    });
  }, [tab.filePath]);

  const blocks = useMemo(() => parseMarkdown(content), [content]);
  const dirty = content !== savedContent;
  const isMarkdown = (tab.filePath || '').toLowerCase().endsWith('.md');

  const handleSave = async () => {
    if (!tab.filePath) return;
    setStatus('Saving...');
    const result = await window.systalog?.filesystem.writeTextFile(tab.filePath, content);
    if (result?.success) {
      setSavedContent(content);
      setStatus('Saved');
      return;
    }
    setStatus(result?.error || 'Save failed.');
  };

  const headingClass = (level = 1) => {
    if (level === 1) return 'text-3xl font-black tracking-tight text-white';
    if (level === 2) return 'text-2xl font-bold text-white';
    if (level === 3) return 'text-xl font-bold text-white/90';
    return 'text-lg font-semibold text-white/80';
  };

  return (
    <div className={`h-full w-full bg-sys-bg ${isActive ? '' : 'pointer-events-none'}`}>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-white/[0.06] bg-[#0b1424]/90 px-4 py-2">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold text-white">{tab.label}</p>
            <p className="truncate text-[10px] text-white/30 font-mono">{tab.filePath}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-mono ${dirty ? 'bg-[#f2a33b]/10 text-[#f2a33b]' : 'bg-[#14b8a6]/10 text-[#14b8a6]'}`}>
              {dirty ? 'modified' : status}
            </span>
            <button
              onClick={handleSave}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-semibold text-white/70 disabled:opacity-40"
              disabled={!dirty}
            >
              Save
            </button>
          </div>
        </div>

        <div className="grid flex-1 grid-cols-2 overflow-hidden">
          <div className="border-r border-white/[0.06] bg-[#07111f]">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2">
              <span className="text-[10px] uppercase tracking-[0.22em] text-white/35 font-mono">Source</span>
            </div>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              spellCheck={false}
              className="h-full w-full resize-none bg-transparent px-4 py-4 font-mono text-[12px] leading-6 text-white/78 outline-none"
            />
          </div>

          <div className="overflow-y-auto bg-[radial-gradient(circle_at_top,#132036,transparent_45%),#020611]">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-2">
              <span className="text-[10px] uppercase tracking-[0.22em] text-white/35 font-mono">Preview</span>
            </div>
            <div className="mx-auto max-w-3xl px-8 py-8">
              <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-8 shadow-[0_20px_80px_rgba(2,6,17,0.55)]">
                <div className="space-y-5 text-[14px] leading-7 text-white/68">
                  {isMarkdown ? (
                    <>
                      {blocks.map((block, index) => {
                        if (block.type === 'heading') {
                          return (
                            <h2 key={index} className={headingClass(block.level)}>
                              {inlineTokens(block.text || '')}
                            </h2>
                          );
                        }
                        if (block.type === 'list') {
                          return (
                            <ul key={index} className="space-y-2">
                              {(block.items || []).map((item, itemIndex) => (
                                <li key={itemIndex} className="flex gap-3">
                                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#f2a33b]" />
                                  <span>{inlineTokens(item)}</span>
                                </li>
                              ))}
                            </ul>
                          );
                        }
                        if (block.type === 'code') {
                          return (
                            <div key={index} className="overflow-hidden rounded-2xl border border-[#38bdf8]/15 bg-[#07111f]">
                              <div className="border-b border-white/[0.06] px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-[#8ed8ff] font-mono">
                                {block.language || 'code'}
                              </div>
                              <pre className="overflow-x-auto px-4 py-4 text-[12px] leading-6 text-[#bdeafe] font-mono">{block.text}</pre>
                            </div>
                          );
                        }
                        return (
                          <p key={index} className="text-white/70">
                            {inlineTokens(block.text || '')}
                          </p>
                        );
                      })}
                      {blocks.length === 0 && (
                        <p className="text-white/35">This file is empty.</p>
                      )}
                    </>
                  ) : (
                    <div className="overflow-hidden rounded-2xl border border-[#38bdf8]/15 bg-[#07111f]">
                      <div className="border-b border-white/[0.06] px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-[#8ed8ff] font-mono">
                        Live preview
                      </div>
                      <pre className="overflow-x-auto px-4 py-4 text-[12px] leading-6 text-[#bdeafe] font-mono whitespace-pre-wrap break-words">
                        {content || 'This file is empty.'}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
