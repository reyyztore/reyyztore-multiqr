'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { CINEMATIC_FRAMES, renderFramedPhoto } from '@/lib/frames';
import {
  Camera, Image as ImageIcon, Star, Send, Share2, Coins, X,
  RefreshCw, Phone, Sparkles, CheckCircle2, Heart
} from 'lucide-react';

export default function CustomerPublicPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [tender, setTender] = useState<any>(null);
  const [globalSettings, setGlobalSettings] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSupportModal, setShowSupportModal] = useState(false);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [rawImageSrc, setRawImageSrc] = useState<string>('');
  const [selectedFrame, setSelectedFrame] = useState<string>('tender-default');
  const [framedDataUrl, setFramedDataUrl] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [whatsapp, setWhatsapp] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedPhotoUrl, setSubmittedPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    initPageData();
  }, [slug]);

  const initPageData = async () => {
    const { data: gData } = await supabase.from('global_settings').select('*').eq('id', 1).single();
    if (gData) setGlobalSettings(gData);

    const { data: tData } = await supabase
      .from('tenders')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (!tData) {
      setLoading(false);
      return;
    }

    setTender(tData);
    await fetchVisibleReviews(tData.id);
    setLoading(false);

    const channel = supabase
      .channel(`public-tender-${tData.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reviews', filter: `tender_id=eq.${tData.id}` },
        () => fetchVisibleReviews(tData.id)
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tenders', filter: `id=eq.${tData.id}` },
        (payload) => setTender(payload.new)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'global_settings' },
        (payload) => { if (payload.new) setGlobalSettings(payload.new); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchVisibleReviews = async (tenderId: string) => {
    const { data } = await supabase
      .from('reviews')
      .select('*')
      .eq('tender_id', tenderId)
      .eq('is_visible', true)
      .order('created_at', { ascending: false });
    if (data) setReviews(data);
  };

  const startCamera = async (mode: 'user' | 'environment' = facingMode) => {
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1080 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 100);
    } catch {
      alert('Izin kamera tidak tersedia. Silakan gunakan tombol Galeri.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
  };

  const switchCamera = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const captureFromCamera = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const tempCanvas = document.createElement('canvas');
    const size = Math.min(video.videoWidth, video.videoHeight);
    tempCanvas.width = 900;
    tempCanvas.height = 900;
    const ctx = tempCanvas.getContext('2d')!;
    const sx = (video.videoWidth - size) / 2;
    const sy = (video.videoHeight - size) / 2;

    if (facingMode === 'user') {
      ctx.translate(900, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, sx, sy, size, size, 0, 0, 900, 900);
    const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.9);
    stopCamera();
    setRawImageSrc(dataUrl);
  };

  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setRawImageSrc(reader.result);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (!rawImageSrc || !tender) {
      setFramedDataUrl('');
      return;
    }
    renderFramedPhoto(
      rawImageSrc,
      selectedFrame,
      tender.theme_config?.active_frame_url || '',
      tender.business_name
    ).then((res) => setFramedDataUrl(res));
  }, [rawImageSrc, selectedFrame, tender]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanWa = whatsapp.replace(/\D/g, '');
    if (cleanWa.length < 9) {
      alert('Masukkan nomor WhatsApp yang valid.');
      return;
    }

    setSubmitting(true);
    let uploadedUrl = '';

    try {
      const imageToUpload = framedDataUrl || rawImageSrc;
      if (imageToUpload) {
        const res = await fetch(imageToUpload);
        const blob = await res.blob();
        const fileName = `${tender.slug}/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.webp`;
        const { error: upErr } = await supabase.storage.from('uploads').upload(fileName, blob, {
          contentType: blob.type || 'image/webp',
          upsert: true,
        });
        if (upErr) {
          alert('Gagal mengunggah foto: ' + upErr.message);
          setSubmitting(false);
          return;
        }
        const { data: pub } = supabase.storage.from('uploads').getPublicUrl(fileName);
        uploadedUrl = pub.publicUrl;
      }

      const { error } = await supabase.from('reviews').insert({
        tender_id: tender.id,
        whatsapp_number: cleanWa,
        rating,
        comment: comment.trim(),
        photo_url: uploadedUrl,
        is_visible: true,
      });

      if (!error) {
        setSubmittedPhotoUrl(uploadedUrl || null);
        setRawImageSrc('');
        setFramedDataUrl('');
        setComment('');
        setRating(5);
        await fetchVisibleReviews(tender.id);
      } else {
        alert('Gagal mengirim ulasan: ' + error.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSocialShare = async (photoUrl?: string, textComment?: string) => {
    const shareText = `Momen seru di ${tender?.business_name}! "${textComment || 'Pelayanan mantap!'}" — Cek di ${window.location.href}`;

    if (navigator.share && photoUrl) {
      try {
        const response = await fetch(photoUrl);
        const blob = await response.blob();
        const file = new File([blob], `${tender.slug}-moment.webp`, { type: 'image/webp' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ title: tender.business_name, text: shareText, files: [file] });
          return;
        }
      } catch {}
    }

    if (navigator.share) {
      try {
        await navigator.share({ title: tender.business_name, text: shareText, url: window.location.href });
        return;
      } catch {}
    }

    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  const maskPhone = (phone: string) => {
    if (phone.length < 7) return phone;
    return `${phone.slice(0, 4)} •••• ${phone.slice(-3)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050811] flex flex-col items-center justify-center gap-3 text-slate-400">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs tracking-wider uppercase">Memuat Pengalaman...</p>
      </div>
    );
  }

  if (!tender) {
    return (
      <div className="min-h-screen bg-[#050811] flex flex-col items-center justify-center p-6 text-center">
        <p className="text-lg font-bold text-white">Halaman Tidak Ditemukan</p>
        <p className="text-xs text-slate-400 mt-1">QR Code tidak aktif atau alamat salah.</p>
      </div>
    );
  }

  const theme = tender.theme_config || {};
  const accentColor = theme.primary_color || '#6366f1';

  return (
    <div
      style={{ backgroundColor: theme.bg_color || '#060913' }}
      className="min-h-screen text-white relative overflow-hidden pb-24 transition-colors duration-500"
    >
      <div
        style={{ backgroundColor: accentColor }}
        className="fixed -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[340px] rounded-full opacity-25 blur-[130px] pointer-events-none"
      />
      <div
        style={{ backgroundColor: accentColor }}
        className="fixed bottom-10 -right-24 w-72 h-72 rounded-full opacity-15 blur-[110px] pointer-events-none"
      />

      {/* POJOK KIRI ATAS: FLOATING GOLD SUPPORT PILL */}
      <button
        onClick={() => setShowSupportModal(true)}
        title="Support Sistem Ini Seikhlasmu"
        className="fixed top-4 left-4 z-40 group flex items-center gap-2 pl-2.5 pr-3.5 py-2 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 font-extrabold text-xs shadow-[0_8px_25px_rgba(245,158,11,0.4)] hover:scale-105 active:scale-95 transition-all"
      >
        <span className="w-6 h-6 rounded-full bg-slate-950/15 flex items-center justify-center">
          <Coins className="w-3.5 h-3.5 text-slate-950" />
        </span>
        <span>Support</span>
      </button>

      {/* MODAL QRIS SUPPORT */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-up">
          <div className="glass-panel rounded-[2rem] max-w-sm w-full p-6 text-center relative">
            <button
              onClick={() => setShowSupportModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-amber-500/30">
              <Heart className="w-7 h-7 fill-slate-950" />
            </div>
            <h3 className="text-lg font-extrabold text-white">
              {globalSettings?.support_title || 'Support Sistem Ini Seikhlasmu'}
            </h3>
            <p className="text-xs text-slate-400 mt-1 mb-5">
              Terima kasih sudah mendukung pengembangan teknologi lokal kami
            </p>
            {globalSettings?.support_qris_url ? (
              <div className="bg-white p-3.5 rounded-2xl inline-block mx-auto mb-5 shadow-2xl">
                <img
                  src={globalSettings.support_qris_url}
                  alt="QRIS Support"
                  className="w-56 h-auto rounded-xl"
                />
              </div>
            ) : (
              <div className="p-6 bg-white/5 rounded-2xl text-xs text-slate-400 mb-5">
                QRIS belum diunggah oleh Admin.
              </div>
            )}
            {globalSettings?.support_qris_url && (
              <a
                href={globalSettings.support_qris_url}
                download="QRIS-Support-Reyyztore.png"
                target="_blank"
                rel="noreferrer"
                className="block w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/25 transition hover:brightness-105"
              >
                Simpan Gambar QRIS
              </a>
            )}
          </div>
        </div>
      )}

      {/* KONTEN UTAMA */}
      <div className="max-w-md mx-auto px-4 pt-16 space-y-6 relative z-10">
        <div className="text-center space-y-2.5 animate-fade-up">
          {theme.logo_url && (
            <div className="relative inline-block">
              <div
                style={{ backgroundColor: accentColor }}
                className="absolute inset-0 rounded-3xl blur-md opacity-60"
              />
              <img
                src={theme.logo_url}
                alt={tender.business_name}
                className="relative w-20 h-20 rounded-3xl object-cover mx-auto border-2 border-white/25 shadow-2xl"
              />
            </div>
          )}
          <div>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase bg-white/10 border border-white/10 text-white/90 backdrop-blur-md">
              <Sparkles className="w-3 h-3 text-amber-300" /> {tender.business_name}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
            {theme.header_title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300/90 max-w-xs mx-auto leading-relaxed">
            {theme.header_subtitle}
          </p>
        </div>

        {/* Kartu Sukses + One-Click Share */}
        {submittedPhotoUrl !== null && (
          <div className="glass-card-light rounded-[2rem] p-5 text-center space-y-3.5 border-emerald-400/30 animate-fade-up">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-white">Momen & Ulasan Terkirim!</p>
              <p className="text-[11px] text-slate-300">Langsung bagikan fotomu ke Story sekarang</p>
            </div>
            {submittedPhotoUrl && (
              <img
                src={submittedPhotoUrl}
                alt="Hasil Foto"
                className="w-44 h-44 object-cover rounded-2xl mx-auto border-2 border-white/20 shadow-xl"
              />
            )}
            <button
              onClick={() => handleSocialShare(submittedPhotoUrl || undefined)}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 font-extrabold text-xs text-white flex items-center justify-center gap-2 shadow-lg shadow-pink-500/30 active:scale-95 transition"
            >
              <Share2 className="w-4 h-4" /> Share ke IG Story / WhatsApp
            </button>
          </div>
        )}

        {/* BENTO CARD FORM KAMERA & 10 BINGKAI */}
        <form
          onSubmit={handleSubmitReview}
          className={`p-5 rounded-[2rem] space-y-4 animate-fade-up ${
            theme.card_style === 'solid'
              ? 'bg-slate-900/95 border border-slate-800 shadow-2xl'
              : 'glass-card-light'
          }`}
        >
          <div>
            {cameraOpen ? (
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-square shadow-inner">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                />
                <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={switchCamera}
                    className="w-11 h-11 rounded-full bg-black/55 backdrop-blur-md border border-white/20 flex items-center justify-center text-white"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={captureFromCamera}
                    className="w-16 h-16 rounded-full bg-white p-1 shadow-2xl active:scale-90 transition"
                  >
                    <div
                      style={{ backgroundColor: accentColor }}
                      className="w-full h-full rounded-full flex items-center justify-center"
                    >
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="w-11 h-11 rounded-full bg-rose-600/85 backdrop-blur-md flex items-center justify-center text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ) : framedDataUrl ? (
              <div className="space-y-3">
                <div className="relative rounded-2xl overflow-hidden aspect-square bg-black shadow-xl">
                  <img src={framedDataUrl} alt="Preview Bingkai" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setRawImageSrc('');
                      setFramedDataUrl('');
                    }}
                    className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-white text-xs font-semibold flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" /> Ulangi
                  </button>
                </div>

                {/* 10 PILIHAN BINGKAI INTERAKTIF & SINEMATIS */}
                <div>
                  <p className="text-[11px] font-bold text-amber-300 uppercase tracking-wider mb-2">
                    Pilih Bingkai Sinematis (10 Gaya):
                  </p>
                  <div className="flex gap-2 overflow-x-auto pb-1.5">
                    {CINEMATIC_FRAMES.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setSelectedFrame(f.id)}
                        className={`shrink-0 px-3.5 py-2 rounded-2xl text-xs font-bold border transition flex items-center gap-1.5 ${
                          selectedFrame === f.id
                            ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-lg scale-105'
                            : 'bg-black/40 text-slate-300 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <span>{f.badge}</span>
                        <span>{f.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => startCamera()}
                  className="py-5 px-3 rounded-2xl bg-black/30 hover:bg-black/45 border border-white/10 flex flex-col items-center justify-center gap-2 text-xs font-semibold transition group"
                >
                  <div
                    style={{ backgroundColor: `${accentColor}33` }}
                    className="w-11 h-11 rounded-2xl flex items-center justify-center group-hover:scale-110 transition"
                  >
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                  <span>Kamera Langsung</span>
                </button>
                <label className="py-5 px-3 rounded-2xl bg-black/30 hover:bg-black/45 border border-white/10 flex flex-col items-center justify-center gap-2 text-xs font-semibold cursor-pointer transition group">
                  <div className="w-11 h-11 rounded-2xl bg-pink-500/20 flex items-center justify-center group-hover:scale-110 transition">
                    <ImageIcon className="w-5 h-5 text-pink-300" />
                  </div>
                  <span>Pilih Galeri</span>
                  <input type="file" accept="image/*" onChange={handleGalleryUpload} className="hidden" />
                </label>
              </div>
            )}
          </div>

          {/* Rating Bintang Interaktif */}
          <div className="bg-black/25 rounded-2xl py-2.5 px-4 flex items-center justify-between border border-white/5">
            <span className="text-xs font-medium text-slate-300">Beri Rating</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setRating(num)}
                  className="p-0.5 transition transform hover:scale-125 active:scale-95"
                >
                  <Star
                    className={`w-7 h-7 transition ${
                      num <= rating
                        ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                        : 'text-slate-600'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Input Nomor WhatsApp */}
          <div className="relative">
            <Phone className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="tel"
              inputMode="numeric"
              required
              placeholder="Nomor WhatsApp (08xxxxxxxxxx)"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ''))}
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-black/35 border border-white/10 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-white/35 transition"
            />
          </div>

          {/* Input Ulasan */}
          <textarea
            rows={3}
            required
            placeholder="Ceritakan pengalaman seru atau ulasanmu di sini..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full p-4 rounded-2xl bg-black/35 border border-white/10 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-white/35 transition"
          />

          <button
            type="submit"
            disabled={submitting}
            style={{ backgroundColor: accentColor }}
            className="w-full py-4 rounded-2xl font-extrabold text-sm text-white flex items-center justify-center gap-2 shadow-xl transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {submitting ? 'Memposting Momen...' : 'Kirim Ulasan & Foto'}
          </button>
        </form>

        {/* LIVE SOCIAL WALL FEED */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-extrabold tracking-wide flex items-center gap-2">
              <span>Live Wall Pelanggan</span>
              <span className="px-2 py-0.5 rounded-full bg-white/10 text-[11px] font-bold">
                {reviews.length}
              </span>
            </h2>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-bold text-emerald-300 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> Real-Time
            </span>
          </div>

          {reviews.length === 0 ? (
            <div className="p-10 rounded-[2rem] bg-white/5 border border-white/10 text-center space-y-1">
              <p className="text-sm font-bold text-white/80">Belum ada postingan</p>
              <p className="text-xs text-slate-400">Jadilah yang pertama muncul di dinding live ini!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((rev) => (
                <div
                  key={rev.id}
                  className={`rounded-[2rem] overflow-hidden animate-fade-up ${
                    theme.card_style === 'solid'
                      ? 'bg-slate-900 border border-slate-800 shadow-xl'
                      : 'glass-card-light'
                  }`}
                >
                  {rev.photo_url && (
                    <div className="p-2.5 pb-0">
                      <img
                        src={rev.photo_url}
                        alt="Momen Pelanggan"
                        className="w-full aspect-square object-cover rounded-[1.5rem] border border-white/10"
                      />
                    </div>
                  )}

                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          style={{ backgroundColor: `${accentColor}40` }}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border border-white/15"
                        >
                          {rev.whatsapp_number.slice(-2)}
                        </div>
                        <div>
                          <p className="text-xs font-bold font-mono text-white">
                            {maskPhone(rev.whatsapp_number)}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {new Date(rev.created_at).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-0.5 bg-black/30 px-2.5 py-1 rounded-full">
                        {Array.from({ length: rev.rating }).map((_, i) => (
                          <Star key={i} className="w-3 h-3 text-amber-400 fill-amber-400" />
                        ))}
                      </div>
                    </div>

                    <p className="text-sm text-slate-100 leading-relaxed">{rev.comment}</p>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleSocialShare(rev.photo_url, rev.comment)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/10 px-3.5 py-2 rounded-xl transition active:scale-95"
                      >
                        <Share2 className="w-3.5 h-3.5" /> Share WA / IG / Story
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* BAWAH TENGAH: FLOATING CAPSULE WATERMARK REYYZTORE */}
      <footer className="fixed bottom-3 inset-x-0 flex justify-center pointer-events-none z-30">
        <a
          href={globalSettings?.watermark_url || 'https://wa.me/6283830108419'}
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto px-4 py-1.5 rounded-full bg-slate-950/80 backdrop-blur-xl border border-white/10 text-[11px] font-medium text-slate-300 hover:text-white hover:border-white/25 shadow-2xl transition"
        >
          {globalSettings?.watermark_text || 'Powered by Reyyztore'}
        </a>
      </footer>
    </div>
  );
}
