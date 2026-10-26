import React, { useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Compass,
  Keyboard,
  RotateCcw,
  Volume2,
  VolumeX,
  Wrench,
  X,
} from 'lucide-react';
import { FINALE_WORLD, LEVELS, RepairTask, TelemetryData } from '../types/game';

interface HudOverlayProps {
  currentLevel: number; // 1..4 or 5 (Finale)
  completedTasksInLevel: number; // 0..4
  totalCompletedCount: number; // 0..16
  activeTask: RepairTask | null;
  activeTokenIndices: number[];
  telemetry: TelemetryData;
  isMuted: boolean;
  transitionBanner: string | null;
  portalBlockedBanner: boolean;
  onManualCompleteActiveTask: () => void;
  onSelectLevel: (level: number) => void;
  onResetGame: () => void;
  onToggleMute: () => void;
}

const BLUEPRINT_IMAGES = [
  {
    src: '/assets/aistudio/front_0e87f1a8.png',
    label: 'Predný pohľad (Front)',
  },
  {
    src: '/assets/aistudio/side_0e63287f.png',
    label: 'Bočný pohľad (Side)',
  },
  {
    src: '/assets/aistudio/top_08bd9eea.png',
    label: 'Horný pohľad (Top)',
  },
  {
    src: '/assets/aistudio/001_0ee19cad.png',
    label: 'Perspektíva modelu v Blenderi',
  },
];

const WORLD_PREVIEW_IMAGES = [
  {
    level: 1,
    src: '/assets/aistudio/land01_5dd48b02.png',
    title: 'Level 1 · Slnečné štíty',
  },
  {
    level: 2,
    src: '/assets/aistudio/land03_409ea9db.png',
    title: 'Level 2 · Purpurové duny',
  },
  {
    level: 3,
    src: '/assets/aistudio/land04_3ddf8557.png',
    title: 'Level 3 · Kubická metropola',
  },
  {
    level: 4,
    src: '/assets/aistudio/land05_b0c1403d.png',
    title: 'Level 4 · Kamenný labyrint',
  },
];

