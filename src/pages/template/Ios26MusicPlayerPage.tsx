import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Sparkles, Music2, Image as ImageIcon, SlidersHorizontal, Download, Repeat, Type } from 'lucide-react';
import Ios26MusicPlayerWidget, {
  type Ios26EditorTab,
  type Ios26MusicPlayerWidgetHandle,
  type Ios26PlaybackState,
} from '../../ios26-music-player/Widget';
import {
  EditorTabBar,
  EditorSlotActionBar,
  ActionButton,
  ClipThumb,
  PlaybackBar,
  toggleEditorTab,
  type EditorTabDef,
} from '../../components/editor/TemplateEditorTabs';
import { tokens } from '../../designTokens';

// Rasio canvas resmi widget ini: 9:16 (potret) -- SAMA kayak default semua
// template lain (lihat CanvasRatio "9:16" di ios-music-player/Editor.tsx &
// QuickEditScreen.tsx, dan CANVAS_RATIOS di pages/editor/EditorTheme1.tsx).
// Widget IOS 26 cuma SVG hand-drawn potret tetap (viewBox 450x920, gak bisa
// reflow ke landscape), jadi TIDAK ada switcher 16:9/4:5 kayak template
// lain -- cuma satu rasio ini yang dipertahanin bener.
const IOS26_CANVAS_RATIO = 9 / 16; // width / height

/** Ngukur ruang yang beneran available di dalam `areaRef` (dikurangin
 *  padding-nya) lewat ResizeObserver, terus hitung ukuran boks (px) yang
 *  "contain-fit" ke IOS26_CANVAS_RATIO -- lebar & tinggi SELALU proporsional
 *  ke rasio target, gak pernah kepotong/gepeng.
 *
 *  Kenapa gak cukup CSS `aspect-ratio` + `max-w`/`max-h` polos: begitu DUA
 *  batas itu (lebar & tinggi) sama-sama kena di viewport tertentu, browser
 *  nge-resolve dengan TETAP pertahanin salah satu batas (biasanya tinggi
 *  penuh) terus lebar di-crop ke sisa ruang TANPA nge-recompute tinggi
 *  biar rasionya bener -- boksnya jadi "ngawur" (gepeng/kepanjangan),
 *  persis bug yang sebelumnya kejadian di sini (lihat catatan panjang
 *  previewBoxSize di ios-music-player/Editor.tsx buat masalah yang sama). */
function useContainFitFrame(ratio: number) {
  const areaRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;

    const compute = () => {
      const cs = getComputedStyle(el);
      const availW = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const availH = el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      if (availW <= 0 || availH <= 0) return;

      let w = availW;
      let h = w / ratio;
      if (h > availH) {
        h = availH;
        w = h * ratio;
      }
      setSize({ width: Math.round(w), height: Math.round(h) });
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ratio]);

  return { areaRef, size };
}

