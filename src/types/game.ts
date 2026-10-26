export enum EnvironmentStyle {
  SUNLIT_PEAKS = 'SUNLIT_PEAKS',
  SYNTH_DUNES = 'SYNTH_DUNES',
  CUBIC_METROPOLIS = 'CUBIC_METROPOLIS',
  FRACTURED_CANYON = 'FRACTURED_CANYON',
  GOLDEN_SANCTUARY = 'GOLDEN_SANCTUARY',
}

export enum RepairVisualType {
  DUPLICATE_STRUT = 'DUPLICATE_STRUT',
  ROTATE_PROP = 'ROTATE_PROP',
  GRAB_ENGINE = 'GRAB_ENGINE',
  SCALE_WINGS = 'SCALE_WINGS',
  CANCEL_GLITCH = 'CANCEL_GLITCH',
  ROTATE_X = 'ROTATE_X',
  GRAB_Z = 'GRAB_Z',
  SCALE_PLANE = 'SCALE_PLANE',
  EDIT_MODE = 'EDIT_MODE',
  DELETE_DEBRIS = 'DELETE_DEBRIS',
  EXTRUDE_X = 'EXTRUDE_X',
  SLIDE_VERTEX = 'SLIDE_VERTEX',
  SELECT_LINKED = 'SELECT_LINKED',
  SELECT_ELEMENTS = 'SELECT_ELEMENTS',
  MERGE_VERTICES = 'MERGE_VERTICES',
  KNIFE_CUT = 'KNIFE_CUT',
}

export interface RepairTask {
  id: number;
  level: number;
  title: string;
  blenderFunction: string;
  repairStory: string;
  shortcutLabel: string;
  keyTokens: string[];
  altShortcutsLabel?: string;
  visualType: RepairVisualType;
}

export interface LevelConfig {
  level: number;
  name: string;
  subtitle: string;
  style: EnvironmentStyle;
  skyTopColor: string;
  skyHorizonColor: string;
  fogColor: string;
  portalColor: string;
  portalSecondaryColor: string;
  tasks: RepairTask[];
}

export interface TelemetryData {
  altitude: number;
  airspeed: number;
  distanceToPortal: number;
  portalUnlocked: boolean;
  isFalling: boolean;
  hullIntegrity: number;
}

