import React, { useEffect, useState } from 'react';
import {
  Compass,
  Keyboard,
  Maximize,
  Minimize,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Wrench,
  X,
} from 'lucide-react';
import { FINALE_WORLD, LEVELS, RepairTask, TelemetryData } from '../types/game';

interface HudOverlayProps {
  currentLevel: number;
  completedTasksInLevel: number;
  totalCompletedCount: number;
  activeTask: RepairTask | null;
  activeTokenIndices: number[];
  telemetry: TelemetryData;
  isMuted: boolean;
  gameStarted: boolean;
  transitionBanner: string | null;
  portalBlockedBanner: boolean;
  onStartGame: () => void;
  onManualCompleteActiveTask: () => void;
  onSelectLevel: (level: number) => void;
  onResetGame: () => void;
  onToggleMute: () => void;
}

export const HudOverlay: React.FC<HudOverlayProps> = ({
  currentLevel,
  completedTasksInLevel,
  activeTask,
  activeTokenIndices,
  telemetry,
  isMuted,
  gameStarted,
  transitionBanner,
  portalBlockedBanner,
  onStartGame,
  onManualCompleteActiveTask,
  onSelectLevel,
  onResetGame,
  onToggleMute,
}) => {
  const [hangarOpen, setHangarOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const isFinale = currentLevel > LEVELS.length;
  const levelConfig = !isFinale ? LEVELS[currentLevel - 1] : null;
  const worldName = levelConfig ? levelConfig.name : FINALE_WORLD.name;

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between">
      {/* TOP BAR: Bez prepínania levelov (len brand, hangár a reštart) */}
      <header className="pointer-events-auto flex items-center justify-between gap-6 px-6 py-3.5 bg-[#0b0f17]/92 border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="font-display text-lg font-bold tracking-wide text-white whitespace-nowrap">
            Blender Baron
          </span>
          <span className="text-slate-500 font-light">|</span>
          <span className="text-xs text-amber-400 font-medium whitespace-nowrap">
            {isFinale ? FINALE_WORLD.name : `Level ${currentLevel}: ${worldName}`}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setHangarOpen((prev) => !prev)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
              hangarOpen
                ? 'bg-amber-400 text-slate-950 border-amber-400'
                : 'bg-slate-800/80 text-slate-200 border-white/15 hover:bg-slate-700'
            }`}
          >
            Hangár a skratky
          </button>
          <button
            type="button"
            onClick={onResetGame}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 rounded-lg hover:bg-amber-300 transition-colors whitespace-nowrap cursor-pointer"
          >
            Reštartovať
          </button>
        </div>
      </header>

      {/* TOP NOTIFICATIONS (Prelet portálom / Upozornenie na zamknutý portál) */}
      <div className="flex flex-col items-center px-4 pt-3">
        {transitionBanner && (
          <div className="mb-2 px-5 py-2 rounded-lg bg-[#0b0f17]/94 border border-sky-400/40 text-sky-200 text-sm font-medium shadow-lg animate-in fade-in duration-200">
            {transitionBanner}
          </div>
        )}

        {portalBlockedBanner && (
          <div className="mb-2 px-5 py-2 rounded-lg bg-[#1c120c]/95 border border-amber-400/50 text-amber-200 text-sm font-medium shadow-lg animate-in fade-in duration-200">
            Portál je uzamknutý — najprv oprav lietadlo dokončením všetkých 4 úloh!
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
              Vychutnaj si voľný víťazný let alebo začni znova od Levelu 1.
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

      {/* BOTTOM AREA: ĽAVÝ DOLNÝ ROH (Porucha lietadla) + PRAVÝ DOLNÝ ROH (Telemetria, Ovládanie, Zvuk, Fullscreen) */}
      <div className="flex items-end justify-between p-4 sm:p-5 gap-4">
        {/* ĽAVÝ DOLNÝ ROH: HLÁSENIE O PORUCHE LIETADLA */}
        <div className="pointer-events-auto max-w-sm sm:max-w-md w-full">
          {gameStarted && !isFinale && activeTask && (
            <div
              role="region"
              aria-live="polite"
              className="rounded-xl bg-[#0e131d]/95 border border-amber-500/50 p-4 shadow-2xl animate-in slide-in-from-bottom-3 duration-200"
            >
              <div className="flex items-center justify-between gap-3 text-xs text-amber-300/90 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="font-semibold">Porucha lietadla — klesanie!</span>
                </div>
                <span className="tabular-nums text-slate-400">
                  Úloha {completedTasksInLevel + 1} z 4
                </span>
              </div>

              <h2 className="font-display text-base font-bold text-white tracking-wide">
                {activeTask.title}
              </h2>
              <p className="text-xs text-slate-300 mt-1 mb-3">
                {activeTask.repairStory}
              </p>

              {/* Tlačidlo / Klávesy pre opravu */}
              <button
                type="button"
                onClick={onManualCompleteActiveTask}
                title="Stlač klávesovú skratku na klávesnici (alebo klikni tu)"
                className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-900 border border-amber-400/50 hover:border-amber-300 hover:bg-slate-800 transition-colors cursor-pointer group"
              >
                <span className="text-[11px] text-slate-400 group-hover:text-slate-200 text-left">
                  {activeTask.altShortcutsLabel || 'Stlač na klávesnici:'}
                </span>

                <div className="flex items-center gap-1 shrink-0">
                  {activeTask.keyTokens.map((token, idx) => {
                    const isPressed = activeTokenIndices.includes(idx);
                    return (
                      <React.Fragment key={token}>
                        {idx > 0 && (
                          <span className="text-xs font-bold text-slate-400">+</span>
                        )}
                        <kbd
                          className={`font-mono-tech px-2.5 py-1 rounded text-xs font-bold border transition-transform ${
                            isPressed
                              ? 'bg-emerald-500 text-slate-950 border-emerald-300 scale-95'
                              : 'bg-slate-800 text-amber-300 border-amber-400/40'
                          }`}
                        >
                          {token}
                        </kbd>
                      </React.Fragment>
                    );
                  })}
                </div>
              </button>
            </div>
          )}

          {gameStarted && !isFinale && !activeTask && completedTasksInLevel >= 4 && (
            <div className="rounded-xl bg-[#0b1616]/95 border border-emerald-400/50 p-4 shadow-xl text-left">
              <div className="text-xs text-emerald-300 font-semibold mb-0.5">
                Všetky 4 opravy dokončené (4/4)
              </div>
              <p className="font-display text-sm font-bold text-white">
                Lietadlo opravené — preleť cez kruhový portál!
              </p>
            </div>
          )}
        </div>

        {/* PRAVÝ DOLNÝ ROH: LEN VÝŠKA, RÝCHLOSŤ, VZDIALENOSŤ, OVLÁDANIE, ZVUK A FULLSCREEN */}
        <div className="pointer-events-auto shrink-0 flex items-center gap-4 bg-[#0d121b]/95 border border-white/15 px-4 py-3 rounded-xl shadow-2xl">
          <div className="flex items-center gap-4 text-xs">
            <div>
              <div className="text-slate-400 text-[11px]">Výška</div>
              <div
                className={`font-mono-tech text-sm font-bold tabular-nums ${
                  telemetry.isFalling ? 'text-amber-400 animate-pulse' : 'text-white'
                }`}
              >
                {telemetry.altitude} m
              </div>
            </div>
            <div>
              <div className="text-slate-400 text-[11px]">Rýchlosť</div>
              <div className="font-mono-tech text-sm font-bold text-white tabular-nums">
                {telemetry.airspeed} km/h
              </div>
            </div>
            <div>
              <div className="text-slate-400 text-[11px]">Portál</div>
              <div
                className={`font-mono-tech text-sm font-bold tabular-nums ${
                  telemetry.portalUnlocked ? 'text-emerald-400' : 'text-slate-300'
                }`}
              >
                {telemetry.distanceToPortal} m
              </div>
            </div>
          </div>

          <div className="h-7 w-[1px] bg-white/10 hidden sm:block" />

          {/* Ovládanie letu */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-300">
            <Compass className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="font-mono-tech text-slate-200">↑ ↓ ← →</span>
            <span className="text-slate-400">Let</span>
          </div>

          <div className="h-7 w-[1px] bg-white/10" />

          {/* Zvuk */}
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={isMuted ? 'Zapnúť zvuk motora' : 'Stlmiť zvuk motora'}
            title={isMuted ? 'Zapnúť zvuk' : 'Stlmiť zvuk'}
            className="p-2 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-white/10 transition-colors cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Fullscreen */}
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Ukončiť celú obrazovku' : 'Zapnúť celú obrazovku'}
            title={isFullscreen ? 'Ukončiť celú obrazovku (Esc)' : 'Celá obrazovka'}
            className="p-2 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-white/10 transition-colors cursor-pointer"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ÚVODNÁ ŠTART OBRAZOVKA (Start Screen) */}
      {!gameStarted && (
        <div className="fixed inset-0 z-40 pointer-events-auto bg-slate-950/85 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-2xl bg-[#0e131d] border border-white/15 p-6 sm:p-8 shadow-2xl text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-semibold mb-3">
              3D letecký trenažér klávesových skratiek Blenderu
            </div>

            <h1 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-wide mb-2">
              Blender Baron
            </h1>
            <p className="text-sm text-slate-300 max-w-md mx-auto mb-6">
              Lietaj dvojplošníkom cez kruhové portály do 4 rôznych svetov. Počas letu sa lietadlo kazí — zachráň ho stlačením správnych skratiek z Blenderu skôr, než dopadne na zem!
            </p>

            {/* Inštrukcie v kocke */}
            <div className="grid grid-cols-2 gap-3 mb-6 text-left text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-white/10">
                <div className="flex items-center gap-1.5 text-amber-400 font-semibold mb-1">
                  <Compass className="w-4 h-4" />
                  Riadenie letu
                </div>
                <div className="text-slate-300">
                  Šípky <kbd className="font-mono bg-slate-800 px-1.5 py-0.5 rounded border border-white/15 text-white">↑</kbd> <kbd className="font-mono bg-slate-800 px-1.5 py-0.5 rounded border border-white/15 text-white">↓</kbd> <kbd className="font-mono bg-slate-800 px-1.5 py-0.5 rounded border border-white/15 text-white">←</kbd> <kbd className="font-mono bg-slate-800 px-1.5 py-0.5 rounded border border-white/15 text-white">→</kbd>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-white/10">
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mb-1">
                  <Wrench className="w-4 h-4" />
                  Oprava porúch
                </div>
                <div className="text-slate-300">
                  Skratky Blenderu (<kbd className="font-mono bg-slate-800 px-1.5 py-0.5 rounded border border-white/15 text-white">Shift+D</kbd>, <kbd className="font-mono bg-slate-800 px-1.5 py-0.5 rounded border border-white/15 text-white">R</kbd>, <kbd className="font-mono bg-slate-800 px-1.5 py-0.5 rounded border border-white/15 text-white">G</kbd>, <kbd className="font-mono bg-slate-800 px-1.5 py-0.5 rounded border border-white/15 text-white">S</kbd>...)
                </div>
              </div>
            </div>

            {/* Hlavné tlačidlo Štart letu */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={onStartGame}
                className="w-full sm:w-auto px-8 py-3.5 text-sm font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all shadow-lg hover:shadow-amber-400/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                Štart letu
              </button>
              <button
                type="button"
                onClick={() => setHangarOpen(true)}
                className="w-full sm:w-auto px-5 py-3.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-white/15 rounded-xl transition-colors cursor-pointer"
              >
                Hangár a prehľad skratiek
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HANGÁR A PREHĽAD VŠETKÝCH 16 SKRATIEK */}
      {hangarOpen && (
        <div className="fixed inset-0 z-50 pointer-events-auto bg-slate-950/88 flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-5xl max-h-[88vh] overflow-y-auto rounded-2xl bg-[#0e131d] border border-white/15 p-6 sm:p-8 shadow-2xl">
            <div className="flex items-start justify-between gap-4 pb-5 border-b border-white/10">
              <div>
                <div className="text-xs text-amber-300 mb-1">
                  Technický hangár dvojplošníka · Tréning klávesových skratiek Blender 3D
                </div>
                <h2 className="font-display text-2xl font-bold text-white">
                  Prehľad všetkých 16 opravárenských úloh v 4 leveloch
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

            {/* 4 Levels Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 my-6">
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

            {/* Schémy lietadla */}
            <div className="pt-4 border-t border-white/10">
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                <Keyboard className="w-3.5 h-3.5 text-amber-400" />
                <span>Technické pohľady modelu dvojplošníka</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg bg-slate-900 border border-white/10 p-3 flex flex-col items-center">
                  <svg viewBox="0 0 160 80" className="w-full h-20 text-slate-300">
                    <path d="M 10 20 L 80 23 L 150 20 L 150 24 L 80 27 L 10 24 Z" fill="#cbd0d8" stroke="#6f1d7e" strokeWidth="1" />
                    <path d="M 20 48 L 80 50 L 140 48 L 140 52 L 80 54 L 20 52 Z" fill="#b0b5be" />
                    <rect x="72" y="24" width="16" height="28" rx="3" fill="#9da3af" />
                    <circle cx="80" cy="38" r="9" fill="#d4d9e2" stroke="#1f2937" />
                    <line x1="80" y1="20" x2="80" y2="56" stroke="#c4a27a" strokeWidth="3" />
                    <line x1="36" y1="22" x2="36" y2="50" stroke="#1f2937" strokeWidth="2" />
                    <line x1="124" y1="22" x2="124" y2="50" stroke="#1f2937" strokeWidth="2" />
                    <line x1="74" y1="52" x2="66" y2="68" stroke="#64748b" strokeWidth="2" />
                    <line x1="86" y1="52" x2="94" y2="68" stroke="#64748b" strokeWidth="2" />
                    <circle cx="65" cy="69" r="4" fill="#18181b" />
                    <circle cx="95" cy="69" r="4" fill="#18181b" />
                  </svg>
                  <span className="text-[11px] text-slate-300 font-medium mt-1">Predný pohľad (Front)</span>
                </div>

                <div className="rounded-lg bg-slate-900 border border-white/10 p-3 flex flex-col items-center">
                  <svg viewBox="0 0 160 80" className="w-full h-20 text-slate-300">
                    <path d="M 28 36 L 50 28 L 126 32 L 138 34 L 142 36 L 126 40 L 48 42 Z" fill="#b8bcc4" />
                    <path d="M 50 28 L 126 32 L 124 35 L 49 32 Z" fill="#6f1d7e" />
                    <rect x="22" y="32" width="7" height="12" fill="#d4d9e2" />
                    <line x1="20" y1="18" x2="20" y2="58" stroke="#c4a27a" strokeWidth="3" />
                    <ellipse cx="62" cy="18" rx="10" ry="2.5" fill="#cbd0d8" />
                    <ellipse cx="62" cy="46" rx="9" ry="2.5" fill="#b0b5be" />
                    <line x1="62" y1="18" x2="62" y2="46" stroke="#1f2937" strokeWidth="2" />
                    <circle cx="78" cy="24" r="4" fill="#cfa98a" />
                    <path d="M 126 32 L 140 18 L 144 19 L 142 35 Z" fill="#cbd0d8" stroke="#6f1d7e" strokeWidth="1" />
                    <line x1="56" y1="42" x2="52" y2="64" stroke="#64748b" strokeWidth="2" />
                    <circle cx="51" cy="66" r="5" fill="#18181b" />
                  </svg>
                  <span className="text-[11px] text-slate-300 font-medium mt-1">Bočný pohľad (Side)</span>
                </div>

                <div className="rounded-lg bg-slate-900 border border-white/10 p-3 flex flex-col items-center">
                  <svg viewBox="0 0 160 80" className="w-full h-20 text-slate-300">
                    <path d="M 15 26 L 80 28 L 145 26 C 150 26, 150 44, 145 44 L 80 42 L 15 44 C 10 44, 10 26, 15 26 Z" fill="#cbd0d8" />
                    <path d="M 74 12 L 86 12 L 86 64 L 80 72 L 74 64 Z" fill="#b8bcc4" />
                    <rect x="75" y="32" width="10" height="8" rx="2" fill="#4e2e18" />
                    <path d="M 60 62 L 100 62 L 96 70 L 64 70 Z" fill="#cbd0d8" stroke="#6f1d7e" strokeWidth="1" />
                    <line x1="68" y1="10" x2="92" y2="10" stroke="#c4a27a" strokeWidth="3" />
                  </svg>
                  <span className="text-[11px] text-slate-300 font-medium mt-1">Horný pohľad (Top)</span>
                </div>

                <div className="rounded-lg bg-slate-900 border border-white/10 p-3 flex flex-col items-center">
                  <svg viewBox="0 0 160 80" className="w-full h-20 text-slate-300">
                    <polygon points="80,14 135,32 80,68 25,32" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3" />
                    <line x1="80" y1="14" x2="80" y2="68" stroke="#2890ff" strokeWidth="2" />
                    <line x1="25" y1="32" x2="135" y2="32" stroke="#ff3352" strokeWidth="2" />
                    <circle cx="80" cy="40" r="16" fill="none" stroke="#8bdc00" strokeWidth="2" />
                    <text x="138" y="35" fill="#ff3352" fontSize="9" fontWeight="bold">X</text>
                    <text x="83" y="12" fill="#2890ff" fontSize="9" fontWeight="bold">Z</text>
                  </svg>
                  <span className="text-[11px] text-slate-300 font-medium mt-1">Osový Gizmo</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
