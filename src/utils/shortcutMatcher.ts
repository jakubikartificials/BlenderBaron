export interface ShortcutProgressState {
  modalPrefix: 'r' | 'g' | 's' | 'e' | null;
  modalTimestamp: number;
  shiftHeld: boolean;
  heldKeys: Set<string>;
}

export function createInitialShortcutState(): ShortcutProgressState {
  return {
    modalPrefix: null,
    modalTimestamp: 0,
    shiftHeld: false,
    heldKeys: new Set<string>(),
  };
}

function normalizeLetterKey(e: KeyboardEvent): string {
  const k = e.key.toLowerCase();
  if (k.length === 1 && k >= 'a' && k <= 'z') {
    return k;
  }
  // Fallback to physical code if Shift/Caps/Dead key altered e.key on non-US layouts
  if (e.code.startsWith('Key') && e.code.length === 4) {
    const codeChar = e.code.slice(3).toLowerCase();
    // Respect QWERTZ swap only when e.key wasn't a standard letter
    return codeChar;
  }
  return k;
}

function isDigit123(e: KeyboardEvent): boolean {
  if (e.key === '1' || e.key === '2' || e.key === '3') return true;
  if (
    e.code === 'Digit1' ||
    e.code === 'Digit2' ||
    e.code === 'Digit3' ||
    e.code === 'Numpad1' ||
    e.code === 'Numpad2' ||
    e.code === 'Numpad3'
  ) {
    return true;
  }
  // Slovak QWERTZ unshifted number row characters (+ = 1, ľ = 2, š = 3)
  const lower = e.key.toLowerCase();
  return lower === '+' || lower === 'ľ' || lower === 'š';
}

export interface ShortcutEvalResult {
  completed: boolean;
  stepAdvanced: boolean;
  activeTokenIndices: number[];
}