export const LEVELS: LevelConfig[] = [
  {
    level: 1,
    name: 'Slnečné štíty',
    subtitle: 'Základné transformácie objektov',
    style: EnvironmentStyle.SUNLIT_PEAKS,
    skyTopColor: '#1e3a5f',
    skyHorizonColor: '#f59e0b',
    fogColor: '#e09f5a',
    portalColor: '#38bdf8',
    portalSecondaryColor: '#fbbf24',
    tasks: [
      {
        id: 1,
        level: 1,
        title: 'Úloha 1 (Duplikovanie objektu)',
        blenderFunction: 'Duplikovať objekt',
        repairStory: 'Pravá vzpera krídla odpadla — duplikuj ľavú vzperu!',
        shortcutLabel: 'Shift + D',
        keyTokens: ['Shift', 'D'],
        visualType: RepairVisualType.DUPLICATE_STRUT,
      },
      {
        id: 2,
        level: 1,
        title: 'Úloha 2 (Rotácia)',
        blenderFunction: 'Rotácia objektu',
        repairStory: 'Kormidlo sa zaseklo nakrivo — vyrovnaj jeho rotáciu!',
        shortcutLabel: 'R',
        keyTokens: ['R'],
        visualType: RepairVisualType.ROTATE_PROP,
      },
      {
        id: 3,
        level: 1,
        title: 'Úloha 3 (Presun/Grab)',
        blenderFunction: 'Presun (Grab)',
        repairStory: 'Hviezdicový motor sa uvoľnil z lôžka — presuň ho späť!',
        shortcutLabel: 'G',
        keyTokens: ['G'],
        visualType: RepairVisualType.GRAB_ENGINE,
      },
      {
        id: 4,
        level: 1,
        title: 'Úloha 4 (Zmena mierky/Scale)',
        blenderFunction: 'Zmena mierky (Scale)',
        repairStory: 'Vztlak krídel klesá — obnov správnu mierku rozpätia!',
        shortcutLabel: 'S',
        keyTokens: ['S'],
        visualType: RepairVisualType.SCALE_WINGS,
      },
    ],
  },
  {
    level: 2,
    name: 'Purpurové duny',
    subtitle: 'Transformácie viazané na osi X, Y, Z',
    style: EnvironmentStyle.SYNTH_DUNES,
    skyTopColor: '#160f30',
    skyHorizonColor: '#9d174d',
    fogColor: '#581c5c',
    portalColor: '#2dd4bf',
    portalSecondaryColor: '#e879f9',
    tasks: [
      {
        id: 5,
        level: 2,
        title: 'Úloha 5 (Zrušenie funkcie)',
        blenderFunction: 'Zrušiť akciu',
        repairStory: 'Chybná deformácia trupu — okamžite zruš prebiehajúcu akciu!',
        shortcutLabel: 'Esc',
        keyTokens: ['Esc'],
        visualType: RepairVisualType.CANCEL_GLITCH,
      },
      {
        id: 6,
        level: 2,
        title: 'Úloha 6 (Rotácia okolo osi X)',
        blenderFunction: 'Rotácia v osi X',
        repairStory: 'Výškovka sa preklopila — otoč ju presne okolo osi X!',
        shortcutLabel: 'R + X',
        keyTokens: ['R', 'X'],
        visualType: RepairVisualType.ROTATE_X,
      },
      {
        id: 7,
        level: 2,
        title: 'Úloha 7 (Presun po osi Z)',
        blenderFunction: 'Presun v osi Z',
        repairStory: 'Horné krídlo kleslo nadol — vysuň ho späť po osi Z!',
        shortcutLabel: 'G + Z',
        keyTokens: ['G', 'Z'],
        visualType: RepairVisualType.GRAB_Z,
      },
      {
        id: 8,
        level: 2,
        title: 'Úloha 8 (Zmena mierky v dvoch rozmeroch)',
        blenderFunction: 'Mierka v 2 rozmeroch',
        repairStory: 'Spevni profil trupu v dvoch osiach s vynechaním tretej!',
        shortcutLabel: 'S + Shift + Z',
        altShortcutsLabel: 'alebo S + Shift + X / Y',
        keyTokens: ['S', 'Shift', 'Z/X/Y'],
        visualType: RepairVisualType.SCALE_PLANE,
      },
    ],
  },
  {
    level: 3,
    name: 'Kubická metropola',
    subtitle: 'Edit Mode a modelovacie operácie',
    style: EnvironmentStyle.CUBIC_METROPOLIS,
    skyTopColor: '#0f172a',
    skyHorizonColor: '#475569',
    fogColor: '#334155',
    portalColor: '#f59e0b',
    portalSecondaryColor: '#38bdf8',
    tasks: [
      {
        id: 9,
        level: 3,
        title: 'Úloha 9 (Zmena módu z Objekt na Edit)',
        blenderFunction: 'Prepnúť Object / Edit Mode',
        repairStory: 'Otvor sieť lietadla v Edit Mode pre opravu geometrie!',
        shortcutLabel: 'Tab',
        keyTokens: ['Tab'],
        visualType: RepairVisualType.EDIT_MODE,
      },
      {
        id: 10,
        level: 3,
        title: 'Úloha 10 (Mázanie)',
        blenderFunction: 'Odstrániť prvok (Delete)',
        repairStory: 'Úlomok bloku brzdí vrtuľu — vymaž poškodený objekt!',
        shortcutLabel: 'X',
        keyTokens: ['X'],
        visualType: RepairVisualType.DELETE_DEBRIS,
      },
      {
        id: 11,
        level: 3,
        title: 'Úloha 11 (Extrudovanie v osi X)',
        blenderFunction: 'Extrudovať v osi X',
        repairStory: 'Koniec krídla je odlomený — extruduj novú plochu v osi X!',
        shortcutLabel: 'E + X',
        keyTokens: ['E', 'X'],
        visualType: RepairVisualType.EXTRUDE_X,
      },
      {
        id: 12,
        level: 3,
        title: 'Úloha 12 (Presun vertexu po hrane)',
        blenderFunction: 'Posun vertexu (Vertex Slide)',
        repairStory: 'Zarovnaj vybočený vrchol nábežnej hrany posunom po hrane!',
        shortcutLabel: 'Shift + V',
        keyTokens: ['Shift', 'V'],
        visualType: RepairVisualType.SLIDE_VERTEX,
      },
    ],
  },
  {
    level: 4,
    name: 'Kamenný labyrint',
    subtitle: 'Výbery prvkov, zlučovanie a rezanie siete',
    style: EnvironmentStyle.FRACTURED_CANYON,
    skyTopColor: '#1e293b',
    skyHorizonColor: '#94a3b8',
    fogColor: '#7a8a9e',
    portalColor: '#a855f7',
    portalSecondaryColor: '#34d399',
    tasks: [
      {
        id: 13,
        level: 4,
        title: 'Úloha 13 (Označenie pridružených prvkov)',
        blenderFunction: 'Označiť prepojené (Select Linked)',
        repairStory: 'Podvozok vibruje — označ všetky pridružené časti podvozku!',
        shortcutLabel: 'L',
        keyTokens: ['L'],
        visualType: RepairVisualType.SELECT_LINKED,
      },
      {
        id: 14,
        level: 4,
        title: 'Úloha 14 (Označenie vertexov, hrán a plôch)',
        blenderFunction: 'Režim výberu 1 / 2 / 3',
        repairStory: 'Prepni režim výberu na vertexy (1), hrany (2) alebo plochy (3)!',
        shortcutLabel: '1 / 2 / 3',
        keyTokens: ['1, 2 alebo 3'],
        visualType: RepairVisualType.SELECT_ELEMENTS,
      },
      {
        id: 15,
        level: 4,
        title: 'Úloha 15 (Zlučenie označených vertexov)',
        blenderFunction: 'Zlúčiť vertexy (Merge)',
        repairStory: 'Trhlina v poťahu trupu — zlúč rozdelené vertexy dokopy!',
        shortcutLabel: 'M',
        keyTokens: ['M'],
        visualType: RepairVisualType.MERGE_VERTICES,
      },
      {
        id: 16,
        level: 4,
        title: 'Úloha 16 (Výber nástroja nož)',
        blenderFunction: 'Nástroj nôž (Knife Tool)',
        repairStory: 'Vyrež vetrací otvor klapky pomocou nástroja nôž!',
        shortcutLabel: 'K',
        keyTokens: ['K'],
        visualType: RepairVisualType.KNIFE_CUT,
      },
    ],
  },
];

export const FINALE_WORLD: Omit<LevelConfig, 'tasks'> = {
  level: 5,
  name: 'Zlaté údolie majstrov',
  subtitle: 'Všetky portály prekonané — voľný víťazný let!',
  style: EnvironmentStyle.GOLDEN_SANCTUARY,
  skyTopColor: '#0c4a6e',
  skyHorizonColor: '#fde68a',
  fogColor: '#bae6fd',
  portalColor: '#10b981',
  portalSecondaryColor: '#fbbf24',
};
