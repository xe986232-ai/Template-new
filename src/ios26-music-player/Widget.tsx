import { useEffect, useRef } from 'react';
import { STAGE_MARKUP, PANELS_MARKUP } from './markup';
import { EditorSheet } from '../components/editor/TemplateEditorTabs';
import './widget.css';

// Widget IOS 26 Music Player: Control Center flat-dark, kartu audio kanan
// atas bisa diklik buat buka Music Player Card, klik lagi di mana aja buat
// balik ke Control Center.
//
// Diporting dari komponen "Control Center Music Player" (cc-player) yang
// sebelumnya udah dibikin terpisah -- logic-nya (query DOM by id, kalkulasi
// squircle path, drag knob rotate, dst) dipertahanin persis, cuma:
//  - rect `.phone-frame` (foto latar HP) & base64 image-nya udah dihapus
//    dari markup.ts, jadi cuma widget-nya doang yang tampil (transparan).
//  - panel customize sekarang dikontrol lewat prop `advancedOpen` (tombol
//    "Lanjutan" ada di halaman pembungkusnya), bukan selalu kebuka sendiri.
//
// Catatan: ini preview interaktif doang (klik = buka/tutup kartu). Perilaku
// "auto transisi CC -> Music Player di detik tertentu lewat timeline video"
// itu punya sistem export/timeline sendiri yang belum dikerjain di sini.
export type Ios26MusicPlayerWidgetHandle = void;

export type Ios26EditorTab = 'media' | 'audio' | 'lanjutan';

type Props = {
  /** Tab yang lagi kebuka di sheet edit (Media/Audio/Lanjutan), atau null
   *  kalau sheet-nya lagi ketutup (mode preview doang / belum ada tab yang
   *  diklik) -- niru alur template V4: sheet CUMA muncul kalau tombol tab
   *  di-klik, bukan otomatis kebuka. */
  activeTab: Ios26EditorTab | null;
  /** Label tab yang lagi aktif (mis. "Media"), ditaruh di header sheet
   *  bareng tombol "Selesai" -- niru header sheet "Lanjutan" di
   *  QuickEditScreen (V4). */
  activeTabLabel?: string;
  /** Tutup sheet (dipanggil dari tombol "Selesai" di header sheet). */
  onClose?: () => void;
};

