'use client';

import { useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { useEditorStore } from '@/lib/store';
import { computeColors, computeBands, m600Text } from '@/lib/relief-engine';

/* ---- Shared UI primitives ---- */

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-mono text-[11px] tracking-[1.5px] uppercase text-accent2 flex items-center gap-2 px-[18px] py-[13px] pb-[11px]">
      <span className="w-[6px] h-[6px] bg-accent2 inline-block rotate-45 shrink-0" />
      {children}
    </h2>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-b border-line">
      {children}
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
  unit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  unit?: string;
}) {
  const fmt = format || ((v: number) => String(v));
  return (
    <div className="my-[11px]">
      <label className="block text-[11.5px] text-dim mb-[5px] font-mono tracking-[0.3px]">
        {label}
        <span className="text-ink float-right font-bold">
          {fmt(value)}{unit ? ` ${unit}` : ''}
        </span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-accent h-[3px]"
      />
    </div>
  );
}

function SegmentedButton({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex border border-line rounded-sm overflow-hidden">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex-1 border-0 py-2 px-1 font-mono text-[11px] cursor-pointer tracking-[0.5px] transition-colors ${
            value === opt.value
              ? 'bg-accent text-[#160a05] font-bold'
              : 'bg-panel2 text-dim hover:text-ink'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-[9px] cursor-pointer text-[12px] text-ink">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-accent w-[15px] h-[15px]"
      />
      {label}
    </label>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-[10.5px] text-dim font-mono leading-[1.45] my-[6px] mb-[2px]">
      {children}
    </span>
  );
}

/* ---- Control Panel ---- */

