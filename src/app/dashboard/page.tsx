'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { QRCodeCanvas } from 'qrcode.react';
import {
  QrCode, MessageSquare, Palette, Download, Eye, EyeOff, Edit3,
  Trash2, LogOut, ExternalLink, Upload, Check, X, Phone, Star,
  Image as ImageIcon, ArrowUpRight, Sparkles
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

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editComment, setEditComment] = useState('');

  const [theme, setTheme] = useState<any>({
    logo_url: '',
    header_title: 'Bagikan Momen & Ulasanmu!',
    header_subtitle: 'Ambil foto kece dengan bingkai spesial kami dan tinggalkan ulasanmu.',
    primary_color: '#f59e0b',
    bg_color: '#14110f',
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
    return <div className="min-h-screen bg-[#14110f] flex items-center justify-center text-stone-400">Memuat Dashboard...</div>;
  }

  const visibleCount = reviews.filter((r) => r.is_visible).length;

  return (
    <div className="min-h-screen bg-[#14110f] text-stone-100 relative overflow-hidden pb-20">
      {/* Warm Ambient Orbs */}
      <div className="fixed -top-32 -left-24 w-[420px] h-[420px] bg-amber-600/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[400px] h-[400px] bg-orange-500/15 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 pt-5 flex flex-col lg:flex-row gap-5 relative z-10">
        {/* Floating Pill Sidebar */}
        <aside className="lg:w-16 glass-v7 rounded-3xl lg:rounded-full p-2.5 flex lg:flex-col items-center justify-between lg:justify-start gap-3 h-fit lg:sticky lg:top-5">
          <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-amber-400 to-orange-400 flex items-center justify-center text-stone-950 font-black shadow-lg shrink-0">
            {tenderData.business_name.slice(0, 1).toUpperCase()}
          </div>

          <nav className="flex lg:flex-col items-center gap-2">
            {[
              { id: 'qr', icon: QrCode, label: 'QR Code' },
              { id: 'reviews', icon: MessageSquare, label: 'Moderasi Ulasan' },
              { id: 'theme', icon: Palette, label: 'Edit Tampilan' },
            ].map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  title={item.label}
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                    active
                      ? 'bg-amber-400 text-stone-950 shadow-lg shadow-amber-400/30 scale-105'
                      : 'text-stone-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </button>
              );
            })}
          </nav>

          <button
            onClick={handleLogout}
            className="w-11 h-11 rounded-full bg-white/5 hover:bg-rose-500/20 text-stone-400 hover:text-rose-300 flex items-center justify-center lg:mt-auto transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </aside>

        {/* Main Content */}
        <div className="flex-1 space-y-5">
          <header className="glass-v7 rounded-3xl px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs text-amber-300/90 font-medium flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Client Dashboard
              </p>
              <h1 className="text-2xl font-bold text-white mt-0.5">{tenderData.business_name}</h1>
            </div>
            <a
              href={`/t/${tenderData.slug}`}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 text-stone-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg transition hover:brightness-105"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Buka Web Pelanggan
            </a>
          </header>

          {/* Bento Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-v7-amber rounded-3xl p-5 flex flex-col justify-between">
              <span className="text-xs font-bold uppercase text-stone-950/80">Total Ulasan Masuk</span>
              <div className="mt-3 flex items-end justify-between">
                <span className="text-3xl font-black text-stone-950">{reviews.length}</span>
                <span className="text-xs font-bold text-stone-950 bg-white/30 px-2.5 py-0.5 rounded-full">
                  Real-time
                </span>
              </div>
            </div>

            <div className="glass-v7-card rounded-3xl p-5 flex flex-col justify-between">
              <span className="text-xs text-stone-300">Tampil di Publik</span>
              <div className="mt-3 flex items-end justify-between">
                <span className="text-3xl font-bold text-white">{visibleCount}</span>
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-0.5">
                  <ArrowUpRight className="w-3.5 h-3.5" /> Aktif
                </span>
              </div>
            </div>

            <div className="glass-v7-card rounded-3xl p-5 flex flex-col justify-between">
              <span className="text-xs text-stone-300">Disembunyikan (Hidden)</span>
              <div className="mt-3 flex items-end justify-between">
                <span className="text-3xl font-bold text-white">{reviews.length - visibleCount}</span>
                <span className="text-xs text-stone-400">Moderasi</span>
              </div>
            </div>
          </div>

          {/* TAB 1: QR CODE */}
          {activeTab === 'qr' && (
            <div className="max-w-md mx-auto glass-v7 rounded-[2rem] p-8 text-center space-y-6 animate-fade-up">
              <div>
                <h2 className="text-xl font-bold text-white">QR Code {tenderData.business_name}</h2>
                <p className="text-xs text-stone-400 mt-1">
                  Scan QR ini untuk membuka kamera bingkai & form ulasan
                </p>
              </div>

              <div ref={qrRef} className="bg-white p-6 rounded-3xl inline-block shadow-2xl">
                {publicUrl && <QRCodeCanvas value={publicUrl} size={230} level="H" includeMargin={true} />}
              </div>

              <div className="p-3 bg-black/35 border border-white/10 rounded-2xl text-xs font-mono text-amber-300 break-all">
                {publicUrl}
              </div>

              <button
                onClick={downloadQR}
                className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-orange-400 text-stone-950 font-bold rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg transition"
              >
                <Download className="w-4 h-4" /> Download QR Code (PNG)
              </button>
            </div>
          )}

          {/* TAB 2: MODERASI ULASAN */}
          {activeTab === 'reviews' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-up">
              {reviews.map((rev) => (
                <div
                  key={rev.id}
                  className={`glass-v7-card rounded-3xl p-5 flex flex-col justify-between gap-4 ${
                    !rev.is_visible ? 'opacity-65 border-amber-500/40' : ''
                  }`}
                >
                  <div className="flex gap-4">
                    {rev.photo_url && (
                      <a href={rev.photo_url} target="_blank" rel="noreferrer" className="shrink-0">
                        <img src={rev.photo_url} alt="Foto" className="w-24 h-24 object-cover rounded-2xl border border-white/15" />
                      </a>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 text-xs font-mono text-emerald-300 bg-emerald-500/15 px-2.5 py-0.5 rounded-full">
                          <Phone className="w-3 h-3" /> {rev.whatsapp_number}
                        </span>
                        <span className={`text-[11px] px-2.5 py-0.5 rounded-full ${rev.is_visible ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                          {rev.is_visible ? 'Tampil' : 'Hidden'}
                        </span>
                      </div>

                      <div className="flex items-center gap-0.5 text-amber-400 my-1.5">
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
                            className="w-full p-2.5 bg-black/40 border border-amber-400 rounded-xl text-xs text-white"
                          />
                          <div className="flex gap-2">
                            <button onClick={() => saveEditedComment(rev.id)} className="px-3 py-1 bg-emerald-500 text-stone-950 font-bold rounded-full text-xs flex items-center gap-1">
                              <Check className="w-3 h-3" /> Simpan
                            </button>
                            <button onClick={() => setEditingId(null)} className="px-3 py-1 bg-white/10 text-stone-300 rounded-full text-xs flex items-center gap-1">
                              <X className="w-3 h-3" /> Batal
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-stone-200 break-words">{rev.comment}</p>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                    <span className="text-stone-400">{new Date(rev.created_at).toLocaleDateString('id-ID')}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => toggleVisibility(rev.id, rev.is_visible)}
                        className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-amber-400 hover:text-stone-950 text-stone-200 flex items-center gap-1 transition"
                      >
                        {rev.is_visible ? <><EyeOff className="w-3.5 h-3.5" /> Hide</> : <><Eye className="w-3.5 h-3.5" /> Show</>}
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(rev.id);
                          setEditComment(rev.comment);
                        }}
                        className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-stone-200 flex items-center gap-1 transition"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => deleteReview(rev.id)}
                        className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-rose-500 text-stone-200 hover:text-white flex items-center gap-1 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Hapus
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: THEME & FRAME EDITOR */}
          {activeTab === 'theme' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-up">
              <div className="glass-v7 rounded-3xl p-6 space-y-5">
                <h2 className="font-bold text-lg text-white">Edit Tampilan & Bingkai Kamera</h2>

                <div>
                  <label className="block text-xs text-stone-400 mb-1.5">Logo Brand</label>
                  <div className="flex items-center gap-3">
                    {theme.logo_url && <img src={theme.logo_url} alt="Logo" className="w-12 h-12 rounded-2xl object-cover border border-white/15" />}
                    <label className="px-4 py-2.5 bg-black/35 border border-white/10 hover:border-amber-400 rounded-2xl text-xs text-stone-200 cursor-pointer flex items-center gap-2">
                      <Upload className="w-4 h-4 text-amber-400" />
                      {uploadingAsset ? 'Mengunggah...' : 'Upload Logo'}
                      <input type="file" accept="image/*" onChange={(e) => handleUploadFile(e, 'logo')} className="hidden" />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-stone-400 mb-1">Judul Halaman</label>
                  <input
                    type="text"
                    value={theme.header_title}
                    onChange={(e) => setTheme({ ...theme, header_title: e.target.value })}
                    className="w-full px-4 py-3 bg-black/35 border border-white/10 rounded-2xl text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs text-stone-400 mb-1">Sub-judul Sambutan</label>
                  <textarea
                    rows={2}
                    value={theme.header_subtitle}
                    onChange={(e) => setTheme({ ...theme, header_subtitle: e.target.value })}
                    className="w-full px-4 py-3 bg-black/35 border border-white/10 rounded-2xl text-sm text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-stone-400 mb-1">Warna Tombol / Aksen</label>
                    <div className="flex items-center gap-2 bg-black/35 border border-white/10 p-2 rounded-2xl">
                      <input type="color" value={theme.primary_color} onChange={(e) => setTheme({ ...theme, primary_color: e.target.value })} className="w-8 h-8 rounded-xl cursor-pointer bg-transparent border-0" />
                      <span className="text-xs font-mono text-stone-300">{theme.primary_color}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-stone-400 mb-1">Warna Latar Belakang</label>
                    <div className="flex items-center gap-2 bg-black/35 border border-white/10 p-2 rounded-2xl">
                      <input type="color" value={theme.bg_color} onChange={(e) => setTheme({ ...theme, bg_color: e.target.value })} className="w-8 h-8 rounded-xl cursor-pointer bg-transparent border-0" />
                      <span className="text-xs font-mono text-stone-300">{theme.bg_color}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-white/10">
                  <label className="block text-xs font-bold text-amber-300 uppercase tracking-wider">Bingkai Foto Kamera</label>
                  <div className="grid grid-cols-2 gap-2">
                    {PRESET_FRAMES.map((pf) => (
                      <button
                        key={pf.id}
                        type="button"
                        onClick={() => setTheme({ ...theme, active_frame_url: pf.url })}
                        className={`p-3 rounded-2xl text-xs text-left border transition ${
                          theme.active_frame_url === pf.url ? 'bg-amber-400/20 border-amber-400 text-white' : 'bg-black/35 border-white/10 text-stone-400'
                        }`}
                      >
                        {pf.name}
                      </button>
                    ))}
                  </div>
                  <label className="flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-white/20 hover:border-amber-400 rounded-2xl cursor-pointer text-xs text-stone-200">
                    <ImageIcon className="w-4 h-4 text-amber-400" />
                    Upload Bingkai Custom (PNG Transparan)
                    <input type="file" accept="image/png" onChange={(e) => handleUploadFile(e, 'frame')} className="hidden" />
                  </label>
                </div>

                <button
                  onClick={saveThemeConfig}
                  disabled={savingTheme}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-orange-400 text-stone-950 font-bold rounded-2xl text-sm shadow-lg transition"
                >
                  {savingTheme ? 'Menyimpan...' : 'Simpan & Terapkan ke Web Pelanggan'}
                </button>
              </div>

              {/* Live Preview */}
              <div className="glass-v7 rounded-3xl p-6">
                <p className="text-xs text-stone-400 uppercase tracking-wider mb-3">Live Preview</p>
                <div style={{ backgroundColor: theme.bg_color }} className="rounded-3xl p-6 border border-white/15 min-h-[440px] flex flex-col items-center text-center">
                  {theme.logo_url && <img src={theme.logo_url} alt="Logo" className="w-16 h-16 rounded-2xl object-cover mb-3 shadow-lg" />}
                  <h3 className="text-xl font-bold text-white">{theme.header_title}</h3>
                  <p className="text-xs text-stone-300 mt-1 max-w-xs">{theme.header_subtitle}</p>
                  <div className="w-full mt-6 p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-left space-y-3">
                    <div className="h-28 rounded-xl bg-black/30 flex items-center justify-center text-xs text-stone-300">Kamera + Bingkai Aktif</div>
                    <div className="h-9 rounded-xl bg-black/30 px-3 flex items-center text-xs text-stone-400">Nomor WhatsApp</div>
                    <button type="button" style={{ backgroundColor: theme.primary_color }} className="w-full py-2.5 rounded-xl text-xs font-bold text-white">Kirim Ulasan</button>
                  </div>
                  <div className="mt-auto pt-6 text-[11px] text-stone-400">Powered by <strong className="text-white">Reyyztore</strong></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
