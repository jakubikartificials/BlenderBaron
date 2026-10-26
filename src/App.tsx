import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { HudOverlay } from './components/HudOverlay';
import {
  FINALE_WORLD,
  LEVELS,
  RepairTask,
  RepairVisualType,
  TelemetryData,
} from './types/game';
import {
  createInitialShortcutState,
  evaluateTaskKeyDown,
  handleShortcutKeyUp,
} from './utils/shortcutMatcher';
import { soundEngine } from './audio/soundEngine';

export function App() {
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [completedTasksInLevel, setCompletedTasksInLevel] = useState<number>(0);
  const [solvedTaskIds, setSolvedTaskIds] = useState<Set<number>>(() => new Set());
  const [isMalfunctioning, setIsMalfunctioning] = useState<boolean>(false);
  const [activeTokenIndices, setActiveTokenIndices] = useState<number[]>([]);
  const [lastCompletedVisual, setLastCompletedVisual] = useState<RepairVisualType | null>(null);
  const [repairPulseCount, setRepairPulseCount] = useState<number>(0);
  const [resetSignal, setResetSignal] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [transitionBanner, setTransitionBanner] = useState<string | null>(
    'Level 1: Slnečné štíty — použi šípky pre let a klávesové skratky Blenderu na opravu lietadla!'
  );
  const [portalBlockedBanner, setPortalBlockedBanner] = useState<boolean>(false);

  const [telemetry, setTelemetry] = useState<TelemetryData>({
    altitude: 340,
    airspeed: 154,
    distanceToPortal: 475,
    portalUnlocked: false,
    isFalling: false,
    hullIntegrity: 100,
  });

  const shortcutStateRef = useRef(createInitialShortcutState());
  const bannerTimeoutRef = useRef<number | null>(null);
  const blockedTimeoutRef = useRef<number | null>(null);

  const showTemporaryBanner = useCallback((msg: string, durationMs = 4200) => {
    setTransitionBanner(msg);
    if (bannerTimeoutRef.current) {
      window.clearTimeout(bannerTimeoutRef.current);
    }
    bannerTimeoutRef.current = window.setTimeout(() => {
      setTransitionBanner(null);
    }, durationMs);
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setTransitionBanner(null);
    }, 5000);
    bannerTimeoutRef.current = id;
    return () => {
      window.clearTimeout(id);
      if (blockedTimeoutRef.current) window.clearTimeout(blockedTimeoutRef.current);
      soundEngine.dispose();
    };
  }, []);

  const currentLevelConfig =
    currentLevel >= 1 && currentLevel <= LEVELS.length ? LEVELS[currentLevel - 1] : null;

  const activeTask: RepairTask | null =
    currentLevelConfig && isMalfunctioning && completedTasksInLevel < 4
      ? currentLevelConfig.tasks[completedTasksInLevel]
      : null;

  const completeCurrentTask = useCallback(() => {
    if (!currentLevelConfig || completedTasksInLevel >= 4) return;
    const finishedTask = currentLevelConfig.tasks[completedTasksInLevel];
    if (!finishedTask) return;

    soundEngine.playRepairSuccess();
    shortcutStateRef.current = createInitialShortcutState();
    setActiveTokenIndices([]);
    setLastCompletedVisual(finishedTask.visualType);
    setIsMalfunctioning(false);
    setRepairPulseCount((c) => c + 1);
    setPortalBlockedBanner(false);

    setSolvedTaskIds((prev) => {
      const next = new Set(prev);
      next.add(finishedTask.id);
      return next;
    });

    const nextCount = completedTasksInLevel + 1;
    setCompletedTasksInLevel(nextCount);

    if (nextCount >= 4) {
      showTemporaryBanner(
        `Všetky 4 opravy v Leveli ${currentLevel} dokončené! Kruhový portál je otvorený.`,
        4500
      );
    }
  }, [completedTasksInLevel, currentLevel, currentLevelConfig, showTemporaryBanner]);

  // Global Keyboard Listener for Blender Repair Tasks
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!activeTask) return;
      soundEngine.initFlightAudio();

      const res = evaluateTaskKeyDown(
        activeTask.id,
        e,
        shortcutStateRef.current,
        performance.now()
      );

      setActiveTokenIndices(res.activeTokenIndices);

      if (res.completed) {
        completeCurrentTask();
      } else if (res.stepAdvanced && !e.repeat) {
        soundEngine.playKeyStep();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (!activeTask) return;
      const remaining = handleShortcutKeyUp(e, shortcutStateRef.current);
      setActiveTokenIndices(remaining);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [activeTask, completeCurrentTask]);

  const handleTriggerMalfunction = useCallback(() => {
    if (currentLevel > LEVELS.length) return;
    if (completedTasksInLevel >= 4) return;
    shortcutStateRef.current = createInitialShortcutState();
    setActiveTokenIndices([]);
    setIsMalfunctioning(true);
    soundEngine.playMalfunctionAlert();
  }, [completedTasksInLevel, currentLevel]);

  const handlePortalEntered = useCallback(() => {
    shortcutStateRef.current = createInitialShortcutState();
    setActiveTokenIndices([]);
    setIsMalfunctioning(false);
    setPortalBlockedBanner(false);

    if (currentLevel < LEVELS.length) {
      const nextLvl = currentLevel + 1;
      const nextCfg = LEVELS[nextLvl - 1];
      setCurrentLevel(nextLvl);
      setCompletedTasksInLevel(0);
      showTemporaryBanner(
        `Prelet portálom úspešný · Level ${nextLvl}: ${nextCfg.name}`,
        4500
      );
    } else if (currentLevel === LEVELS.length) {
      setCurrentLevel(LEVELS.length + 1);
      setCompletedTasksInLevel(4);
      showTemporaryBanner(
        `Portál prekonaný · Vitaj v cieli: ${FINALE_WORLD.name}!`,
        5500
      );
    } else {
      // In Finale free-flight, flying through the portal loops cleanly for endless sightseeing
      setResetSignal((s) => s + 1);
      showTemporaryBanner('Prelet víťazným portálom · Voľný let pokračuje!', 3200);
    }
  }, [currentLevel, showTemporaryBanner]);

  const handleSelectLevel = useCallback(
    (lvl: number) => {
      shortcutStateRef.current = createInitialShortcutState();
      setActiveTokenIndices([]);
      setIsMalfunctioning(false);
      setCompletedTasksInLevel(0);
      setPortalBlockedBanner(false);
      setCurrentLevel(lvl);
      setResetSignal((s) => s + 1);
      const cfg = LEVELS[lvl - 1];
      if (cfg) {
        showTemporaryBanner(`Presun do sveta · Level ${lvl}: ${cfg.name}`, 3600);
      }
    },
    [showTemporaryBanner]
  );

  const handleResetGame = useCallback(() => {
    shortcutStateRef.current = createInitialShortcutState();
    setActiveTokenIndices([]);
    setIsMalfunctioning(false);
    setCompletedTasksInLevel(0);
    setSolvedTaskIds(new Set());
    setPortalBlockedBanner(false);
    setCurrentLevel(1);
    setResetSignal((s) => s + 1);
    showTemporaryBanner('Nový let spustený · Level 1: Slnečné štíty', 3800);
  }, [showTemporaryBanner]);

  const handleToggleMute = useCallback(() => {
    const nextMuted = !soundEngine.isMuted();
    soundEngine.setMuted(nextMuted);
    setIsMuted(nextMuted);
  }, []);

  const handlePortalBlockedNotice = useCallback(() => {
    setPortalBlockedBanner(true);
    if (blockedTimeoutRef.current) {
      window.clearTimeout(blockedTimeoutRef.current);
    }
    blockedTimeoutRef.current = window.setTimeout(() => {
      setPortalBlockedBanner(false);
    }, 3200);
  }, []);

  return (
    <main className="relative w-full h-full overflow-hidden bg-slate-950">
      <GameCanvas
        currentLevel={currentLevel}
        completedTasksInLevel={completedTasksInLevel}
        isMalfunctioning={isMalfunctioning}
        activeVisualType={activeTask ? activeTask.visualType : null}
        lastCompletedVisual={lastCompletedVisual}
        repairPulseCount={repairPulseCount}
        resetSignal={resetSignal}
        onPortalEntered={handlePortalEntered}
        onTriggerMalfunction={handleTriggerMalfunction}
        onTelemetryUpdate={setTelemetry}
        onPortalBlockedNotice={handlePortalBlockedNotice}
      />

      <HudOverlay
        currentLevel={currentLevel}
        completedTasksInLevel={completedTasksInLevel}
        totalCompletedCount={solvedTaskIds.size}
        activeTask={activeTask}
        activeTokenIndices={activeTokenIndices}
        telemetry={telemetry}
        isMuted={isMuted}
        transitionBanner={transitionBanner}
        portalBlockedBanner={portalBlockedBanner}
        onManualCompleteActiveTask={completeCurrentTask}
        onSelectLevel={handleSelectLevel}
        onResetGame={handleResetGame}
        onToggleMute={handleToggleMute}
      />
    </main>
  );
}

export default App;
