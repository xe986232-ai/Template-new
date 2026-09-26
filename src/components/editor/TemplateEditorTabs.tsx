import { Check, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

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