export default function Ios26MusicPlayerWidget({ activeTab, activeTabLabel, onClose }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    // Helper query scoped ke container komponen ini (menghindari bentrok id
    // kalau ada instance lain di halaman).
    const $ = <T extends Element = HTMLElement>(id: string) =>
      root.querySelector<T>(`#${id}`)!;

    const stage = $('stage');
    const hint = $('hint');

    // Kartu audio kanan atas (buka music player)
    const audioCard = root.querySelector<SVGRectElement>(
      '.cc-hit[x="233"][y="155"]'
    );

    const cleanupFns: Array<() => void> = [];
    const on = <K extends keyof HTMLElementEventMap>(
      el: Element,
      type: K,
      handler: (e: any) => void
    ) => {
      el.addEventListener(type, handler as EventListener);
      cleanupFns.push(() => el.removeEventListener(type, handler as EventListener));
    };

    const openHandler = (e: Event) => {
      e.stopPropagation();
      stage.classList.add('open');
      hint.textContent = 'Klik di mana saja untuk kembali ke Control Center';
    };
    if (audioCard) on(audioCard, 'click', openHandler);

    const stageCloseHandler = () => {
      if (stage.classList.contains('open')) {
        stage.classList.remove('open');
        hint.textContent = 'Klik kartu audio kanan atas untuk membuka Music Player';
      }
    };
    on(stage, 'click', stageCloseHandler);

    // ==== Customize panel: rounded / smoothing / panjang / lebar / opacity kartu music player ====
    const DEFAULTS = {
      radius: 32,
      smoothing: 60,
      height: 78,
      width: 89,
      opacity: 8,
      rotate: 0,
      length: 300,
      coverRadius: 6,
      coverSmooth: 0,
    };

    const ctrlRadius = $<HTMLInputElement>('ctrlRadius');
    const ctrlSmooth = $<HTMLInputElement>('ctrlSmooth');
    const ctrlHeight = $<HTMLInputElement>('ctrlHeight');
    const ctrlWidth = $<HTMLInputElement>('ctrlWidth');
    const ctrlOpacity = $<HTMLInputElement>('ctrlOpacity');
    const ctrlLength = $<HTMLInputElement>('ctrlLength');
    const valRadius = $('valRadius');
    const valSmooth = $('valSmooth');
    const valHeight = $('valHeight');
    const valWidth = $('valWidth');
    const valOpacity = $('valOpacity');
    const valRotate = $('valRotate');
    const valLength = $('valLength');
    const ctrlCoverRadius = $<HTMLInputElement>('ctrlCoverRadius');
    const ctrlCoverSmooth = $<HTMLInputElement>('ctrlCoverSmooth');
    const valCoverRadius = $('valCoverRadius');
    const valCoverSmooth = $('valCoverSmooth');
    const albumArtClipPath = $<SVGPathElement>('albumArtClipPath');
    const albumArtPlaceholderPath = $<SVGPathElement>('albumArtPlaceholderPath');
    const resetBtn = $('resetBtn');
    const cardBgRect = $<SVGPathElement>('cardBgRect');
    const cardBorderRect = $<SVGPathElement>('cardBorderRect');
    const cardClipPath = $<SVGPathElement>('cardClipPath');
    const mpBorderGradient = $<SVGLinearGradientElement>('mpBorder');
    const knobRotate = $('knobRotate');
    const knobIndicator = $<HTMLElement>('knobIndicator');
    let rotateDeg = DEFAULTS.rotate;

    // Kartu digambar di viewBox lokal 336x600 (lihat elemen <svg> #player)
    const CARD_LOCAL_W = 336,
      CARD_LOCAL_H = 600;

    // Path rounded-rect superellipse ("squircle") -- sudut lebih smooth/continuous
    // daripada arc lingkaran biasa, mirip -electron-corner-smoothing / iOS / Figma.
    // n=2 = sudut bulat biasa, makin besar n makin "squircle".
    function squirclePath(
      x0: number,
      y0: number,
      w: number,
      h: number,
      r: number,
      n: number
    ) {
      r = Math.max(0, Math.min(r, w / 2, h / 2));
      if (r < 0.5) return `M ${x0} ${y0} H ${x0 + w} V ${y0 + h} H ${x0} Z`;
      const STEPS = 14,
        HALF_PI = Math.PI / 2;
      const pow = (v: number) => Math.pow(Math.max(0, v), 2 / n);
      const pt = (x: number, y: number) =>
        `L ${(x0 + x).toFixed(2)} ${(y0 + y).toFixed(2)} `;
      let d = `M ${(x0 + r).toFixed(2)} ${y0.toFixed(2)} L ${(x0 + w - r).toFixed(
        2
      )} ${y0.toFixed(2)} `;
      for (let i = 0; i <= STEPS; i++) {
        // top-right
        const t = (i / STEPS) * HALF_PI;
        d += pt(w - r + r * pow(Math.sin(t)), r - r * pow(Math.cos(t)));
      }
      d += pt(w, h - r);
      for (let i = 0; i <= STEPS; i++) {
        // bottom-right
        const t = (i / STEPS) * HALF_PI;
        d += pt(w - r + r * pow(Math.cos(t)), h - r + r * pow(Math.sin(t)));
      }
      d += pt(r, h);
      for (let i = 0; i <= STEPS; i++) {
        // bottom-left
        const t = (i / STEPS) * HALF_PI;
        d += pt(r - r * pow(Math.sin(t)), h - r + r * pow(Math.cos(t)));
      }
      d += pt(0, r);
      for (let i = 0; i <= STEPS; i++) {
        // top-left
        const t = (i / STEPS) * HALF_PI;
        d += pt(r - r * pow(Math.cos(t)), r - r * pow(Math.sin(t)));
      }
      return d + 'Z';
    }

    // Putar arah gradient garis tepi (highlight kaca) di sekitar titik tengah kartu
    function setBorderRotation(deg: number) {
      rotateDeg = ((deg % 360) + 360) % 360;
      const rad = (rotateDeg * Math.PI) / 180;
      const cx = CARD_LOCAL_W / 2,
        cy = CARD_LOCAL_H / 2,
        R = Number(ctrlLength.value);
      const x1 = cx + R * Math.sin(rad),
        y1 = cy - R * Math.cos(rad);
      const x2 = cx - R * Math.sin(rad),
        y2 = cy + R * Math.cos(rad);
      mpBorderGradient.setAttribute('x1', x1.toFixed(2));
      mpBorderGradient.setAttribute('y1', y1.toFixed(2));
      mpBorderGradient.setAttribute('x2', x2.toFixed(2));
      mpBorderGradient.setAttribute('y2', y2.toFixed(2));
      knobIndicator.style.transform = `rotate(${rotateDeg}deg)`;
      valRotate.textContent = Math.round(rotateDeg) + '°';
      valLength.textContent = String(R);
    }

    function applyCardStyle() {
      const r = Number(ctrlRadius.value),
        sm = Number(ctrlSmooth.value);
      const h = ctrlHeight.value,
        w = ctrlWidth.value,
        o = ctrlOpacity.value;
      const n = 2 + (sm / 100) * 3; // 0% -> lingkaran biasa, 100% -> squircle penuh

      cardBgRect.setAttribute('d', squirclePath(0, 0, CARD_LOCAL_W, CARD_LOCAL_H, r, n));
      cardBorderRect.setAttribute(
        'd',
        squirclePath(0.375, 0.375, CARD_LOCAL_W - 0.75, CARD_LOCAL_H - 0.75, Math.max(0, r - 0.375), n)
      );
      // Clip blur/backdrop pakai bentuk PERSIS sama dengan kartu, jadi tidak pernah menutupi garis tepi
      cardClipPath.setAttribute('d', squirclePath(0, 0, CARD_LOCAL_W, CARD_LOCAL_H, r, n));

      stage.style.setProperty('--card-h', h + '%');
      stage.style.setProperty('--card-w', w + '%');
      // "Opacity" = seberapa solid/padat permukaan kartu (aslinya cuma 8%, kaca transparan)
      cardBgRect.setAttribute('fill-opacity', String(Number(o) / 100));
      valRadius.textContent = r + 'px';
      valSmooth.textContent = sm + '%';
      valHeight.textContent = h + '%';
      valWidth.textContent = w + '%';
      valOpacity.textContent = o + '%';
    }

    function applyAlbumArtStyle() {
      const r = Number(ctrlCoverRadius.value),
        sm = Number(ctrlCoverSmooth.value);
      const n = 2 + (sm / 100) * 3;
      const d = squirclePath(27, 27, 282, 282, r, n);
      albumArtClipPath.setAttribute('d', d);
      albumArtPlaceholderPath.setAttribute('d', d);
      valCoverRadius.textContent = r + 'px';
      valCoverSmooth.textContent = sm + '%';
    }

    [ctrlCoverRadius, ctrlCoverSmooth].forEach((el) => {
      on(el, 'input', applyAlbumArtStyle);
      on(el, 'click', (e: Event) => e.stopPropagation());
    });

    [ctrlRadius, ctrlSmooth, ctrlHeight, ctrlWidth, ctrlOpacity].forEach((el) => {
      on(el, 'input', applyCardStyle);
      on(el, 'click', (e: Event) => e.stopPropagation());
    });

    on(ctrlLength, 'input', () => setBorderRotation(rotateDeg));
    on(ctrlLength, 'click', (e: Event) => e.stopPropagation());

    on(resetBtn, 'click', (e: Event) => {
      e.stopPropagation();
      ctrlRadius.value = String(DEFAULTS.radius);
      ctrlSmooth.value = String(DEFAULTS.smoothing);
      ctrlHeight.value = String(DEFAULTS.height);
      ctrlWidth.value = String(DEFAULTS.width);
      ctrlOpacity.value = String(DEFAULTS.opacity);
      ctrlLength.value = String(DEFAULTS.length);
      ctrlCoverRadius.value = String(DEFAULTS.coverRadius);
      ctrlCoverSmooth.value = String(DEFAULTS.coverSmooth);
      renderDuration();
      applyCardStyle();
      applyAlbumArtStyle();
      setBorderRotation(DEFAULTS.rotate);
    });

    // Knob putar (drag) untuk arah garis tepi
    function angleFromPointer(e: PointerEvent) {
      const rect = knobRotate.getBoundingClientRect();
      const cx = rect.left + rect.width / 2,
        cy = rect.top + rect.height / 2;
      return Math.atan2(e.clientX - cx, -(e.clientY - cy)) * (180 / Math.PI);
    }
    let dragging = false;
    on(knobRotate, 'pointerdown', (e: PointerEvent) => {
      e.stopPropagation();
      dragging = true;
      knobRotate.setPointerCapture(e.pointerId);
      setBorderRotation(angleFromPointer(e));
    });
    on(knobRotate, 'pointermove', (e: PointerEvent) => {
      if (!dragging) return;
      e.stopPropagation();
      setBorderRotation(angleFromPointer(e));
    });
    on(knobRotate, 'pointerup', (e: PointerEvent) => {
      dragging = false;
      e.stopPropagation();
    });
    on(knobRotate, 'click', (e: Event) => e.stopPropagation());

    const controlPanels = root.querySelectorAll('.control-panel');
    controlPanels.forEach((panel) => on(panel, 'click', (e: Event) => e.stopPropagation()));

    // ==== Panel terpisah: opacity semua kartu Control Center ====
    const ctrlCcOpacity = $<HTMLInputElement>('ctrlCcOpacity');
    const valCcOpacity = $('valCcOpacity');
    const resetCcBtn = $('resetCcBtn');
    const ccCardSurfaces = Array.from(
      root.querySelectorAll<SVGRectElement>('.cc svg rect[fill-opacity="0.08"]')
    );

    function applyCcOpacity() {
      const opacity = Number(ctrlCcOpacity.value);
      ccCardSurfaces.forEach((card) => card.setAttribute('fill-opacity', String(opacity / 100)));
      valCcOpacity.textContent = opacity + '%';
    }

    on(ctrlCcOpacity, 'input', applyCcOpacity);
    on(ctrlCcOpacity, 'click', (e: Event) => e.stopPropagation());
    on(resetCcBtn, 'click', (e: Event) => {
      e.stopPropagation();
      ctrlCcOpacity.value = '8';
      applyCcOpacity();
    });

    // ==== Upload gambar custom untuk album art ====
    const ctrlAlbumArt = $<HTMLInputElement>('ctrlAlbumArt');
    const uploadArtBtn = $('uploadArtBtn');
    const removeArtBtn = $<HTMLElement>('removeArtBtn');
    const albumArtImage = $<SVGImageElement>('albumArtImage');
    const albumArtPlaceholder = $<SVGElement>('albumArtPlaceholder');

    on(uploadArtBtn, 'click', (e: Event) => {
      e.stopPropagation();
      ctrlAlbumArt.click();
    });
    on(removeArtBtn, 'click', (e: Event) => {
      e.stopPropagation();
      albumArtImage.setAttribute('href', '');
      albumArtImage.setAttribute('xlink:href', '');
      albumArtImage.setAttribute('opacity', '0');
      albumArtPlaceholder.setAttribute('opacity', '0.25');
      removeArtBtn.style.display = 'none';
      ctrlAlbumArt.value = '';
    });
    on(ctrlAlbumArt, 'click', (e: Event) => e.stopPropagation());
    on(ctrlAlbumArt, 'change', () => {
      const file = ctrlAlbumArt.files && ctrlAlbumArt.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        albumArtImage.setAttribute('href', dataUrl);
        albumArtImage.setAttribute('xlink:href', dataUrl);
        albumArtImage.setAttribute('opacity', '1');
        albumArtPlaceholder.setAttribute('opacity', '0');
        removeArtBtn.style.display = 'block';
      };
      reader.readAsDataURL(file);
    });

    // ==== Custom judul & artis ====
    const ctrlSongTitle = $<HTMLInputElement>('ctrlSongTitle');
    const ctrlSongArtist = $<HTMLInputElement>('ctrlSongArtist');
    const songTitle = $('songTitle');
    const songArtist = $('songArtist');
    const ctrlMusicFont = $<HTMLSelectElement>('ctrlMusicFont');

    function applyMusicFont() {
      const font = ctrlMusicFont.value === 'black' ? 'SF Pro Display Black' : 'SF Pro Display Medium';
      [songTitle, songArtist, $('timeElapsed'), $('timeRemaining')].forEach((el) =>
        el.setAttribute('font-family', `'${font}', sans-serif`)
      );
    }
    on(ctrlMusicFont, 'change', applyMusicFont);
    on(ctrlMusicFont, 'click', (e: Event) => e.stopPropagation());
    on(ctrlSongTitle, 'input', () => {
      songTitle.textContent = ctrlSongTitle.value || ' ';
    });
    on(ctrlSongArtist, 'input', () => {
      songArtist.textContent = ctrlSongArtist.value || ' ';
    });
    [ctrlSongTitle, ctrlSongArtist].forEach((el) => on(el, 'click', (e: Event) => e.stopPropagation()));

    // ==== Toggle Play / Pause ====
    const playIcon = $<HTMLElement>('playIcon');
    const pauseIcon = $<HTMLElement>('pauseIcon');
    const playPauseHit = $('playPauseHit');
    const playPauseIconGroup = $('playPauseIconGroup');
    let isPlaying = false;

    // ==== Durasi lagu: waktu berjalan & sisa durasi ====
    const timeElapsed = $('timeElapsed');
    const timeRemaining = $('timeRemaining');
    const progressFill = $<SVGRectElement>('progressFill');
    // Nilai default (demo, gak ada musik asli di-upload) -- begitu ada
    // audio asli, songTotal & elapsed ngikut audio.duration/currentTime
    // beneran (lihat wiring ctrlAudioFile di bawah).
    let songTotal = 225; // total durasi 3:45
    let elapsed = 113; // posisi awal 1:53 (sesuai progress di desain)
    let audioEl: HTMLAudioElement | null = null;
    let audioObjectUrl: string | null = null;
    let tickTimer: ReturnType<typeof setInterval> | null = null;

    function fmtTime(sec: number) {
      sec = Math.max(0, Math.round(sec));
      return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
    }
    function renderDuration() {
      timeElapsed.textContent = fmtTime(elapsed);
      timeRemaining.textContent = '-' + fmtTime(songTotal - elapsed);
      progressFill.setAttribute('width', ((282 * elapsed) / songTotal).toFixed(2));
    }
    function startTick() {
      // Demo doang (belum ada musik asli) -- kalau audio asli udah
      // di-upload, progress ngikut event 'timeupdate' beneran (lihat
      // wiring ctrlAudioFile), bukan interval palsu ini.
      stopTick();
      tickTimer = setInterval(() => {
        elapsed = elapsed + 1;
        if (elapsed > songTotal) elapsed = 0;
        renderDuration();
      }, 1000);
    }
    function stopTick() {
      if (tickTimer) {
        clearInterval(tickTimer);
        tickTimer = null;
      }
    }
    function setBounce() {
      playPauseIconGroup.classList.remove('bounce');
      void playPauseIconGroup.offsetWidth; // reflow biar animasi bisa diulang
      playPauseIconGroup.classList.add('bounce');
    }
    function setPlayingIcon(playing: boolean) {
      playIcon.style.opacity = playing ? '0' : '1';
      pauseIcon.style.opacity = playing ? '1' : '0';
    }
    on(playPauseIconGroup, 'animationend', () => {
      playPauseIconGroup.classList.remove('bounce');
    });
    on(playPauseHit, 'click', (e: Event) => {
      e.stopPropagation();
      setBounce();
      if (audioEl) {
        // Ada musik asli -- play/pause elemen <audio> beneran, progress &
        // durasi di-update lewat event 'timeupdate'/'play'/'pause' di bawah.
        if (audioEl.paused) audioEl.play().catch(() => {});
        else audioEl.pause();
        return;
      }
      // Belum ada musik asli -- fallback demo (timer palsu, kayak sebelumnya).
      isPlaying = !isPlaying;
      setPlayingIcon(isPlaying);
      if (isPlaying) startTick();
      else stopTick();
    });

    // ==== Upload musik asli (tab Audio) ====
    const ctrlAudioFile = $<HTMLInputElement>('ctrlAudioFile');
    const uploadAudioBtn = $('uploadAudioBtn');
    const removeAudioBtn = $('removeAudioBtn');
    const audioFileName = $('audioFileName');

    function teardownAudio() {
      if (audioEl) {
        audioEl.pause();
        audioEl.src = '';
        audioEl = null;
      }
      if (audioObjectUrl) {
        URL.revokeObjectURL(audioObjectUrl);
        audioObjectUrl = null;
      }
    }

    on(uploadAudioBtn, 'click', (e: Event) => {
      e.stopPropagation();
      ctrlAudioFile.click();
    });
    on(ctrlAudioFile, 'click', (e: Event) => e.stopPropagation());
    on(removeAudioBtn, 'click', (e: Event) => {
      e.stopPropagation();
      stopTick();
      teardownAudio();
      isPlaying = false;
      setPlayingIcon(false);
      songTotal = 225;
      elapsed = 113;
      renderDuration();
      ctrlAudioFile.value = '';
      audioFileName.textContent = 'Belum ada musik -- preview pakai durasi contoh (3:45)';
      removeAudioBtn.style.display = 'none';
    });
    on(ctrlAudioFile, 'change', () => {
      const file = ctrlAudioFile.files && ctrlAudioFile.files[0];
      if (!file) return;
      stopTick();
      teardownAudio();
      audioObjectUrl = URL.createObjectURL(file);
      const el = new Audio(audioObjectUrl);
      audioEl = el;
      audioFileName.textContent = file.name;
      removeAudioBtn.style.display = 'block';
      on(el, 'loadedmetadata', () => {
        songTotal = el.duration || songTotal;
        elapsed = 0;
        renderDuration();
      });
      on(el, 'timeupdate', () => {
        elapsed = el.currentTime;
        renderDuration();
      });
      on(el, 'play', () => {
        isPlaying = true;
        setPlayingIcon(true);
      });
      on(el, 'pause', () => {
        isPlaying = false;
        setPlayingIcon(false);
      });
      on(el, 'ended', () => {
        isPlaying = false;
        setPlayingIcon(false);
        elapsed = 0;
        renderDuration();
      });
    });

    applyCardStyle();
    applyAlbumArtStyle();
    applyCcOpacity();
    applyMusicFont();
    setBorderRotation(DEFAULTS.rotate);
    renderDuration();
    // Beda dari cc-player asli: di sini player TIDAK auto-terbuka. Video/
    // preview harus mulai dari Control Center dulu (sesuai konsep timeline),
    // baru kebuka pas kartu audio diklik.

    return () => {
      stopTick();
      teardownAudio();
      cleanupFns.forEach((fn) => fn());
    };
  }, []);

  // Effect terpisah (bukan digabung ke effect mount-only di atas) -- tiap
  // activeTab berubah (user pindah tab Media/Audio/Lanjutan atau nutup
  // sheet-nya), cuma toggle class `.active` di panel-group yang cocok.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.querySelectorAll<HTMLElement>('.panel-group').forEach((el) => {
      el.classList.toggle('active', el.dataset.group === activeTab);
    });
  }, [activeTab]);

  return (
    <div className="cc26-root" ref={rootRef}>
      <div id="stage" className="cc26-stage-col stage" dangerouslySetInnerHTML={{ __html: STAGE_MARKUP }} />
      {/* Sheet-nya sekarang komponen generik EditorSheet (lihat
          src/components/editor/TemplateEditorTabs.tsx) -- posisi/animasi
          slide/header "Selesai"-nya udah gak ditulis manual di sini lagi,
          template lain yang butuh sheet serupa tinggal pakai komponen yang
          sama. Isi panel (Media/Audio/Lanjutan) tetap markup SVG-spesifik
          punya widget ini sendiri, jadi tetap disuntik lewat
          dangerouslySetInnerHTML sebagai children. */}
      <EditorSheet
        open={!!activeTab}
        title={activeTabLabel}
        onClose={onClose ?? (() => {})}
        className="cc26-panel-sheet"
      >
        <div
          className="contents"
          dangerouslySetInnerHTML={{ __html: PANELS_MARKUP }}
        />
      </EditorSheet>
    </div>
  );
}
