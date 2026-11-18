'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { QRCodeCanvas } from 'qrcode.react';
import {
  QrCode, MessageSquare, Palette, Download, Eye, EyeOff, Edit3,
  Trash2, LogOut, ExternalLink, Upload, Check, X, Phone, Star, Image as ImageIcon
} from 'lucide-react';

const PRESET_FRAMES = [
  { id: 'none', name: 'Tanpa Bingkai', url: '' },
  { id: 'gold-luxe', name: 'Gold Modern Border', url: 'preset:gold' },
  { id: 'neon-cyber', name: 'Neon Cyber Gradient', url: 'preset:neon' },
  { id: 'polaroid-clean', name: 'Classic Polaroid White', url: 'preset:polaroid' },
];

export default function TenderDashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [tenderData, setTenderData] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'qr' | 'reviews' | 'theme'>('qr');
  const [publicUrl, setPublicUrl] = useState('');

  // State Edit Ulasan
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editComment, setEditComment] = useState('');

  // State Theme Editor
  const [theme, setTheme] = useState<any>({
    logo_url: '',
    header_title: 'Bagikan Momen & Ulasanmu!',
    header_subtitle: 'Ambil foto kece dengan bingkai spesial kami dan tinggalkan ulasanmu.',
    primary_color: '#6366f1',
    bg_color: '#0f172a',
    card_style: 'glass',
    active_frame_url: '',
    require_photo: false,
  });
  const [savingTheme, setSavingTheme] = useState(false);
  const [uploadingAsset, setUploadingAsset] = useState(false);

  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const raw = localStorage.getItem('reyyztore_session');
    if (!raw) {
      router.push('/login');
      return;
    }
    const parsed = JSON.parse(raw);
    if (parsed.role === 'admin') {
      router.push('/admin');
      return;
    }
    setSession(parsed);
    if (typeof window !== 'undefined') {
      setPublicUrl(`${window.location.origin}/t/${parsed.slug}`);
    }
    loadTenderAndReviews(parsed.id);

    // Realtime listener untuk ulasan masuk baru
    const channel = supabase
      .channel(`tender-reviews-${parsed.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reviews', filter: `tender_id=eq.${parsed.id}` },
        () => loadReviewsOnly(parsed.id)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  const loadTenderAndReviews = async (tenderId: string) => {
    const { data: tData } = await supabase.from('tenders').select('*').eq('id', tenderId).single();
    if (tData) {
      setTenderData(tData);
      if (tData.theme_config) setTheme({ ...theme, ...tData.theme_config });
    }
    loadReviewsOnly(tenderId);
  };

  const loadReviewsOnly = async (tenderId: string) => {
    const { data: rData } = await supabase
      .from('reviews')
      .select('*')
      .eq('tender_id', tenderId)
      .order('created_at', { ascending: false });
    if (rData) setReviews(rData);
  };

  const downloadQR = () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `QR-${session?.slug || 'tender'}.png`;
    a.click();
  };

  const toggleVisibility = async (id: string, current: boolean) => {
    await supabase.from('reviews').update({ is_visible: !current }).eq('id', id);
    loadReviewsOnly(session.id);
  };

  const saveEditedComment = async (id: string) => {
    await supabase.from('reviews').update({ comment: editComment }).eq('id', id);
    setEditingId(null);
    loadReviewsOnly(session.id);
  };

  const deleteReview = async (id: string) => {
    if (!confirm('Hapus permanen ulasan dan foto ini?')) return;
    await supabase.from('reviews').delete().eq('id', id);
    loadReviewsOnly(session.id);
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>, target: 'logo' | 'frame') => {
    const file = e.target.files?.[0];
    if (!file || !session) return;
    setUploadingAsset(true);
    const bucket = target === 'logo' ? 'assets' : 'frames';
    const fileName = `${session.slug}-${target}-${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from(bucket).upload(fileName, file);
    if (!error) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
      if (target === 'logo') {
        setTheme({ ...theme, logo_url: data.publicUrl });
      } else {
        setTheme({ ...theme, active_frame_url: data.publicUrl });
      }
    }
    setUploadingAsset(false);
  };

  const saveThemeConfig = async () => {
    if (!session) return;
    setSavingTheme(true);
    const { error } = await supabase
      .from('tenders')
      .update({ theme_config: theme })
      .eq('id', session.id);
    setSavingTheme(false);
    if (!error) alert('Tampilan & Bingkai halaman pelanggan berhasil diperbarui secara real-time!');
  };

  const handleLogout = () => {
    localStorage.removeItem('reyyztore_session');
    router.push('/login');
  };

  if (!tenderData) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Memuat Dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg text-white">{tenderData.business_name}</h1>
            <p className="text-xs text-slate-400">Dashboard Kontrol & Moderasi Ulasan</p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/t/${tenderData.slug}`}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600 hover:text-white text-xs font-medium flex items-center gap-1.5 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Lihat Web Pelanggan
            </a>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 pt-6 space-y-6">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab('qr')}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition ${
              activeTab === 'qr' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <QrCode className="w-4 h-4" /> QR Code Tender
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition ${
              activeTab === 'reviews' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4" /> Kelola Ulasan ({reviews.length})
          </button>
          <button
            onClick={() => setActiveTab('theme')}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition ${
              activeTab === 'theme' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <Palette className="w-4 h-4" /> Edit Tampilan & Bingkai
          </button>
        </div>

        {/* TAB 1: QR CODE TENDER */}
        {activeTab === 'qr' && (
          <div className="max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">QR Code {tenderData.business_name}</h2>
              <p className="text-xs text-slate-400 mt-1">
                Cetak atau tampilkan QR ini agar pelanggan bisa foto berbingkai & memberi ulasan
              </p>
            </div>

            <div ref={qrRef} className="bg-white p-6 rounded-2xl inline-block shadow-xl">
              {publicUrl && (
                <QRCodeCanvas
                  value={publicUrl}
                  size={240}
                  level="H"
                  includeMargin={true}
                />
              )}
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-indigo-400 break-all">
              {publicUrl}
            </div>

            <button
              onClick={downloadQR}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition shadow-lg shadow-indigo-600/25"
            >
              <Download className="w-4 h-4" /> Download QR Code (PNG)
            </button>
          </div>
        )}

        {/* TAB 2: MODERASI ULASAN (EDIT / HIDE / DELETE) */}
        {activeTab === 'reviews' && (
          <div className="space-y-4">
            {reviews.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-sm">
                Belum ada ulasan atau foto masuk. Bagikan QR Code Anda untuk mulai menerima ulasan!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className={`bg-slate-900 border rounded-2xl p-5 flex flex-col justify-between gap-4 transition ${
                      rev.is_visible ? 'border-slate-800' : 'border-amber-500/40 opacity-75'
                    }`}
                  >
                    <div className="flex gap-4">
                      {rev.photo_url && (
                        <a href={rev.photo_url} target="_blank" rel="noreferrer" className="shrink-0">
                          <img
                            src={rev.photo_url}
                            alt="Foto Pelanggan"
                            className="w-24 h-24 object-cover rounded-xl border border-slate-700"
                          />
                        </a>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                            <Phone className="w-3 h-3" /> {rev.whatsapp_number}
                          </span>
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-full ${
                              rev.is_visible ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {rev.is_visible ? 'Tampil Publik' : 'Disembunyikan'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-amber-400 my-1.5">
                          {Array.from({ length: rev.rating }).map((_, idx) => (
                            <Star key={idx} className="w-3.5 h-3.5 fill-amber-400" />
                          ))}
                        </div>

                        {editingId === rev.id ? (
                          <div className="space-y-2 mt-2">
                            <textarea
                              rows={2}
                              value={editComment}
                              onChange={(e) => setEditComment(e.target.value)}
                              className="w-full p-2 bg-slate-950 border border-indigo-500 rounded-lg text-xs text-white"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => saveEditedComment(rev.id)}
                                className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs flex items-center gap-1"
                              >
                                <Check className="w-3 h-3" /> Simpan
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="px-3 py-1 bg-slate-800 text-slate-300 rounded-lg text-xs flex items-center gap-1"
                              >
                                <X className="w-3 h-3" /> Batal
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-slate-200 break-words">{rev.comment}</p>
                        )}
                      </div>
                    </div>

                    {/* Tombol Aksi Moderasi */}
                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <span className="text-slate-500">
                        {new Date(rev.created_at).toLocaleString('id-ID')}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => toggleVisibility(rev.id, rev.is_visible)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 flex items-center gap-1 transition"
                        >
                          {rev.is_visible ? <><EyeOff className="w-3.5 h-3.5" /> Sembunyikan</> : <><Eye className="w-3.5 h-3.5" /> Tampilkan</>}
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(rev.id);
                            setEditComment(rev.comment);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white flex items-center gap-1 transition"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => deleteReview(rev.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white flex items-center gap-1 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: FULL THEME & FRAME EDITOR */}
        {activeTab === 'theme' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
              <h2 className="font-bold text-lg text-white">Kustomisasi Tampilan Halaman Pelanggan</h2>

              {/* Logo */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Logo Brand / Tender</label>
                <div className="flex items-center gap-3">
                  {theme.logo_url && (
                    <img src={theme.logo_url} alt="Logo" className="w-12 h-12 rounded-xl object-cover border border-slate-700" />
                  )}
                  <label className="px-4 py-2.5 bg-slate-950 border border-slate-800 hover:border-indigo-500 rounded-xl text-xs text-slate-300 cursor-pointer flex items-center gap-2">
                    <Upload className="w-4 h-4 text-indigo-400" />
                    {uploadingAsset ? 'Mengunggah...' : 'Upload Logo'}
                    <input type="file" accept="image/*" onChange={(e) => handleUploadFile(e, 'logo')} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Judul & Deskripsi */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Judul Utama Halaman</label>
                <input
                  type="text"
                  value={theme.header_title}
                  onChange={(e) => setTheme({ ...theme, header_title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Sub-judul / Teks Sambutan</label>
                <textarea
                  rows={2}
                  value={theme.header_subtitle}
                  onChange={(e) => setTheme({ ...theme, header_subtitle: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white"
                />
              </div>

              {/* Warna */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Warna Tombol / Aksen</label>
                  <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 p-2 rounded-xl">
                    <input
                      type="color"
                      value={theme.primary_color}
                      onChange={(e) => setTheme({ ...theme, primary_color: e.target.value })}
                      className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                    />
                    <span className="text-xs font-mono text-slate-300">{theme.primary_color}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Warna Latar Belakang</label>
                  <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 p-2 rounded-xl">
                    <input
                      type="color"
                      value={theme.bg_color}
                      onChange={(e) => setTheme({ ...theme, bg_color: e.target.value })}
                      className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                    />
                    <span className="text-xs font-mono text-slate-300">{theme.bg_color}</span>
                  </div>
                </div>
              </div>

              {/* Gaya Kartu */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Gaya Kartu Ulasan</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['glass', 'solid'] as const).map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setTheme({ ...theme, card_style: style })}
                      className={`py-2.5 px-3 rounded-xl text-xs font-medium border capitalize ${
                        theme.card_style === style
                          ? 'bg-indigo-600/20 border-indigo-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {style === 'glass' ? 'Glassmorphism Modern' : 'Dark Solid Clean'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pilihan Bingkai Kamera */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <label className="block text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                  Bingkai Foto Kamera Pelanggan
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_FRAMES.map((pf) => (
                    <button
                      key={pf.id}
                      type="button"
                      onClick={() => setTheme({ ...theme, active_frame_url: pf.url })}
                      className={`p-2.5 rounded-xl text-xs text-left border transition ${
                        theme.active_frame_url === pf.url
                          ? 'bg-indigo-600/20 border-indigo-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {pf.name}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-slate-700 hover:border-indigo-500 rounded-xl cursor-pointer text-xs text-slate-300">
                    <ImageIcon className="w-4 h-4 text-indigo-400" />
                    Upload Bingkai Custom (PNG Transparan)
                    <input type="file" accept="image/png" onChange={(e) => handleUploadFile(e, 'frame')} className="hidden" />
                  </label>
                  {theme.active_frame_url && !theme.active_frame_url.startsWith('preset:') && (
                    <p className="text-[11px] text-emerald-400 mt-1.5">✓ Bingkai custom PNG aktif terpasang</p>
                  )}
                </div>
              </div>

              <button
                onClick={saveThemeConfig}
                disabled={savingTheme}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold text-sm text-white transition shadow-lg"
              >
                {savingTheme ? 'Menyimpan Perubahan...' : 'Simpan & Terapkan ke Web Pelanggan'}
              </button>
            </div>

            {/* Live Mini Preview */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Live Preview Tampilan Pelanggan</p>
              <div
                style={{ backgroundColor: theme.bg_color }}
                className="rounded-3xl p-6 border border-slate-700/60 min-h-[460px] flex flex-col items-center text-center transition-colors"
              >
                {theme.logo_url && (
                  <img src={theme.logo_url} alt="Logo" className="w-16 h-16 rounded-2xl object-cover mb-3 shadow-lg" />
                )}
                <h3 className="text-xl font-bold text-white">{theme.header_title}</h3>
                <p className="text-xs text-slate-300 mt-1 max-w-xs">{theme.header_subtitle}</p>

                <div
                  className={`w-full mt-6 p-4 rounded-2xl border text-left space-y-3 ${
                    theme.card_style === 'glass'
                      ? 'bg-white/10 backdrop-blur-md border-white/15'
                      : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div className="h-28 rounded-xl bg-black/30 border border-white/10 flex items-center justify-center text-xs text-slate-300">
                    Area Kamera + Bingkai Aktif
                  </div>
                  <div className="h-9 rounded-lg bg-black/30 border border-white/10 px-3 flex items-center text-xs text-slate-400">
                    Nomor WhatsApp (08xx...)
                  </div>
                  <button
                    type="button"
                    style={{ backgroundColor: theme.primary_color }}
                    className="w-full py-2.5 rounded-xl text-xs font-semibold text-white"
                  >
                    Kirim Ulasan & Foto
                  </button>
                </div>

                <div className="mt-auto pt-6 text-[11px] text-slate-400">
                  Powered by <strong className="text-white">Reyyztore</strong>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