export function evaluateTaskKeyDown(
  taskId: number,
  e: KeyboardEvent,
  state: ShortcutProgressState,
  now: number
): ShortcutEvalResult {
  // Expire stale modal prefix after 5 seconds
  if (state.modalPrefix && now - state.modalTimestamp > 5000) {
    state.modalPrefix = null;
  }

  state.shiftHeld = e.shiftKey || e.key === 'Shift';
  const letter = normalizeLetterKey(e);
  if (letter.length === 1) {
    state.heldKeys.add(letter);
  }

  // Prevent browser Tab / Escape / Space / Arrow scrolling side-effects during gameplay
  if (
    e.key === 'Tab' ||
    e.code === 'Tab' ||
    e.key === 'Escape' ||
    e.code === 'Escape' ||
    e.key.startsWith('Arrow')
  ) {
    e.preventDefault();
  }

  switch (taskId) {
    // Level 1
    case 1: {
      // Shift + D
      if (state.shiftHeld && letter === 'd') {
        return { completed: true, stepAdvanced: false, activeTokenIndices: [0, 1] };
      }
      if (state.shiftHeld) {
        return { completed: false, stepAdvanced: true, activeTokenIndices: [0] };
      }
      return { completed: false, stepAdvanced: false, activeTokenIndices: [] };
    }

    case 2: {
      // R
      if (!state.shiftHeld && letter === 'r') {
        return { completed: true, stepAdvanced: false, activeTokenIndices: [0] };
      }
      return { completed: false, stepAdvanced: false, activeTokenIndices: [] };
    }

    case 3: {
      // G
      if (!state.shiftHeld && letter === 'g') {
        return { completed: true, stepAdvanced: false, activeTokenIndices: [0] };
      }
      return { completed: false, stepAdvanced: false, activeTokenIndices: [] };
    }

    case 4: {
      // S
      if (!state.shiftHeld && letter === 's') {
        return { completed: true, stepAdvanced: false, activeTokenIndices: [0] };
      }
      return { completed: false, stepAdvanced: false, activeTokenIndices: [] };
    }

    // Level 2
    case 5: {
      // Esc
      if (e.key === 'Escape' || e.code === 'Escape') {
        return { completed: true, stepAdvanced: false, activeTokenIndices: [0] };
      }
      return { completed: false, stepAdvanced: false, activeTokenIndices: [] };
    }

    case 6: {
      // R + X (modal R -> X or simultaneous R + X)
      if (letter === 'r') {
        state.modalPrefix = 'r';
        state.modalTimestamp = now;
        return { completed: false, stepAdvanced: true, activeTokenIndices: [0] };
      }
      if (letter === 'x' && (state.modalPrefix === 'r' || state.heldKeys.has('r'))) {
        state.modalPrefix = null;
        return { completed: true, stepAdvanced: false, activeTokenIndices: [0, 1] };
      }
      return {
        completed: false,
        stepAdvanced: false,
        activeTokenIndices: state.modalPrefix === 'r' ? [0] : [],
      };
    }

    case 7: {
      // G + Z (modal G -> Z or simultaneous G + Z)
      if (letter === 'g') {
        state.modalPrefix = 'g';
        state.modalTimestamp = now;
        return { completed: false, stepAdvanced: true, activeTokenIndices: [0] };
      }
      if (letter === 'z' && (state.modalPrefix === 'g' || state.heldKeys.has('g'))) {
        state.modalPrefix = null;
        return { completed: true, stepAdvanced: false, activeTokenIndices: [0, 1] };
      }
      return {
        completed: false,
        stepAdvanced: false,
        activeTokenIndices: state.modalPrefix === 'g' ? [0] : [],
      };
    }

    case 8: {
      // S + Shift + Z, S + Shift + X, or S + Shift + Y
      if (letter === 's') {
        state.modalPrefix = 's';
        state.modalTimestamp = now;
        return {
          completed: false,
          stepAdvanced: true,
          activeTokenIndices: state.shiftHeld ? [0, 1] : [0],
        };
      }
      const hasS = state.modalPrefix === 's' || state.heldKeys.has('s');
      if (hasS && state.shiftHeld && (letter === 'z' || letter === 'x' || letter === 'y')) {
        state.modalPrefix = null;
        return { completed: true, stepAdvanced: false, activeTokenIndices: [0, 1, 2] };
      }
      if (hasS) {
        return {
          completed: false,
          stepAdvanced: e.key === 'Shift',
          activeTokenIndices: state.shiftHeld ? [0, 1] : [0],
        };
      }
      return { completed: false, stepAdvanced: false, activeTokenIndices: [] };
    }

    // Level 3
    case 9: {
      // Tab
      if (e.key === 'Tab' || e.code === 'Tab') {
        return { completed: true, stepAdvanced: false, activeTokenIndices: [0] };
      }
      return { completed: false, stepAdvanced: false, activeTokenIndices: [] };
    }

    case 10: {
      // X
      if (letter === 'x') {
        return { completed: true, stepAdvanced: false, activeTokenIndices: [0] };
      }
      return { completed: false, stepAdvanced: false, activeTokenIndices: [] };
    }

    case 11: {
      // E + X (modal E -> X or simultaneous E + X)
      if (letter === 'e') {
        state.modalPrefix = 'e';
        state.modalTimestamp = now;
        return { completed: false, stepAdvanced: true, activeTokenIndices: [0] };
      }
      if (letter === 'x' && (state.modalPrefix === 'e' || state.heldKeys.has('e'))) {
        state.modalPrefix = null;
        return { completed: true, stepAdvanced: false, activeTokenIndices: [0, 1] };
      }
      return {
        completed: false,
        stepAdvanced: false,
        activeTokenIndices: state.modalPrefix === 'e' ? [0] : [],
      };
    }

    case 12: {
      // Shift + V
      if (state.shiftHeld && letter === 'v') {
        return { completed: true, stepAdvanced: false, activeTokenIndices: [0, 1] };
      }
      if (state.shiftHeld) {
        return { completed: false, stepAdvanced: true, activeTokenIndices: [0] };
      }
      return { completed: false, stepAdvanced: false, activeTokenIndices: [] };
    }

    // Level 4
    case 13: {
      // L
      if (letter === 'l') {
        return { completed: true, stepAdvanced: false, activeTokenIndices: [0] };
      }
      return { completed: false, stepAdvanced: false, activeTokenIndices: [] };
    }

    case 14: {
      // 1, 2, or 3
      if (isDigit123(e)) {
        return { completed: true, stepAdvanced: false, activeTokenIndices: [0] };
      }
      return { completed: false, stepAdvanced: false, activeTokenIndices: [] };
    }

    case 15: {
      // M
      if (letter === 'm') {
        return { completed: true, stepAdvanced: false, activeTokenIndices: [0] };
      }
      return { completed: false, stepAdvanced: false, activeTokenIndices: [] };
    }

    case 16: {
      // K
      if (letter === 'k') {
        return { completed: true, stepAdvanced: false, activeTokenIndices: [0] };
      }
      return { completed: false, stepAdvanced: false, activeTokenIndices: [] };
    }

    default:
      return { completed: false, stepAdvanced: false, activeTokenIndices: [] };
  }
}

export function handleShortcutKeyUp(e: KeyboardEvent, state: ShortcutProgressState): number[] {
  state.shiftHeld = e.shiftKey;
  const letter = normalizeLetterKey(e);
  state.heldKeys.delete(letter);

  if (state.modalPrefix) {
    return state.shiftHeld ? [0, 1] : [0];
  }
  if (state.shiftHeld) {
    return [0];
  }
  return [];
}
