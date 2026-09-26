import { Check, ChevronLeft, Pause, Play, type LucideIcon } from "lucide-react";
import { useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";

// Dua potongan UI yang berulang di SETIAP halaman editor template
// (V4/canvas, IOS 26 Control Center, dan template2 berikutnya):
//
//  1. <EditorTabBar>  -- baris tab bawah (Media/Audio/Lanjutan, atau apa pun
//     nama tab-nya). Cuma render tombol + state aktif; TIDAK menyimpan state
//     sendiri, biar halaman pemanggil bebas nentuin: klik tab yang lagi
//     aktif itu nutup panel (toggle) atau ganti-ganti terus (selalu buka).
//
//  2. <EditorSheet>   -- panel yang slide-up dari bawah, dipakai buat isi
//     tab yang lagi aktif (kontrol slider, input teks, dll). Nanganin
//     sendiri: posisi fixed, animasi slide, header (judul + tombol
//     "Selesai"), dan area scroll-nya. Isinya (children) bebas apa aja.
//
// Dengan dua ini, halaman editor template baru TINGGAL pasang keduanya +
// nyuplai konten per-tab -- gak perlu nulis ulang tombol tab / animasi
// sheet / tombol Selesai dari nol tiap bikin template baru.

export type EditorTabDef<Id extends string> = {
  id: Id;
  label: string;
  icon: LucideIcon;
};

type EditorTabBarProps<Id extends string> = {
  tabs: EditorTabDef<Id>[];
  /** Tab yang lagi aktif (sheet-nya kebuka), atau null kalau semua tertutup. */
  activeTab: Id | null;
  onTabClick: (id: Id) => void;
  /** Warna aksen buat tab aktif -- default pink sama kayak seluruh editor. */
  accentColor?: string;
  className?: string;
};

/** Baris tab bawah editor (Media/Audio/Lanjutan, dst). Tidak menyimpan
 *  state -- pure render dari `activeTab` yang dikasih parent, jadi parent
 *  bebas atur perilaku toggle-nya (buka/tutup vs selalu-ganti). */
export function EditorTabBar<Id extends string>({
  tabs,
  activeTab,
  onTabClick,
  accentColor = "#ffacff",
  className = "",
}: EditorTabBarProps<Id>) {
  return (
    <div
      className={`relative z-[60] flex shrink-0 items-center justify-around border-t border-white/10 bg-black px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 ${className}`}
    >
      {tabs.map(({ id, label, icon: Icon }) => {
        const active = activeTab === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onTabClick(id)}
            aria-pressed={active}
            data-ripple
            className="flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-[10.5px] font-semibold"
            style={{ color: active ? accentColor : "rgba(255,255,255,0.5)" }}
          >
            <Icon size={18} strokeWidth={active ? 2.4 : 2} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

type EditorSheetProps = {
  /** Sheet kebuka/ketutup -- kalau false, sheet disembunyikan total (bukan
   *  cuma digeser ke bawah viewport) biar gak ikut nangkep klik/scroll. */
  open: boolean;
  /** Judul di header sheet, biasanya label tab yang lagi aktif. */
  title?: string;
  onClose: () => void;
  accentColor?: string;
  children: ReactNode;
  className?: string;
};

/** Panel slide-up generik: header (judul + tombol "Selesai") + area isi
 *  yang bisa di-scroll. Dipakai buat konten tab Media/Audio/Lanjutan (atau
 *  nama tab apa pun) di template mana aja -- tinggal taruh kontrolnya
 *  sebagai children, gak perlu nulis ulang wrapper/animasi/header. */
export function EditorSheet({
  open,
  title,
  onClose,
  accentColor = "#ffacff",
  children,
  className = "",
}: EditorSheetProps) {
  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-50 flex max-h-[min(72vh,620px)] flex-col overflow-y-auto border-t border-white/10 bg-black text-[#f2f2f7] transition-transform duration-300 ease-out ${
        open ? "translate-y-0 visible" : "translate-y-full invisible"
      } ${className}`}
    >
      <div className="sticky top-0 z-[1] flex shrink-0 items-center justify-between border-b border-white/10 bg-black px-4 py-3">
        <span className="text-[14px] font-semibold">{title}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Selesai"
          data-ripple
          className="flex h-[30px] w-[30px] items-center justify-center rounded-full text-black transition active:scale-90"
          style={{ backgroundColor: accentColor }}
        >
          <Check size={15} strokeWidth={2.6} />
        </button>
      </div>
      <div className="flex flex-col gap-3.5 px-4 pb-[calc(80px+env(safe-area-inset-bottom,0px))] pt-4">
        {children}
      </div>
    </div>
  );
}

/** Helper toggle buat dipasang di onTabClick: klik tab yang lagi aktif ->
 *  tutup (null); klik tab lain -> pindah ke situ (tetep kebuka). Dipisah
 *  jadi fungsi biar semua halaman editor punya perilaku toggle yang sama
 *  persis, gak ada yang ke-lewat nulis logic-nya beda-beda. */
export function toggleEditorTab<Id extends string>(
  current: Id | null,
  next: Id
): Id | null {
  return current === next ? null : next;
}

type EditorActionButtonProps = {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
};

/** Tombol kecil dipakai di baris aksi kontekstual (mis. "Ganti / Pangkas /
 *  Latar / Teks" yang muncul begitu satu slot media diketuk) -- awalnya
 *  cuma didefinisikan lokal di QuickEditScreen (template V4), sekarang
 *  dipindah ke sini biar template lain (IOS 26 Control Center, dst) yang
 *  butuh baris aksi serupa TINGGAL PAKAI komponen yang sama persis, bukan
 *  nulis ulang tombolnya dari nol. */
export function ActionButton({
  icon: Icon,
  label,
  active,
  onClick,
  disabled,
}: EditorActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-ripple
      className={`flex w-16 shrink-0 flex-col items-center gap-0.5 rounded-xl py-1 text-[10.5px] transition active:scale-90 disabled:opacity-35 ${
        active ? "text-editor-accent" : "text-white"
      }`}
    >
      <Icon size={19} strokeWidth={1.8} />
      {label}
    </button>
  );
}

type EditorSlotActionBarProps = {
  /** Balik ke tab bar biasa (tombol chevron kiri). */
  onBack: () => void;
  children: ReactNode;
  className?: string;
};

/** Bungkus baris "chevron kembali + deretan ActionButton" -- dipakai buat
 *  ganti tab bar biasa begitu satu slot/elemen media lagi kepilih. Sama
 *  persis polanya kayak baris "Ganti/Pangkas/Latar/Teks" di QuickEditScreen
 *  (V4), tinggal disuplai tombol-tombolnya sebagai children. */
export function EditorSlotActionBar({ onBack, children, className = "" }: EditorSlotActionBarProps) {
  return (
    <div
      className={`relative z-[60] flex shrink-0 items-center gap-1 border-t border-white/10 bg-black px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 ${className}`}
    >
      <button
        type="button"
        onClick={onBack}
        aria-label="Kembali ke tab"
        data-ripple
        className="flex h-11 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 transition active:scale-90"
      >
        <ChevronLeft size={20} />
      </button>
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none]">
        {children}
      </div>
    </div>
  );
}

function fmtClock(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

type SeekBarProps = {
  /** 0..1 */
  progress: number;
  /** Dipanggil dengan rasio 0..1. */
  onSeek: (ratio: number) => void;
  accentColor?: string;
};

/** Garis tipis draggable buat posisi putar -- awalnya lokal di
 *  QuickEditScreen (V4), sekarang dipindah ke sini biar template lain
 *  (mis. IOS 26 Music Player) yang punya audio/video asli beneran bisa
 *  pakai komponen yang sama persis, bukan tiruan visual doang. */
export function SeekBar({ progress, onSeek, accentColor = "#ffacff" }: SeekBarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const seekFrom = (e: ReactPointerEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r || r.width === 0) return;
    onSeek(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)));
  };
  return (
    <div
      ref={ref}
      role="slider"
      aria-label="Posisi putar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
      className="relative h-4 w-full cursor-pointer touch-none"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        seekFrom(e);
      }}
      onPointerMove={(e) => {
        if (e.buttons) seekFrom(e);
      }}
    >
      <div className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 bg-white/20" />
      <div
        className="absolute left-0 top-1/2 h-[2px] -translate-y-1/2"
        style={{ width: `${progress * 100}%`, backgroundColor: accentColor }}
      />
    </div>
  );
}

type PlaybackBarProps = {
  currentSec: number;
  duration: number;
  isPlaying: boolean;
  onSeek: (sec: number) => void;
  onTogglePlay: () => void;
  accentColor?: string;
  className?: string;
};

/** Baris "seek bar + waktu + tombol play/pause" persis di bawah preview --
 *  sama persis yang ada di QuickEditScreen (V4), sekarang jadi komponen
 *  bersama biar template lain (IOS 26 Music Player, dst) yang punya
 *  audio/video beneran tinggal nyambungin state play/seek-nya sendiri,
 *  bukan gambar ulang UI-nya dari nol. */
export function PlaybackBar({
  currentSec,
  duration,
  isPlaying,
  onSeek,
  onTogglePlay,
  accentColor = "#ffacff",
  className = "",
}: PlaybackBarProps) {
  const progress = duration > 0 ? Math.min(1, currentSec / duration) : 0;
  return (
    <div className={`shrink-0 ${className}`}>
      <SeekBar progress={progress} onSeek={(r) => onSeek(r * duration)} accentColor={accentColor} />
      <div className="relative flex items-center px-4 pb-0.5 pt-0 text-[12px] tabular-nums text-white">
        <span>{fmtClock(currentSec)}</span>
        <span className="mx-1.5 h-3 w-px bg-white/30" />
        <span className="text-white/45">{fmtClock(duration)}</span>
        <button
          type="button"
          onClick={onTogglePlay}
          aria-label={isPlaying ? "Jeda" : "Putar"}
          data-ripple
          className="absolute left-1/2 top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center transition active:scale-90"
        >
          {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
        </button>
      </div>
    </div>
  );
}

type ClipThumbProps = {
  /** Nomor urut klip (badge kecil kiri atas), mis. 1. */
  index: number;
  /** Label durasi (badge kiri bawah), mis. "15.0s". */
  durationLabel: string;
  selected?: boolean;
  onClick: () => void;
  label?: string;
  /** Isi visual thumbnail (img/video/ikon placeholder) -- dibiarkan bebas
   *  lewat children biar V4 (video/img per slot) dan template lain (mis.
   *  satu cover art doang) sama-sama bisa pakai. */
  children: ReactNode;
};

/** Tombol thumbnail klip di strip media bawah (badge nomor + durasi) --
 *  dipindah dari markup lokal QuickEditScreen (V4) ke sini biar template
 *  lain yang punya strip klip serupa (mis. IOS 26 Music Player) pakai
 *  komponen yang sama persis. */
export function ClipThumb({ index, durationLabel, selected, onClick, label, children }: ClipThumbProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label ?? `Klip ${index}`}${selected ? " (dipilih)" : ""}`}
      data-ripple
      className={`relative h-[56px] w-[46px] shrink-0 overflow-hidden rounded-lg border-2 bg-white/10 transition active:scale-95 ${
        selected ? "border-white" : "border-transparent"
      }`}
    >
      {children}
      <span className="absolute left-0.5 top-0.5 rounded bg-black/60 px-1 text-[9px] font-semibold text-white">
        {index}
      </span>
      <span className="absolute bottom-0.5 left-1 text-[9px] font-medium text-white drop-shadow">
        {durationLabel}
      </span>
    </button>
  );
}
