import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, SlidersHorizontal } from 'lucide-react';
import Ios26MusicPlayerWidget from '../../ios26-music-player/Widget';

// Halaman berdiri sendiri buat template "IOS 26 Music Player": preview
// widget Control Center + Music Player yang interaktif (klik kartu audio
// kanan atas buat buka Music Player), dengan tombol "Lanjutan" di bawah
// buat customize tampilan kartu -- gayanya niru bottom-bar QuickEditScreen
// biar konsisten sama template iOS Music Player yang lain, tapi halaman ini
// SENGAJA dipisah, gak numpang di <Editor> punya template lama:
//  - belum ada timeline/lirik/preset/export (nanti aja kalau udah waktunya)
//  - interaksi CC <-> Music Player masih klik manual, bukan auto-transisi
//    ala timeline video (itu nanti bagian dari engine export)
export default function Ios26MusicPlayerPage() {
  const navigate = useNavigate();
  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <div className="fixed inset-0 z-[45] flex flex-col bg-black text-white">
      <header className="flex shrink-0 items-center gap-3 px-3 pb-1 pt-[max(8px,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => navigate('/')}
          data-ripple
          aria-label="Kembali"
          className="flex h-9 w-9 items-center justify-center rounded-xl transition active:scale-90"
        >
          <ChevronLeft size={22} />
        </button>
        <span className="text-[13px] font-medium text-white/70">iOS 26 Music Player</span>
      </header>

      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4 py-2">
        <Ios26MusicPlayerWidget advancedOpen={advancedOpen} />
      </div>

      <div className="shrink-0 border-t border-white/10 px-4 pb-[max(10px,env(safe-area-inset-bottom))] pt-2">
        <div className="grid grid-cols-1">
          <button
            type="button"
            onClick={() => setAdvancedOpen((v) => !v)}
            aria-pressed={advancedOpen}
            data-ripple
            className={`flex flex-col items-center gap-0.5 py-1 text-[10.5px] transition active:scale-90 ${
              advancedOpen ? 'text-white' : 'text-white/60'
            }`}
          >
            <SlidersHorizontal size={20} strokeWidth={advancedOpen ? 2.2 : 1.6} />
            Lanjutan
            <span className={`h-[2px] w-5 rounded-full ${advancedOpen ? 'bg-editor-accent' : 'bg-transparent'}`} />
          </button>
        </div>
      </div>

      {advancedOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setAdvancedOpen(false)} />
      )}
    </div>
  );
}
