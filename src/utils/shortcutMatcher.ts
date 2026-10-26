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
  if (e.code.startsWith('Key') && e.code.length === 4) {
    return e.code.slice(3).toLowerCase();
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
  if (state.modalPrefix && now - state.modalTimestamp > 5000) {
    state.modalPrefix = null;
  }

  state.shiftHeld = e.shiftKey || e.key === 'Shift';
  const letter = normalizeLetterKey(e);
  if (letter.length === 1) {
    state.heldKeys.add(letter);
  }

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
    case 1: {
      if (state.shiftHeld && letter === 'd') {
        return { completed: true, stepAdvanced: false, activeTokenIndices: [0, 1] };
      }
      if (state.shiftHeld) {
        return { completed: false, stepAdvanced: true, activeTokenIndices: [0] };
      }
      return { completed: false, stepAdvanced: false, activeTokenIndices: [] };
    }

    case 2: {
      if (!state.shiftHeld && letter === 'r') {
        return { completed: true, stepAdvanced: false, activeTokenIndices: [0] };
      }
      return { completed: false, stepAdvanced: false, activeTokenIndices: [] };
    }

    case 3: {
      if (!state.shiftHeld && letter === 'g') {
        return { completed: true, stepAdvanced: false, activeTokenIndices: [0] };
      }
      return { completed: false, stepAdvanced: false, activeTokenIndices: [] };
    }

    case 4: {
      if (!state.shiftHeld && letter === 's') {
        return { completed: true, stepAdvanced: false, activeTokenIndices: [0] };
      }
      return { completed: false, stepAdvanced: false, activeTokenIndices: [] };
    }

    case 5: {
      if (e.key === 'Escape' || e.code === 'Escape') {
        return { completed: true, stepAdvanced: false, activeTokenIndices: [0] };
      }
      return { completed: false, stepAdvanced: false, activeTokenIndices: [] };
    }

    case 6: {
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

    case 9: {
      if (e.key === 'Tab' || e.code === 'Tab') {
        return { completed: true, stepAdvanced: false, activeTokenIndices: [0] };
      }
      return { completed: false, stepAdvanced: false, activeTokenIndices: [] };
    }

    case 10: {
      if (letter === 'x') {
        return { completed: true, stepAdvanced: false, activeTokenIndices: [0] };
      }
      return { completed: false, stepAdvanced: false, activeTokenIndices: [] };
    }

    case 11: {
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
      if (state.shiftHeld && letter === 'v') {
        return { completed: true, stepAdvanced: false, activeTokenIndices: [0, 1] };
      }
      if (state.shiftHeld) {
        return { completed: false, stepAdvanced: true, activeTokenIndices: [0] };
      }
      return { completed: false, stepAdvanced: false, activeTokenIndices: [] };
    }

    case 13: {
      if (letter === 'l') {
        return { completed: true, stepAdvanced: false, activeTokenIndices: [0] };
      }
      return { completed: false, stepAdvanced: false, activeTokenIndices: [] };
    }

    case 14: {
      if (isDigit123(e)) {
        return { completed: true, stepAdvanced: false, activeTokenIndices: [0] };
      }
      return { completed: false, stepAdvanced: false, activeTokenIndices: [] };
    }

    case 15: {
      if (letter === 'm') {
        return { completed: true, stepAdvanced: false, activeTokenIndices: [0] };
      }
      return { completed: false, stepAdvanced: false, activeTokenIndices: [] };
    }

    case 16: {
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
