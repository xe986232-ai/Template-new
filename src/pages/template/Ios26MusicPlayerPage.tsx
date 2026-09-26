import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Sparkles, SlidersHorizontal } from 'lucide-react';
import Ios26MusicPlayerWidget from '../../ios26-music-player/Widget';
import { tokens } from '../../designTokens';

// Halaman berdiri sendiri buat template "IOS 26 Music Player": preview
// widget Control Center + Music Player yang interaktif (klik kartu audio
// kanan atas buat buka Music Player), dengan tombol "Lanjutan" di bawah
// buat customize tampilan kartu. Halaman ini SENGAJA dipisah, gak numpang
// di <Editor> punya template lama:
//  - belum ada timeline/lirik/preset/export (nanti aja kalau udah waktunya)
//  - interaksi CC <-> Music Player masih klik manual, bukan auto-transisi
//    ala timeline video (itu nanti bagian dari engine export)
//
// Chrome-nya (pill "(PREVIEW TEMPLATE)", badge nama, tombol) sengaja
// dibikin niru persis TemplatePreview.tsx punya template iOS Music Player
// biasa, biar kelihatan satu keluarga tampilan meski di sini belum ada
// tombol "Gunakan template" (fiturnya belum ada) -- cuma bajunya doang
// yang disamain, bukan fungsinya.
export default function Ios26MusicPlayerPage() {
  const navigate = useNavigate();
  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <div
      className="fixed inset-0 z-[45] flex flex-col overflow-hidden"
      style={{ backgroundColor: tokens.colors.pageBackground, fontFamily: tokens.fonts.body }}
    >
      {/* Overlay atas -- tombol kembali + pill judul, sama persis gayanya
          kayak TemplatePreview.tsx */}
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

      {/* Widget-nya sendiri, dibingkai kartu rounded-3xl border-black biar
          kerasa satu bahasa visual sama kartu template lain di galeri. */}
      <div className="relative z-0 flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4 py-2">
        <div className="relative flex h-full max-h-[640px] w-full max-w-[420px] items-center justify-center overflow-hidden rounded-3xl border border-black bg-black">
          <Ios26MusicPlayerWidget advancedOpen={advancedOpen} />
        </div>
      </div>

      {/* Overlay bawah -- badge nama + chip status + tombol "Lanjutan",
          gayanya niru bagian bawah TemplatePreview.tsx (nama pill +
          info chip + tombol aksi pill), cuma isinya beda: di sini tombol
          bukanya panel customize, bukan masuk Editor. */}
      <div className="relative z-10 flex flex-col items-start gap-2 px-4 pb-[max(0.875rem,env(safe-area-inset-bottom))] pt-1">
        <h2
          className="max-w-full truncate rounded-lg border border-black px-2.5 py-1 text-sm font-bold leading-tight text-black"
          style={{
            backgroundColor: tokens.colors.accent,
            fontFamily: tokens.fonts.heading,
            letterSpacing: '-0.25px',
          }}
        >
          IOS 26 Music Player
        </h2>

        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 rounded-full bg-black px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
            <Sparkles size={10} strokeWidth={2.5} />
            Baru -- preview
          </span>
          <span
            className="rounded-full bg-black px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
            style={{ color: tokens.colors.accent }}
          >
            Klik kartu audio buat buka Music Player
          </span>
        </div>

        <button
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
          aria-pressed={advancedOpen}
          data-ripple
          className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-black text-sm font-bold text-black transition duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
          style={{ backgroundColor: tokens.colors.accent, fontFamily: tokens.fonts.heading }}
        >
          <SlidersHorizontal size={16} strokeWidth={advancedOpen ? 2.4 : 2} />
          {advancedOpen ? 'Tutup panel lanjutan' : 'Lanjutan'}
        </button>
      </div>

      {advancedOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setAdvancedOpen(false)} />
      )}
    </div>
  );
}