// Halaman berdiri sendiri buat template "IOS 26 Music Player": widget
// Control Center + Music Player asli (SVG hand-drawn, lihat
// ios26-music-player/Widget.tsx) -- SENGAJA gak numpang di sistem
// TEMPLATES/Editor (canvas+PNG) yang dipakai template lain, karena widget
// ini teknologinya beda (SVG hidup, bukan gambar statis).
//
// Flow-nya niru pola template lain (galeri/preview -> "Gunakan template"
// -> layar edit dengan tab Media/Audio/Lanjutan di bawah + tombol Tambah
// musik/Ekspor di atas), cuma isi tab-nya masih terbatas ke yang udah ada
// di widget: judul/artis/cover (Media), upload musik asli (Audio), dan
// slider gaya kartu (Lanjutan). Ekspor PNG/MP4 BELUM ada -- ditandai
// jelas "Segera hadir" daripada pura-pura jalan.
export default function Ios26MusicPlayerPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'preview' | 'editor'>('preview');
  // null = sheet lagi ketutup (niru alur V4: panel CUMA muncul kalau
  // tombol tab di-klik, bukan otomatis kebuka pas masuk mode editor).
  const [activeTab, setActiveTab] = useState<Ios26EditorTab | null>(null);
  const [exportNotice, setExportNotice] = useState(false);
  const widgetWrapRef = useRef<HTMLDivElement>(null);
  // Boks bingkai preview & editor -- ukurannya dihitung manual (lihat
  // useContainFitFrame di atas) biar SELALU beneran 9:16, gak lagi pakai
  // max-w/max-h tebak-tebakan yang beda sendiri antara mode preview & editor.
  const { areaRef: previewFrameAreaRef, size: previewFrameSize } = useContainFitFrame(IOS26_CANVAS_RATIO);
  const { areaRef: editorFrameAreaRef, size: editorFrameSize } = useContainFitFrame(IOS26_CANVAS_RATIO);
  // Handle imperatif ke widget -- dipakai baris <PlaybackBar> bersama di
  // bawah preview buat togglePlay()/seek() ASLI (lihat Widget.tsx), bukan
  // tiruan state terpisah.
  const widgetApiRef = useRef<Ios26MusicPlayerWidgetHandle>(null);
  // Snapshot playback & cover ASLI widget -- di-report lewat prop
  // onPlaybackState/onCoverChange (lihat Widget.tsx), dipakai nyuplai
  // <PlaybackBar> dan <ClipThumb> bersama sama persis kayak QuickEditScreen
  // (V4), bukan angka statis.
  const [playback, setPlayback] = useState<Ios26PlaybackState>({
    isPlaying: false,
    currentSec: 113,
    duration: 225,
  });
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  // "Slot" yang lagi kepilih -- niru selectedSlot di QuickEditScreen (V4).
  // Satu-satunya slot media yang ada di widget ini baru cover/album art,
  // makanya union-nya cuma 'cover' | null (bukan id dinamis kayak V4 yang
  // punya banyak slot/klip).
  const [selectedSlot, setSelectedSlot] = useState<'cover' | null>(null);

  function clearSlotSelection() {
    setSelectedSlot(null);
    setActiveTab(null);
  }

  // "Tambah musik" di header -- langsung buka tab Audio, lalu trigger
  // tombol upload di dalam sheet-nya (widget yang pegang input file-nya).
  const handleTambahMusik = () => {
    setSelectedSlot(null);
    setActiveTab('audio');
    requestAnimationFrame(() => {
      widgetWrapRef.current?.querySelector<HTMLButtonElement>('#uploadAudioBtn')?.click();
    });
  };

  // Toggle ala tombol "Lanjutan" di V4 (lihat toggleEditorTab): klik tab
  // yang lagi aktif -> tutup sheet-nya; klik tab lain -> ganti isi sheet
  // (tetep kebuka). Logic-nya dibagi di komponen editor generik, bukan
  // ditulis manual di sini, biar template lain pakai perilaku yang sama.
  //
  // Tab "Media" DIKECUALIKAN dari situ: sekarang gak langsung buka sheet
  // form (Judul/Artis/Font/Cover), tapi munculin baris aksi kontekstual
  // Ganti/Teks -- sama kayak pas cover diketuk langsung di preview (lihat
  // onSelectCover di bawah). Dua jalur beda buat hasil yang sama, biar
  // user yang gak sadar bisa ketuk cover-nya juga tetep nemu lewat tombol
  // "Media" di tab bar.
  const handleTabClick = (id: Ios26EditorTab) => {
    if (id === 'media') {
      setActiveTab(null);
      setSelectedSlot((cur) => (cur === 'cover' ? null : 'cover'));
      return;
    }
    setSelectedSlot(null);
    setActiveTab((cur) => toggleEditorTab(cur, id));
  };

  // "Ganti" di baris aksi kontekstual -- trigger tombol upload cover yang
  // udah ada di panel Media (persis pola handleTambahMusik di atas, reuse
  // tombol yang sama, gak bikin input file baru).
  const handleGantiCover = () => {
    widgetWrapRef.current?.querySelector<HTMLButtonElement>('#uploadArtBtn')?.click();
  };

  // "Teks" di baris aksi kontekstual -- judul/artis kartu ini emang udah
  // jadi bagian dari sheet "Media" (belum dipisah sheet sendiri kayak V4),
  // jadi tinggal buka sheet itu.
  const handleEditTeks = () => {
    setActiveTab((cur) => (cur === 'media' ? null : 'media'));
  };

  if (mode === 'preview') {
    return (
      <div
        className="fixed inset-0 z-[45] flex flex-col overflow-hidden"
        style={{ backgroundColor: tokens.colors.pageBackground, fontFamily: tokens.fonts.body }}
      >
        <div className="relative z-10 flex shrink-0 items-center gap-3 px-4 pb-1 pt-[max(1rem,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={() => navigate('/')}
            aria-label="Kembali"
            data-ripple
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black text-black transition duration-200 hover:-translate-x-0.5 active:scale-90"
            style={{ backgroundColor: tokens.colors.pageBackground }}
          >
            <ChevronLeft size={18} />
          </button>
          <div
            className="flex h-9 min-w-0 flex-1 items-center rounded-full border border-black px-3.5"
            style={{ backgroundColor: tokens.colors.pageBackground }}
          >
            <p className="truncate text-[10px] font-bold uppercase tracking-widest text-black">
              (PREVIEW TEMPLATE)
            </p>
          </div>
        </div>

        <div ref={previewFrameAreaRef} className="relative z-0 flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4 py-2">
          <div
            className="relative flex items-center justify-center overflow-hidden rounded-3xl border border-black bg-black"
            style={
              previewFrameSize
                ? { width: previewFrameSize.width, height: previewFrameSize.height }
                : { width: '100%', maxWidth: 420, aspectRatio: '9 / 16' }
            }
          >
            <Ios26MusicPlayerWidget activeTab={null} />
          </div>
        </div>

        <div className="relative z-10 flex flex-col items-start gap-2 px-4 pb-[max(0.875rem,env(safe-area-inset-bottom))] pt-1">
          <h2
            className="max-w-full truncate rounded-lg border border-black px-2.5 py-1 text-sm font-bold leading-tight text-black"
            style={{ backgroundColor: tokens.colors.accent, fontFamily: tokens.fonts.heading, letterSpacing: '-0.25px' }}
          >
            IOS 26 Music Player
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 rounded-full bg-black px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
              <Sparkles size={10} strokeWidth={2.5} />
              Baru -- preview
            </span>
            <span className="rounded-full bg-black px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide" style={{ color: tokens.colors.accent }}>
              Klik kartu audio buat buka Music Player
            </span>
          </div>

          <button
            type="button"
            onClick={() => setMode('editor')}
            data-ripple
            className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-black text-sm font-bold text-black transition duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
            style={{ backgroundColor: tokens.colors.accent, fontFamily: tokens.fonts.heading }}
          >
            Gunakan template
          </button>
        </div>
      </div>
    );
  }

  const TABS: EditorTabDef<Ios26EditorTab>[] = [
    { id: 'media', label: 'Media', icon: ImageIcon },
    { id: 'audio', label: 'Audio', icon: Music2 },
    { id: 'lanjutan', label: 'Lanjutan', icon: SlidersHorizontal },
  ];
  const activeTabLabel = TABS.find((t) => t.id === activeTab)?.label;

  return (
    <div className="fixed inset-0 z-[45] flex flex-col overflow-hidden bg-black" style={{ fontFamily: tokens.fonts.body }}>
      {/* Header -- back, Tambah musik, Ekspor. Niru posisi/gaya chrome atas
          Editor template lain (lihat screenshot V4: pill "Tambah musik" di
          tengah, tombol pink "Ekspor" di kanan). */}
      <div className="relative z-20 flex shrink-0 items-center gap-2 px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => setMode('preview')}
          aria-label="Kembali"
          data-ripple
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-white transition duration-200 hover:-translate-x-0.5 active:scale-90"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          onClick={handleTambahMusik}
          data-ripple
          className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full border border-white/15 px-3 text-[12px] font-semibold text-white/85"
        >
          <Music2 size={13} />
          Tambah musik
        </button>
        <button
          type="button"
          onClick={() => setExportNotice(true)}
          data-ripple
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[12px] font-bold text-black"
          style={{ backgroundColor: tokens.colors.accent }}
        >
          <Download size={13} strokeWidth={2.5} />
          Ekspor
        </button>
      </div>

      {exportNotice && (
        <div className="relative z-20 mx-4 mb-1 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-[11px] text-white/80">
          Ekspor PNG/MP4 buat template ini segera hadir -- belum tersedia.
          <button type="button" className="ml-2 underline" onClick={() => setExportNotice(false)}>
            Oke
          </button>
        </div>
      )}

      {/* Preview widget, dibingkai glow ungu ala referensi iOS 26 (screenshot
          editor V4 juga punya latar bergradasi di belakang frame HP). */}
      <div
        ref={editorFrameAreaRef}
        className="relative z-0 flex min-h-0 flex-1 items-center justify-center overflow-hidden px-6 py-2"
        style={{ background: 'radial-gradient(120% 90% at 50% 30%, rgba(139,147,240,0.35), rgba(0,0,0,0) 65%)' }}
      >
        <div
          ref={widgetWrapRef}
          className="relative flex items-center justify-center overflow-hidden rounded-[2.5rem] border border-white/10 bg-black"
          style={
            editorFrameSize
              ? { width: editorFrameSize.width, height: editorFrameSize.height }
              : { width: '100%', maxWidth: 300, aspectRatio: '9 / 16' }
          }
        >
          <Ios26MusicPlayerWidget
            ref={widgetApiRef}
            activeTab={activeTab}
            activeTabLabel={activeTabLabel}
            onClose={() => setActiveTab(null)}
            onSelectCover={() => {
              setSelectedSlot('cover');
              setActiveTab(null);
            }}
            onPlaybackState={setPlayback}
            onCoverChange={setCoverUrl}
          />
        </div>
      </div>

      {/* Baris seek bar + waktu + tombol play/pause, PERSIS di bawah
          preview -- komponen bersama yang sama dipakai QuickEditScreen (V4),
          disambungin ke play/pause & progress ASLI widget lewat
          widgetApiRef (togglePlay/seek) + state playback yang di-report
          lewat onPlaybackState di atas. */}
      <PlaybackBar
        currentSec={playback.currentSec}
        duration={playback.duration}
        isPlaying={playback.isPlaying}
        onSeek={(sec) => widgetApiRef.current?.seek(playback.duration > 0 ? sec / playback.duration : 0)}
        onTogglePlay={() => widgetApiRef.current?.togglePlay()}
        accentColor={tokens.colors.accent}
      />

      {/* Strip klip media, PERSIS di bawah baris play/pause -- satu-satunya
          "klip" di template ini baru cover/album art, jadi cukup satu
          <ClipThumb> (komponen bersama yang sama dipakai strip klip V4)
          nampilin cover asli (fallback ikon kalau belum ada) + durasi lagu
          ASLI dari state playback di atas. */}
      <div className="relative z-10 flex h-[76px] shrink-0 items-center bg-black px-4">
        <ClipThumb
          index={1}
          durationLabel={`${playback.duration.toFixed(1)}s`}
          selected={selectedSlot === 'cover'}
          label="Cover"
          onClick={() => {
            setSelectedSlot('cover');
            setActiveTab(null);
          }}
        >
          {coverUrl ? (
            <img src={coverUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon size={16} className="mx-auto mt-4 text-white/40" />
          )}
        </ClipThumb>
      </div>

      {/* Baris bawah: tab bar biasa (Media/Audio/Lanjutan), ATAU begitu
          cover diketuk langsung di preview -- baris aksi kontekstual
          (Ganti/Teks), niru persis alur "tap slot -> Ganti/Pangkas/Latar/
          Teks" di QuickEditScreen (V4). Kedua-duanya pakai komponen
          bersama dari TemplateEditorTabs.tsx, gak ada yang ditulis ulang
          dari nol buat template ini. Pangkas & Latar sengaja gak ada --
          widget IOS 26 belum punya fitur crop/background-layer, sama
          kayak V4 yang juga cuma nampilin tombol itu kalau fiturnya ada. */}
      {selectedSlot === 'cover' ? (
        <EditorSlotActionBar onBack={clearSlotSelection}>
          <ActionButton icon={Repeat} label="Ganti" onClick={handleGantiCover} />
          <ActionButton icon={Type} label="Teks" active={activeTab === 'media'} onClick={handleEditTeks} />
        </EditorSlotActionBar>
      ) : (
        <EditorTabBar
          tabs={TABS}
          activeTab={activeTab}
          onTabClick={handleTabClick}
          accentColor={tokens.colors.accent}
        />
      )}
    </div>
  );
}
