import { create } from 'zustand';
import {
  ReliefSettings,
  HeightGrid,
  GeometryResult,
  BandInfo,
  buildHeightGrid,
  buildGeometry,
  buildMoldGeometry,
  computeColors,
  computeBands,
  colorAttr,
  toSTL,
} from './relief-engine';

export const DEFAULT_SETTINGS: ReliefSettings = {
  mapMode: 'brightness',
  invert: false,
  contrast: 1.15,
  smooth: 0.6,
  pw: 150,
  ph: 150,
  relief: 3,
  base: 3,
  gc: 3,
  gr: 3,
  tcol: 1,
  trow: 1,
  join: true,
  tw: 24,
  to: 6,
  tc: 0.30,
  offX: 0.10,
  offY: 0.18,
  colorOn: false,
  nc: 4,
  bandMode: 'height',
  out: 'PANEL',
  mw: 6,
  mr: 5,
  res: 220,
  puzzleOn: false,
  puzzleSize: 20,
  puzzleExtent: 8,
  puzzleEdges: '',
};

interface EditorState {
  settings: ReliefSettings;
  img: HTMLImageElement | null;
  imgName: string;
  srcCanvas: HTMLCanvasElement | null;
  heightGrid: HeightGrid | null;
  geometry: GeometryResult | null;
  colorData: Float32Array | null;
  colors: number[][];
  bands: BandInfo[];
  toast: string;
  toastTimeout: ReturnType<typeof setTimeout> | null;
  isLoading: boolean;

  // Actions
  setSetting: <K extends keyof ReliefSettings>(key: K, value: ReliefSettings[K]) => void;
  setSettings: (settings: Partial<ReliefSettings>) => void;
  setImage: (img: HTMLImageElement, name: string) => void;
  setTile: (col: number, row: number) => void;
  refresh: () => void;
  showToast: (msg: string) => void;
  exportTile: (res?: number) => void;
  exportAll: (res?: number) => void;
  reset: () => void;
  resetView: boolean;
  setResetView: (v: boolean) => void;
}

const EXPORT_RES = 420;

function normalizeConnectorSettings(settings: ReliefSettings): ReliefSettings {
  if (settings.puzzleOn && settings.join) {
    return { ...settings, join: false };
  }
  return settings;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  settings: { ...DEFAULT_SETTINGS },
  img: null,
  imgName: '',
  srcCanvas: typeof document !== 'undefined' ? document.createElement('canvas') : null,
  heightGrid: null,
  geometry: null,
  colorData: null,
  colors: [],
  bands: [],
  toast: '',
  toastTimeout: null,
  isLoading: false,
  resetView: false,

  setSetting: (key, value) => {
    set((state) => ({
      settings: normalizeConnectorSettings({ ...state.settings, [key]: value }),
    }));
    // After changing certain settings, recompute
    const s = get();
    if (['colorOn', 'nc', 'bandMode', 'relief', 'base', 'invert'].includes(key)) {
      if (s.settings.colorOn && s.img) {
        const colors = computeColors(s.img, s.settings.nc);
        const bands = computeBands(s.img, s.settings);
        set({ colors, bands });
      }
    }
    if (s.img) {
      get().refresh();
    }
  },

  setImage: (img, name) => {
    set({ img, imgName: name });
    const s = get();
    if (s.settings.colorOn) {
      const colors = computeColors(img, s.settings.nc);
      const bands = computeBands(img, s.settings);
      set({ colors, bands });
    }
    get().refresh();
  },

  setTile: (col, row) => {
    set((state) => ({
      settings: normalizeConnectorSettings({ ...state.settings, tcol: col, trow: row }),
    }));
    if (get().img) get().refresh();
  },

  refresh: () => {
    const s = get();
    if (!s.img || !s.srcCanvas) return;
    const hg = buildHeightGrid(s.img, s.srcCanvas, s.settings);
    if (!hg) return;
    const geo = s.settings.out === 'MOLD'
      ? buildMoldGeometry(hg, s.settings)
      : buildGeometry(hg, s.settings);
    if (!geo) return;
    const cd = (s.settings.out === 'PANEL' && s.settings.colorOn)
      ? colorAttr(geo, s.colors, s.bands, s.settings.base, s.settings.relief)
      : null;
    set({ heightGrid: hg, geometry: geo, colorData: cd });
  },

  showToast: (msg) => {
    const prev = get().toastTimeout;
    if (prev) clearTimeout(prev);
    const timeout = setTimeout(() => set({ toast: '' }), 1700);
    set({ toast: msg, toastTimeout: timeout });
  },

  exportTile: (res) => {
    const s = get();
    if (!s.img || !s.srcCanvas) return;
    const useRes = res || EXPORT_RES;
    const hg = buildHeightGrid(s.img, s.srcCanvas, { ...s.settings, res: useRes });
    if (!hg) return;
    const geo = s.settings.out === 'MOLD'
      ? buildMoldGeometry(hg, s.settings)
      : buildGeometry(hg, s.settings);
    if (!geo) return;
    const blob = toSTL(geo);
    const base = (s.imgName || 'panel').replace(/\.[^.]+$/, '');
    const tag = s.settings.out === 'MOLD' ? 'mold' : 'tile';
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${base}_${tag}_${s.settings.tcol}_${s.settings.trow}.stl`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    s.showToast(`exported ${s.settings.tcol}·${s.settings.trow}`);
    // Refresh preview at normal res
    get().refresh();
  },

  exportAll: async (res) => {
    const s = get();
    if (!s.img || !s.srcCanvas) return;
    const useRes = res || EXPORT_RES;
    const base = (s.imgName || 'panel').replace(/\.[^.]+$/, '');
    const tag = s.settings.out === 'MOLD' ? 'mold' : 'tile';
    const sc = s.settings.tcol;
    const sr = s.settings.trow;
    let n = 0;
    for (let c = 1; c <= s.settings.gc; c++) {
      for (let r = 1; r <= s.settings.gr; r++) {
        const localSettings = { ...s.settings, tcol: c, trow: r, res: useRes };
        const hg = buildHeightGrid(s.img, s.srcCanvas, localSettings);
        if (!hg) continue;
        const geo = s.settings.out === 'MOLD'
          ? buildMoldGeometry(hg, localSettings)
          : buildGeometry(hg, localSettings);
        if (!geo) continue;
        const blob = toSTL(geo);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${base}_${tag}_${c}_${r}.stl`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        n++;
        await new Promise(rr => setTimeout(rr, 260));
      }
    }
    s.showToast(`exported ${n} tiles`);
    get().refresh();
  },

  setResetView: (v) => set({ resetView: v }),

  reset: () => {
    set({
      settings: { ...DEFAULT_SETTINGS },
      img: null,
      imgName: '',
      heightGrid: null,
      geometry: null,
      colorData: null,
      colors: [],
      bands: [],
      isLoading: false,
      resetView: false,
    });
  },

  setSettings: (newSettings) => {
    set((state) => {
      const merged = normalizeConnectorSettings({ ...state.settings, ...newSettings });
      // Recompute colors/bands if relevant settings changed
      const colorKeys = ['colorOn', 'nc', 'bandMode', 'relief', 'base', 'invert'];
      const needsColorUpdate = colorKeys.some(k => k in newSettings);
      let colors = state.colors;
      let bands = state.bands;
      if (needsColorUpdate && merged.colorOn && state.img) {
        colors = computeColors(state.img, merged.nc);
        bands = computeBands(state.img, merged);
      }
      return { settings: merged, colors, bands };
    });
    if (get().img) get().refresh();
  },
}));