export const HudOverlay: React.FC<HudOverlayProps> = ({
  currentLevel,
  completedTasksInLevel,
  totalCompletedCount,
  activeTask,
  activeTokenIndices,
  telemetry,
  isMuted,
  transitionBanner,
  portalBlockedBanner,
  onManualCompleteActiveTask,
  onSelectLevel,
  onResetGame,
  onToggleMute,
}) => {
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [hangarOpen, setHangarOpen] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const isFinale = currentLevel > LEVELS.length;
  const levelConfig = !isFinale ? LEVELS[currentLevel - 1] : null;
  const worldName = levelConfig ? levelConfig.name : FINALE_WORLD.name;
  const worldSubtitle = levelConfig ? levelConfig.subtitle : FINALE_WORLD.subtitle;

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between">
      {/* STRICT 3-ZONE TOP BAR CONTRACT */}
      <header className="pointer-events-auto flex items-center justify-between gap-8 px-6 py-3.5 bg-[#0b0f17]/92 border-b border-white/10">
        {/* Zone 1: Single-element Brand Wordmark */}
        <a
          href="#let"
          onClick={(e) => {
            e.preventDefault();
            setHangarOpen(false);
          }}
          className="font-display text-lg font-bold tracking-wide text-white whitespace-nowrap shrink-0"
        >
          Krídla Blenderu
        </a>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav
          aria-label="Výber úrovne a hangár"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300"
        >
          {LEVELS.map((lvl) => {
            const isActive = !hangarOpen && currentLevel === lvl.level;
            return (
              <button
                key={lvl.level}
                type="button"
                onClick={() => {
                  setHangarOpen(false);
                  onSelectLevel(lvl.level);
                }}
                className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer py-0.5 border-b-2 ${
                  isActive
                    ? 'text-amber-400 border-amber-400'
                    : 'text-slate-300 border-transparent hover:text-white hover:border-white/40'
                }`}
              >
                Level {lvl.level}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setHangarOpen((prev) => !prev)}
            className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer py-0.5 border-b-2 ${
              hangarOpen
                ? 'text-amber-400 border-amber-400'
                : 'text-slate-300 border-transparent hover:text-white hover:border-white/40'
            }`}
          >
            Hangár a skratky
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onResetGame}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 rounded-lg hover:bg-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Reštartovať let
          </button>
        </div>
      </header>

      {/* TOP-CENTER COMPACT FLIGHT PROMPT (100% Unobstructed Center Biplane Viewport) */}
      <div className="flex flex-col items-center px-4 pt-3">
        {transitionBanner && (
          <div className="mb-2 px-5 py-2 rounded-lg bg-[#0b0f17]/94 border border-sky-400/40 text-sky-200 text-sm font-medium shadow-lg">
            {transitionBanner}
          </div>
        )}

        {portalBlockedBanner && (
          <div className="mb-2 px-5 py-2 rounded-lg bg-[#1c120c]/95 border border-amber-400/50 text-amber-200 text-sm font-medium shadow-lg">
            Portál je uzamknutý — najprv dokonči všetky 4 opravy lietadla v tomto leveli!
          </div>
        )}

        {!isFinale && activeTask && (
          <div
            role="region"
            aria-live="polite"
            className="pointer-events-auto w-full max-w-xl rounded-xl bg-[#0e131d]/94 border border-amber-500/45 px-5 py-3.5 shadow-2xl"
          >
            {/* Zero-pill quiet metadata line with typographic separators */}
            <div className="flex items-center justify-between gap-3 text-xs text-amber-300/90 mb-1">
              <div className="flex items-center gap-2">
                <Wrench className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Porucha lietadla — klesanie</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">
                  Level {currentLevel}: {worldName}
                </span>
              </div>
              <span className="tabular-nums text-slate-400">
                Oprava {completedTasksInLevel + 1} / 4
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <h1
                  className="font-display text-lg sm:text-xl font-bold text-white tracking-wide"
                  style={{ textWrap: 'balance' }}
                >
                  {activeTask.title}
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                  {activeTask.repairStory}
                </p>
              </div>

              {/* Interactive Keycap Prompt (works via physical keyboard OR direct click) */}
              <button
                type="button"
                onClick={onManualCompleteActiveTask}
                title="Stlač klávesovú skratku na klávesnici (alebo klikni pre potvrdenie opravy)"
                className="shrink-0 flex flex-col items-end gap-1 group cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400 rounded-lg"
              >
                <div className="flex items-center gap-1.5">
                  {activeTask.keyTokens.map((token, idx) => {
                    const isPressed = activeTokenIndices.includes(idx);
                    return (
                      <React.Fragment key={token}>
                        {idx > 0 && (
                          <span className="text-xs font-bold text-slate-400">+</span>
                        )}
                        <kbd
                          className={`font-mono-tech px-3 py-1.5 rounded-md text-sm font-bold border transition-transform duration-150 whitespace-nowrap ${
                            isPressed
                              ? 'bg-emerald-500 text-slate-950 border-emerald-300 scale-95'
                              : 'bg-slate-800 text-amber-300 border-amber-400/50 group-hover:border-amber-300 group-hover:bg-slate-700'
                          }`}
                        >
                          {token}
                        </kbd>
                      </React.Fragment>
                    );
                  })}
                </div>
                {activeTask.altShortcutsLabel ? (
                  <span className="text-[11px] text-slate-400">
                    {activeTask.altShortcutsLabel}
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400">
                    Stlač na klávesnici
                  </span>
                )}
              </button>
            </div>
          </div>
        )}

        {!isFinale && !activeTask && completedTasksInLevel >= 4 && (
          <div className="pointer-events-auto rounded-xl bg-[#0b1616]/92 border border-emerald-400/45 px-5 py-3 shadow-xl text-center max-w-lg">
            <div className="text-xs text-emerald-300 mb-0.5 tabular-nums">
              Level {currentLevel} · Všetky 4 úlohy splnené · Vzdialenosť k portálu: {telemetry.distanceToPortal} m
            </div>
            <p className="font-display text-base font-bold text-white">
              Lietadlo je plne opravené — nasmeruj let priamo cez kruhový portál!
            </p>
          </div>
        )}

        {isFinale && (
          <div className="pointer-events-auto rounded-xl bg-[#0c1622]/94 border border-emerald-400/50 px-6 py-4 shadow-2xl max-w-xl text-center">
            <div className="text-xs text-emerald-300 mb-1 tabular-nums">
              Všetkých 16 Blender úloh úspešne zvládnutých · Zlaté údolie majstrov
            </div>
            <h1
              className="font-display text-xl sm:text-2xl font-bold text-white"
              style={{ textWrap: 'balance' }}
            >
              Gratulujeme, pilot! Opravil si lietadlo vo všetkých 4 svetoch.
            </h1>
            <p className="text-sm text-slate-300 mt-1 mb-3">
              Teraz si môžeš vychutnať voľný víťazný let šípkami alebo si zopakovať ľubovoľný level.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={onResetGame}
                className="px-4 py-2 text-xs font-semibold bg-amber-400 text-slate-950 rounded-lg hover:bg-amber-300 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Hrať od Levelu 1
              </button>
              <button
                type="button"
                onClick={() => setHangarOpen(true)}
                className="px-4 py-2 text-xs font-semibold bg-slate-800 text-slate-100 border border-white/15 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap"
              >
                Prehľad všetkých 16 skratiek
              </button>
            </div>
          </div>
        )}
      </div>

      {/* UNIFIED COLLAPSIBLE BOTTOM CONTROL DOCK (Three.js Directive #5) */}
      <div className="flex flex-col items-center pb-4 px-3">
        <div className="pointer-events-auto flex flex-col items-center w-full max-w-[940px]">
          <button
            type="button"
            onClick={() => setDockCollapsed((prev) => !prev)}
            className="flex items-center gap-1.5 px-3.5 py-1 rounded-t-lg bg-[#0d121b]/94 border border-b-0 border-white/15 text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
          >
            {dockCollapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                Zobraziť panel úloh
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                Skryť panel
              </>
            )}
          </button>

          {!dockCollapsed && (
            <div className="w-full rounded-xl bg-[#0d121b]/94 border border-white/15 px-5 py-3.5 shadow-2xl">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Current Level 4-Task Progress Strip */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                    <span className="font-semibold text-slate-200">
                      {isFinale ? FINALE_WORLD.name : `Level ${currentLevel}: ${worldName}`}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="truncate">{worldSubtitle}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums text-amber-300 shrink-0">
                      Celkom {totalCompletedCount} / 16
                    </span>
                  </div>

                  {levelConfig ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {levelConfig.tasks.map((task, index) => {
                        const isDone = index < completedTasksInLevel;
                        const isCurrent = activeTask?.id === task.id;
                        return (
                          <div
                            key={task.id}
                            className={`px-2.5 py-2 rounded-lg border text-xs transition-colors ${
                              isDone
                                ? 'bg-emerald-950/50 border-emerald-500/35 text-emerald-200'
                                : isCurrent
                                ? 'bg-amber-950/45 border-amber-400/60 text-white'
                                : 'bg-slate-900/75 border-white/8 text-slate-400'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <span className="font-mono-tech font-bold text-[11px] tabular-nums">
                                {task.shortcutLabel}
                              </span>
                              {isDone && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                            </div>
                            <div className="truncate text-[11px] opacity-90" title={task.title}>
                              {task.blenderFunction}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-xs text-slate-300 py-1">
                      <span>Prepnúť priamo na tréning konkrétneho sveta:</span>
                      {LEVELS.map((l) => (
                        <button
                          key={l.level}
                          type="button"
                          onClick={() => onSelectLevel(l.level)}
                          className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Level {l.level}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right Telemetry & Flight Controls Legend */}
                <div className="flex items-center justify-between lg:justify-end gap-5 pt-2 lg:pt-0 border-t lg:border-t-0 lg:border-l border-white/10 lg:pl-5 shrink-0">
                  <div className="flex items-center gap-4 text-xs">
                    <div>
                      <div className="text-slate-400">Výška</div>
                      <div
                        className={`font-mono-tech text-sm font-bold tabular-nums ${
                          telemetry.isFalling ? 'text-amber-400' : 'text-white'
                        }`}
                      >
                        {telemetry.altitude} m
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">Rýchlosť</div>
                      <div className="font-mono-tech text-sm font-bold text-white tabular-nums">
                        {telemetry.airspeed} km/h
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">Portál</div>
                      <div
                        className={`font-mono-tech text-sm font-bold tabular-nums ${
                          telemetry.portalUnlocked ? 'text-emerald-400' : 'text-slate-300'
                        }`}
                      >
                        {telemetry.distanceToPortal} m
                      </div>
                    </div>
                  </div>

                  <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-300">
                    <Compass className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span className="font-mono-tech text-slate-200">↑ ↓ ← →</span>
                    <span className="text-slate-400">Let</span>
                  </div>

                  <button
                    type="button"
                    onClick={onToggleMute}
                    aria-label={isMuted ? 'Zapnúť zvuk motora' : 'Stlmiť zvuk motora'}
                    className="p-2 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-white/10 transition-colors cursor-pointer shrink-0"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* HANGAR & BLENDER SHORTCUT ENCYCLOPEDIA DRAWER / MODAL */}
      {hangarOpen && (
        <div className="fixed inset-0 z-30 pointer-events-auto bg-slate-950/88 flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-5xl max-h-[88vh] overflow-y-auto rounded-2xl bg-[#0e131d] border border-white/15 p-6 sm:p-8 shadow-2xl">
            <div className="flex items-start justify-between gap-4 pb-5 border-b border-white/10">
              <div>
                <div className="text-xs text-amber-300 mb-1">
                  Technický hangár dvojplošníka · Tréning klávesových skratiek Blender 3D
                </div>
                <h2 className="font-display text-2xl font-bold text-white">
                  Prehľad všetkých 16 opravárenských úloh a výkresov lietadla
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setHangarOpen(false)}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
                aria-label="Zavrieť hangár"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 4 Levels Shortcut Reference */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
              {LEVELS.map((lvl) => (
                <div
                  key={lvl.level}
                  className="rounded-xl bg-slate-900/70 border border-white/10 p-4"
                >
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div>
                      <h3 className="font-display text-base font-bold text-white">
                        Level {lvl.level} · {lvl.name}
                      </h3>
                      <p className="text-xs text-slate-400">{lvl.subtitle}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setHangarOpen(false);
                        onSelectLevel(lvl.level);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold rounded-md bg-slate-800 hover:bg-amber-400 hover:text-slate-950 text-slate-200 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Letieť Level {lvl.level}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {lvl.tasks.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between gap-3 text-xs py-1.5 border-t border-white/6"
                      >
                        <span className="text-slate-200">{t.title}</span>
                        <kbd className="font-mono-tech px-2 py-0.5 rounded bg-slate-800 border border-white/15 text-amber-300 font-semibold whitespace-nowrap shrink-0">
                          {t.shortcutLabel}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Orthographic Blender Blueprints & Worlds */}
            <div className="pt-4 border-t border-white/10">
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                <Keyboard className="w-3.5 h-3.5 text-amber-400" />
                <span>Konštrukčné pohľady low-poly dvojplošníka a cieľových krajín za portálmi</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {BLUEPRINT_IMAGES.map((img) => (
                  <div
                    key={img.src}
                    className="rounded-lg overflow-hidden bg-slate-900 border border-white/10 flex flex-col"
                  >
                    {!failedImages[img.src] ? (
                      <img
                        src={img.src}
                        alt={img.label}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setFailedImages((prev) => ({ ...prev, [img.src]: true }))
                        }
                        className="w-full h-28 object-cover bg-slate-950"
                      />
                    ) : (
                      <div className="w-full h-28 bg-slate-900 flex items-center justify-center text-xs text-slate-400 px-2 text-center">
                        {img.label}
                      </div>
                    )}
                    <div className="px-2.5 py-1.5 text-[11px] text-slate-300 truncate">
                      {img.label}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {WORLD_PREVIEW_IMAGES.map((w) => (
                  <button
                    key={w.level}
                    type="button"
                    onClick={() => {
                      setHangarOpen(false);
                      onSelectLevel(w.level);
                    }}
                    className="rounded-lg overflow-hidden bg-slate-900 border border-white/10 hover:border-amber-400/60 transition-colors flex flex-col text-left cursor-pointer"
                  >
                    {!failedImages[w.src] ? (
                      <img
                        src={w.src}
                        alt={w.title}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setFailedImages((prev) => ({ ...prev, [w.src]: true }))
                        }
                        className="w-full h-24 object-cover bg-slate-950"
                      />
                    ) : (
                      <div className="w-full h-24 bg-slate-900 flex items-center justify-center text-xs text-slate-400 px-2 text-center">
                        {w.title}
                      </div>
                    )}
                    <div className="px-2.5 py-1.5 text-[11px] font-medium text-slate-200 truncate">
                      {w.title}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