export default function ControlPanel({ projectId }: { projectId?: string }) {
  const settings = useEditorStore((s) => s.settings);
  const setSetting = useEditorStore((s) => s.setSetting);
  const setImage = useEditorStore((s) => s.setImage);
  const setTile = useEditorStore((s) => s.setTile);
  const showToast = useEditorStore((s) => s.showToast);
  const img = useEditorStore((s) => s.img);
  const imgName = useEditorStore((s) => s.imgName);
  const colors = useEditorStore((s) => s.colors);
  const bands = useEditorStore((s) => s.bands);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;
      
      // Load image locally first
      const reader = new FileReader();
      reader.onload = async (e) => {
        const im = new Image();
        im.onload = async () => {
          setImage(im, file.name);
          
          // Upload to server and save imageId to project
          if (projectId) {
            try {
              const formData = new FormData();
              formData.append('file', file);
              const uploadRes = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
              });
              if (uploadRes.ok) {
                const image = await uploadRes.json();
                // Save imageId to project
                await fetch(`/api/projects/${projectId}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ imageId: image.id }),
                });
              }
            } catch (err) {
              console.error('Failed to upload image:', err);
            }
          }
        };
        im.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    },
    [setImage, projectId]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    multiple: false,
  });

  const handleCopyM600 = () => {
    const text = m600Text(bands);
    navigator.clipboard.writeText(text)
      .then(() => showToast('M600 copied'))
      .catch(() => showToast('copy failed'));
  };

  // Build tile grid
  const tileButtons = useMemo(() => {
    const btns: { col: number; row: number }[] = [];
    for (let r = settings.gr; r >= 1; r--) {
      for (let c = 1; c <= settings.gc; c++) {
        btns.push({ col: c, row: r });
      }
    }
    return btns;
  }, [settings.gc, settings.gr]);

  return (
    <div className="w-[344px] min-w-[344px] border-r border-line overflow-y-auto pb-10 bg-panel scrollbar-thin">
      {/* IMAGE SOURCE */}
      <Section>
        <SectionHeader>Image Source</SectionHeader>
        <div className="px-[18px] pb-[18px]">
          <div
            {...getRootProps()}
            className={`border-[1.5px] border-dashed rounded-sm p-[22px] px-[14px] text-center cursor-pointer transition-colors bg-panel2 ${
              isDragActive ? 'border-accent bg-[#20272c]' : 'border-[#3a454c] hover:border-accent hover:bg-[#20272c]'
            }`}
          >
            <input {...getInputProps()} />
            <b className="block font-mono text-[12px] text-ink">
              {imgName || 'Drop image or click'}
            </b>
            <span className="text-[10.5px] text-dim">PNG / JPG · becomes a height map</span>
          </div>

          <div className="my-[11px]">
            <label className="block text-[11.5px] text-dim mb-[5px] font-mono tracking-[0.3px]">Relief mapping</label>
            <SegmentedButton
              options={[
                { value: 'brightness', label: 'BRIGHT=HIGH' },
                { value: 'subject', label: 'SUBJECT RAISED' },
              ]}
              value={settings.mapMode}
              onChange={(v) => setSetting('mapMode', v as 'brightness' | 'subject')}
            />
          </div>

          <div className="my-[8px]">
            <Checkbox
              label="Invert (white = low)"
              checked={settings.invert}
              onChange={(v) => setSetting('invert', v)}
            />
          </div>

          <SliderRow
            label="Contrast"
            value={settings.contrast}
            min={0.5}
            max={2.5}
            step={0.05}
            onChange={(v) => setSetting('contrast', v)}
            format={(v) => v.toFixed(2)}
          />
          <SliderRow
            label="Smoothing"
            value={settings.smooth}
            min={0}
            max={3}
            step={0.1}
            onChange={(v) => setSetting('smooth', v)}
            format={(v) => v.toFixed(1)}
          />
        </div>
      </Section>

      {/* PANEL SIZE */}
      <Section>
        <SectionHeader>Panel Size</SectionHeader>
        <div className="px-[18px] pb-[18px]">
          <div className="flex gap-[10px]">
            <div className="flex-1">
              <label className="block text-[11.5px] text-dim mb-[5px] font-mono tracking-[0.3px]">Width mm</label>
              <input
                type="number"
                value={settings.pw}
                onChange={(e) => setSetting('pw', parseFloat(e.target.value) || 150)}
                className="w-full bg-panel2 border border-line text-ink py-2 px-[9px] rounded-sm font-mono text-[12.5px]"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[11.5px] text-dim mb-[5px] font-mono tracking-[0.3px]">Height mm</label>
              <input
                type="number"
                value={settings.ph}
                onChange={(e) => setSetting('ph', parseFloat(e.target.value) || 150)}
                className="w-full bg-panel2 border border-line text-ink py-2 px-[9px] rounded-sm font-mono text-[12.5px]"
              />
            </div>
          </div>

          <SliderRow
            label="Relief depth"
            value={settings.relief}
            min={0.5}
            max={15}
            step={0.1}
            onChange={(v) => setSetting('relief', v)}
            format={(v) => v.toFixed(1)}
            unit="mm"
          />
          <SliderRow
            label="Base thickness"
            value={settings.base}
            min={1}
            max={10}
            step={0.1}
            onChange={(v) => setSetting('base', v)}
            format={(v) => v.toFixed(1)}
            unit="mm"
          />
        </div>
      </Section>

      {/* GRID TILING */}
      <Section>
        <SectionHeader>Grid Tiling</SectionHeader>
        <div className="px-[18px] pb-[18px]">
          <div className="flex gap-[10px]">
            <div className="flex-1">
              <label className="block text-[11.5px] text-dim mb-[5px] font-mono tracking-[0.3px]">Columns</label>
              <input
                type="number"
                value={settings.gc}
                min={1}
                max={8}
                onChange={(e) => {
                  const v = Math.max(1, Math.min(8, parseInt(e.target.value) || 1));
                  setSetting('gc', v);
                  if (settings.tcol > v) setSetting('tcol', v);
                }}
                className="w-full bg-panel2 border border-line text-ink py-2 px-[9px] rounded-sm font-mono text-[12.5px]"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[11.5px] text-dim mb-[5px] font-mono tracking-[0.3px]">Rows</label>
              <input
                type="number"
                value={settings.gr}
                min={1}
                max={8}
                onChange={(e) => {
                  const v = Math.max(1, Math.min(8, parseInt(e.target.value) || 1));
                  setSetting('gr', v);
                  if (settings.trow > v) setSetting('trow', v);
                }}
                className="w-full bg-panel2 border border-line text-ink py-2 px-[9px] rounded-sm font-mono text-[12.5px]"
              />
            </div>
          </div>

          <label className="block text-[11.5px] text-dim mb-[5px] font-mono tracking-[0.3px] mt-[10px]">
            Select tile to build (col · row)
          </label>
          <div
            className="grid gap-1 mt-2"
            style={{ gridTemplateColumns: `repeat(${settings.gc}, 1fr)` }}
          >
            {tileButtons.map(({ col, row }) => {
              const isActive = col === settings.tcol && row === settings.trow;
              return (
                <button
                  key={`${col}-${row}`}
                  onClick={() => setTile(col, row)}
                  className={`aspect-square border font-mono text-[11px] cursor-pointer ${
                    isActive
                      ? 'bg-accent2 text-[#06201b] font-bold border-accent2'
                      : 'bg-panel2 border-line text-dim hover:border-accent2'
                  }`}
                >
                  {col}·{row}
                </button>
              );
            })}
          </div>
          <Note>One image auto-slices across the grid. Each tile is a separate flat print.</Note>
        </div>
      </Section>

      {/* JOINING */}
      <Section>
        <SectionHeader>Joining (Support-Free)</SectionHeader>
        <div className="px-[18px] pb-[18px]">
          <Checkbox
            label="Bed-level interlocking edge"
            checked={settings.join}
            onChange={(v) => setSetting('join', v)}
          />
          <Note>
            Tab on right/top edges, notch on left/bottom. Tabs carry the neighboring relief so the artwork fills the joint. Tiles slide together, print flat, and only seat the right way.
          </Note>

          <SliderRow
            label="Tab width"
            value={settings.tw}
            min={12}
            max={50}
            step={1}
            onChange={(v) => setSetting('tw', v)}
            format={(v) => v.toFixed(0)}
            unit="mm"
          />
          <SliderRow
            label="Tab reach"
            value={settings.to}
            min={3}
            max={14}
            step={0.5}
            onChange={(v) => setSetting('to', v)}
            format={(v) => v.toFixed(1)}
            unit="mm"
          />
          <SliderRow
            label="Slide clearance"
            value={settings.tc}
            min={0.15}
            max={0.5}
            step={0.01}
            onChange={(v) => setSetting('tc', v)}
            format={(v) => v.toFixed(2)}
            unit="mm"
          />
        </div>
      </Section>

      {/* PUZZLE TABS */}
      <Section>
        <SectionHeader>Puzzle Tabs (Jigsaw)</SectionHeader>
        <div className="px-[18px] pb-[18px]">
          <Checkbox
            label="Jigsaw puzzle edge connectors"
            checked={settings.puzzleOn}
            onChange={(v) => setSetting('puzzleOn', v)}
          />
          <Note>
            Curved jigsaw tabs on right/top edges, matching sockets on left/bottom. Tiles interlock like puzzle pieces. Overrides standard joining when enabled.
          </Note>

          <SliderRow
            label="Tab size"
            value={settings.puzzleSize}
            min={10}
            max={40}
            step={1}
            onChange={(v) => setSetting('puzzleSize', v)}
            format={(v) => v.toFixed(0)}
            unit="mm"
          />
          <SliderRow
            label="Tab reach"
            value={settings.puzzleExtent}
            min={4}
            max={14}
            step={0.5}
            onChange={(v) => setSetting('puzzleExtent', v)}
            format={(v) => v.toFixed(1)}
            unit="mm"
          />
        </div>
      </Section>

      {/* COLOR */}
      <Section>
        <SectionHeader>Color (Height Bands)</SectionHeader>
        <div className="px-[18px] pb-[18px]">
          <Checkbox
            label="Map colors to height bands"
            checked={settings.colorOn}
            onChange={(v) => {
              if (v && img) {
                const newColors = computeColors(img, settings.nc);
                const newBands = computeBands(img, settings);
                useEditorStore.setState({ colors: newColors, bands: newBands });
              }
              setSetting('colorOn', v);
            }}
          />
          <Note>
            Single model, single extruder. Swap filament at the listed Z heights (M600). Taller relief = later color. AI picks the palette from your image.
          </Note>

          <SliderRow
            label="Colors"
            value={settings.nc}
            min={2}
            max={6}
            step={1}
            onChange={(v) => setSetting('nc', v)}
            format={(v) => v.toFixed(0)}
          />

          <div className="my-[11px]">
            <label className="block text-[11.5px] text-dim mb-[5px] font-mono tracking-[0.3px]">Band style</label>
            <SegmentedButton
              options={[
                { value: 'height', label: 'EQUAL HEIGHT' },
                { value: 'coverage', label: 'EQUAL AREA' },
              ]}
              value={settings.bandMode}
              onChange={(v) => setSetting('bandMode', v as 'height' | 'coverage')}
            />
          </div>

          {/* Swatches */}
          {colors.length > 0 && (
            <div className="flex gap-2 flex-wrap my-[14px] mb-[2px]">
              {colors.map((c, i) => (
                <div key={i} className="relative">
                  <div
                    className="w-6 h-6 border border-black rounded-sm"
                    style={{ background: `rgb(${c[0]},${c[1]},${c[2]})` }}
                  />
                  <b className="absolute -bottom-[14px] left-0 right-0 text-center text-[8px] text-dim font-mono">
                    c{i + 1}
                  </b>
                </div>
              ))}
            </div>
          )}

          {/* Band table */}
          {settings.colorOn && bands.length > 0 && (
            <>
              <table className="w-full border-collapse font-mono text-[10.5px] mt-[10px]">
                <thead>
                  <tr>
                    <th className="border border-line p-[3px] px-[5px] text-left text-accent2 font-normal">band</th>
                    <th className="border border-line p-[3px] px-[5px] text-left text-accent2 font-normal">color</th>
                    <th className="border border-line p-[3px] px-[5px] text-left text-accent2 font-normal">Z mm</th>
                    <th className="border border-line p-[3px] px-[5px] text-left text-accent2 font-normal">layer*</th>
                  </tr>
                </thead>
                <tbody>
                  {bands.map((b, i) => {
                    const c = colors[i] || [128, 128, 128];
                    return (
                      <tr key={i}>
                        <td className="border border-line p-[3px] px-[5px] text-ink">{b.i}</td>
                        <td className="border border-line p-[3px] px-[5px]">
                          <span
                            className="inline-block w-3 h-3 border border-black align-middle"
                            style={{ background: `rgb(${c[0]},${c[1]},${c[2]})` }}
                          />
                        </td>
                        <td className="border border-line p-[3px] px-[5px] text-ink">{b.z.toFixed(2)}</td>
                        <td className="border border-line p-[3px] px-[5px] text-ink">{b.layer}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <button
                onClick={handleCopyM600}
                className="mt-[10px] w-full font-mono text-[11px] py-2 px-4 border border-line bg-transparent text-ink rounded-sm cursor-pointer uppercase tracking-[0.5px] hover:border-accent"
              >
                ⧉ Copy M600 swap G-code
              </button>
            </>
          )}
        </div>
      </Section>

      {/* OUTPUT */}
      <Section>
        <SectionHeader>Output</SectionHeader>
        <div className="px-[18px] pb-[18px]">
          <SegmentedButton
            options={[
              { value: 'PANEL', label: 'PANEL' },
              { value: 'MOLD', label: 'MOLD' },
            ]}
            value={settings.out}
            onChange={(v) => setSetting('out', v as 'PANEL' | 'MOLD')}
          />

          {settings.out === 'MOLD' && (
            <>
              <SliderRow
                label="Mold wall"
                value={settings.mw}
                min={3}
                max={14}
                step={0.5}
                onChange={(v) => setSetting('mw', v)}
                format={(v) => v.toFixed(0)}
                unit="mm"
              />
              <SliderRow
                label="Pour rim"
                value={settings.mr}
                min={0}
                max={20}
                step={0.5}
                onChange={(v) => setSetting('mr', v)}
                format={(v) => v.toFixed(0)}
                unit="mm"
              />
            </>
          )}

          <SliderRow
            label="Mesh resolution"
            value={settings.res}
            min={80}
            max={500}
            step={20}
            onChange={(v) => setSetting('res', v)}
            format={(v) => v.toFixed(0)}
            unit="px"
          />
          <Note>preview uses this; export auto-bumps to high-res</Note>
        </div>
      </Section>
    </div>
  );
}
