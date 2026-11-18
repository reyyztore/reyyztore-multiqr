'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  Camera, Image as ImageIcon, Star, Send, Share2, Coins, X,
  RefreshCw, Phone, Sparkles, CheckCircle2
} from 'lucide-react';

export default function CustomerPublicPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [tender, setTender] = useState<any>(null);
  const [globalSettings, setGlobalSettings] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal QRIS Support Pojok Kiri Atas
  const [showSupportModal, setShowSupportModal] = useState(false);

  // Kamera & Foto
  const [cameraOpen, setCameraOpen] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [rawImageSrc, setRawImageSrc] = useState<string>('');
  const [framedDataUrl, setFramedDataUrl] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Form Pelanggan (Cuma No WA + Bintang + Ulasan)
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

    // Realtime Subscription untuk Ulasan Baru & Perubahan Tema Tender
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

  // Buka Kamera Browser
  const startCamera = async (mode: 'user' | 'environment' = facingMode) => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1080 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch {
      alert('Izin kamera ditolak atau perangkat tidak mendukung kamera langsung. Silakan pilih dari galeri.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
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
      if (typeof reader.result === 'string') {
        setRawImageSrc(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Gabungkan Foto dengan Bingkai Modern Tender X
  useEffect(() => {
    if (!rawImageSrc || !tender) {
      setFramedDataUrl('');
      return;
    }

    const activeFrame = tender.theme_config?.active_frame_url || '';
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 900;
    const ctx = canvas.getContext('2d')!;

    const baseImg = new Image();
    baseImg.crossOrigin = 'anonymous';
    baseImg.onload = () => {
      // Crop center square
      const minSide = Math.min(baseImg.width, baseImg.height);
      const sx = (baseImg.width - minSide) / 2;
      const sy = (baseImg.height - minSide) / 2;

      if (activeFrame === 'preset:polaroid') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 900, 900);
        ctx.drawImage(baseImg, sx, sy, minSide, minSide, 55, 55, 790, 690);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 30px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(tender.business_name, 450, 825);
        setFramedDataUrl(canvas.toDataURL('image/webp', 0.85));
      } else if (activeFrame === 'preset:gold') {
        ctx.drawImage(baseImg, sx, sy, minSide, minSide, 0, 0, 900, 900);
        const grad = ctx.createLinearGradient(0, 0, 900, 900);
        grad.addColorStop(0, '#f59e0b');
        grad.addColorStop(0.5, '#fef08a');
        grad.addColorStop(1, '#d97706');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 36;
        ctx.strokeRect(18, 18, 864, 864);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
        ctx.fillRect(0, 810, 900, 90);
        ctx.fillStyle = '#fde047';
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`★ ${tender.business_name} ★`, 450, 865);
        setFramedDataUrl(canvas.toDataURL('image/webp', 0.85));
      } else if (activeFrame === 'preset:neon') {
        ctx.drawImage(baseImg, sx, sy, minSide, minSide, 0, 0, 900, 900);
        const grad = ctx.createLinearGradient(0, 0, 900, 900);
        grad.addColorStop(0, '#ec4899');
        grad.addColorStop(0.5, '#8b5cf6');
        grad.addColorStop(1, '#06b6d4');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 32;
        ctx.strokeRect(16, 16, 868, 868);
        setFramedDataUrl(canvas.toDataURL('image/webp', 0.85));
      } else if (activeFrame && !activeFrame.startsWith('preset:')) {
        ctx.drawImage(baseImg, sx, sy, minSide, minSide, 0, 0, 900, 900);
        const frameOverlay = new Image();
        frameOverlay.crossOrigin = 'anonymous';
        frameOverlay.onload = () => {
          ctx.drawImage(frameOverlay, 0, 0, 900, 900);
          setFramedDataUrl(canvas.toDataURL('image/webp', 0.85));
        };
        frameOverlay.onerror = () => {
          setFramedDataUrl(canvas.toDataURL('image/webp', 0.85));
        };
        frameOverlay.src = activeFrame;
      } else {
        ctx.drawImage(baseImg, sx, sy, minSide, minSide, 0, 0, 900, 900);
        setFramedDataUrl(canvas.toDataURL('image/webp', 0.85));
      }
    };
    baseImg.src = rawImageSrc;
  }, [rawImageSrc, tender]);

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
      if (framedDataUrl) {
        const res = await fetch(framedDataUrl);
        const blob = await res.blob();
        const fileName = `${tender.slug}/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.webp`;
        const { error: upErr } = await supabase.storage.from('uploads').upload(fileName, blob, {
          contentType: 'image/webp',
        });
        if (!upErr) {
          const { data: pub } = supabase.storage.from('uploads').getPublicUrl(fileName);
          uploadedUrl = pub.publicUrl;
        }
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
      } else {
        alert('Gagal mengirim ulasan: ' + error.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Share ke WA / IG / Story
  const handleSocialShare = async (photoUrl?: string, textComment?: string) => {
    const shareText = `Momen seru di ${tender?.business_name}! "${textComment || 'Pelayanan mantap!'}" — Cek di ${window.location.href}`;

    if (navigator.share && photoUrl) {
      try {
        const response = await fetch(photoUrl);
        const blob = await response.blob();
        const file = new File([blob], `${tender.slug}-moment.webp`, { type: 'image/webp' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: tender.business_name,
            text: shareText,
            files: [file],
          });
          return;
        }
      } catch {
        // fallback ke text share
      }
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: tender.business_name,
          text: shareText,
          url: window.location.href,
        });
        return;
      } catch {
        // ignore cancel
      }
    }

    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  const maskPhone = (phone: string) => {
    if (phone.length < 7) return phone;
    return `${phone.slice(0, 4)}-****-${phone.slice(-3)}`;
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Memuat...</div>;
  }

  if (!tender) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-slate-400">
        <p className="text-lg font-semibold text-white">Halaman Tidak Ditemukan atau Nonaktif</p>
        <p className="text-xs mt-1">Pastikan QR Code yang Anda scan valid.</p>
      </div>
    );
  }

  const theme = tender.theme_config || {};

  return (
    <div
      style={{ backgroundColor: theme.bg_color || '#0f172a' }}
      className="min-h-screen text-white relative pb-20 transition-colors"
    >
      {/* POJOK KIRI ATAS: LOGO UANG SUPPORT SISTEM SEIKHLASMU */}
      <button
        onClick={() => setShowSupportModal(true)}
        title="Support Sistem Ini Seikhlasmu"
        className="fixed top-4 left-4 z-40 flex items-center gap-2 px-3 py-2 rounded-full bg-amber-500/95 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xl shadow-amber-500/20 transition transform hover:scale-105"
      >
        <Coins className="w-4 h-4" />
        <span className="hidden sm:inline">Support</span>
      </button>

      {/* POP-UP MODAL QRIS SUPPORT */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full p-6 text-center relative shadow-2xl">
            <button
              onClick={() => setShowSupportModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3">
              <Coins className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">
              {globalSettings?.support_title || 'Support Sistem Ini Seikhlasmu'}
            </h3>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Scan atau simpan QRIS di bawah ini untuk mendukung pengembangan platform
            </p>
            {globalSettings?.support_qris_url ? (
              <div className="bg-white p-3 rounded-2xl inline-block mx-auto mb-4">
                <img
                  src={globalSettings.support_qris_url}
                  alt="QRIS Support"
                  className="w-56 h-auto rounded-xl"
                />
              </div>
            ) : (
              <div className="p-6 bg-slate-950 rounded-2xl text-xs text-slate-500 mb-4">
                QRIS belum diunggah oleh Admin.
              </div>
            )}
            {globalSettings?.support_qris_url && (
              <a
                href={globalSettings.support_qris_url}
                download="QRIS-Support-Reyyztore.png"
                target="_blank"
                rel="noreferrer"
                className="block w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition"
              >
                Buka / Simpan Gambar QRIS
              </a>
            )}
          </div>
        </div>
      )}

      {/* KONTEN UTAMA */}
      <div className="max-w-lg mx-auto px-4 pt-14 space-y-6">
        {/* Header Brand Tender X */}
        <div className="text-center space-y-2">
          {theme.logo_url && (
            <img
              src={theme.logo_url}
              alt={tender.business_name}
              className="w-20 h-20 rounded-2xl object-cover mx-auto shadow-xl border border-white/15"
            />
          )}
          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-semibold bg-white/10 text-slate-200">
            {tender.business_name}
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight">{theme.header_title}</h1>
          <p className="text-xs text-slate-300 max-w-sm mx-auto">{theme.header_subtitle}</p>
        </div>

        {/* Notifikasi Berhasil + Tombol Share Instan ke WA / IG / Story */}
        {submittedPhotoUrl !== null && (
          <div className="p-5 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 text-center space-y-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <p className="text-sm font-bold text-white">Ulasan & Momenmu Sudah Live!</p>
            {submittedPhotoUrl && (
              <img
                src={submittedPhotoUrl}
                alt="Hasil Foto"
                className="w-44 h-44 object-cover rounded-2xl mx-auto border border-white/20 shadow-lg"
              />
            )}
            <button
              onClick={() => handleSocialShare(submittedPhotoUrl || undefined)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 font-bold text-xs text-white flex items-center justify-center gap-2 shadow-lg"
            >
              <Share2 className="w-4 h-4" /> Bagikan ke IG Story / WhatsApp
            </button>
          </div>
        )}

        {/* FORM ULASAN & KAMERA BERBINGKAI */}
        <form
          onSubmit={handleSubmitReview}
          className={`p-5 rounded-3xl border space-y-4 shadow-2xl ${
            theme.card_style === 'solid'
              ? 'bg-slate-900 border-slate-800'
              : 'bg-white/10 backdrop-blur-xl border-white/15'
          }`}
        >
          {/* Area Kamera & Bingkai */}
          <div className="space-y-3">
            {cameraOpen ? (
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-square">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                />
                <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={switchCamera}
                    className="p-3 rounded-full bg-black/60 text-white backdrop-blur-md"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={captureFromCamera}
                    style={{ backgroundColor: theme.primary_color || '#6366f1' }}
                    className="px-6 py-3 rounded-full font-bold text-xs text-white shadow-xl"
                  >
                    Jepret Foto
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="p-3 rounded-full bg-red-600/80 text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ) : framedDataUrl ? (
              <div className="relative rounded-2xl overflow-hidden aspect-square bg-black">
                <img src={framedDataUrl} alt="Preview Bingkai" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setRawImageSrc('');
                    setFramedDataUrl('');
                  }}
                  className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-black/70 text-white text-xs flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" /> Ganti Foto
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => startCamera()}
                  className="py-4 px-3 rounded-2xl bg-black/30 hover:bg-black/40 border border-white/15 flex flex-col items-center justify-center gap-1.5 text-xs font-medium transition"
                >
                  <Camera className="w-6 h-6 text-indigo-400" />
                  <span>Buka Kamera</span>
                </button>
                <label className="py-4 px-3 rounded-2xl bg-black/30 hover:bg-black/40 border border-white/15 flex flex-col items-center justify-center gap-1.5 text-xs font-medium cursor-pointer transition">
                  <ImageIcon className="w-6 h-6 text-pink-400" />
                  <span>Pilih Galeri</span>
                  <input type="file" accept="image/*" onChange={handleGalleryUpload} className="hidden" />
                </label>
              </div>
            )}
          </div>

          {/* Rating Bintang */}
          <div className="flex items-center justify-center gap-2 py-1">
            {[1, 2, 3, 4, 5].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setRating(num)}
                className="p-1 transition transform hover:scale-110"
              >
                <Star
                  className={`w-8 h-8 ${
                    num <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-500'
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Input Nomor WhatsApp Saja */}
          <div>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                inputMode="numeric"
                required
                placeholder="Nomor WhatsApp (Contoh: 08123456789)"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ''))}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-black/30 border border-white/15 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-white/40"
              />
            </div>
          </div>

          {/* Komentar / Ulasan */}
          <div>
            <textarea
              rows={3}
              required
              placeholder="Tulis ulasan atau kesanmu di sini..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full p-3.5 rounded-xl bg-black/30 border border-white/15 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-white/40"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{ backgroundColor: theme.primary_color || '#6366f1' }}
            className="w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-lg transition hover:opacity-95 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {submitting ? 'Mengirim...' : 'Kirim Ulasan Sekarang'}
          </button>
        </form>

        {/* GALERI LIVE FEED REAL-TIME */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" /> Ulasan & Momen Terbaru ({reviews.length})
            </h2>
            <span className="text-[11px] text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" /> Live
            </span>
          </div>

          {reviews.length === 0 ? (
            <div className="p-8 rounded-2xl bg-white/5 border border-white/10 text-center text-xs text-slate-400">
              Jadilah yang pertama membagikan momen & ulasan di sini!
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((rev) => (
                <div
                  key={rev.id}
                  className={`p-4 rounded-2xl border space-y-3 ${
                    theme.card_style === 'solid'
                      ? 'bg-slate-900 border-slate-800'
                      : 'bg-white/10 backdrop-blur-md border-white/15'
                  }`}
                >
                  {rev.photo_url && (
                    <img
                      src={rev.photo_url}
                      alt="Momen Pelanggan"
                      className="w-full aspect-square object-cover rounded-xl border border-white/10"
                    />
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-300">
                      {maskPhone(rev.whatsapp_number)}
                    </span>
                    <div className="flex items-center gap-0.5 text-amber-400">
                      {Array.from({ length: rev.rating }).map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-slate-100 leading-relaxed">{rev.comment}</p>
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                    <span>{new Date(rev.created_at).toLocaleDateString('id-ID')}</span>
                    <button
                      type="button"
                      onClick={() => handleSocialShare(rev.photo_url, rev.comment)}
                      className="inline-flex items-center gap-1 text-white/90 hover:text-white font-medium bg-white/10 px-2.5 py-1 rounded-lg"
                    >
                      <Share2 className="w-3 h-3" /> Share WA / IG / Story
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* BAWAH TENGAH: WATERMARK PERMANEN REYYZTORE */}
      <footer className="fixed bottom-0 inset-x-0 py-2.5 bg-slate-950/85 backdrop-blur-md border-t border-white/10 text-center z-30">
        <a
          href={globalSettings?.watermark_url || 'https://wa.me/6283830108419'}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-slate-400 hover:text-white transition"
        >
          {globalSettings?.watermark_text || 'Powered by Reyyztore'}
        </a>
      </footer>
    </div>
  );
}
