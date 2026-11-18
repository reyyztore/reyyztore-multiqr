'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  ShieldCheck, Users, MessageSquare, QrCode, Plus, Trash2,
  ExternalLink, Download, Search, LogOut, Power, Upload, Phone,
  Star, Eye, EyeOff, ArrowUpRight, Sparkles, LayoutGrid
} from 'lucide-react';

export default function SuperAdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'tenders' | 'customers' | 'qris'>('overview');
  const [tenders, setTenders] = useState<any[]>([]);
  const [allReviews, setAllReviews] = useState<any[]>([]);
  const [globalSettings, setGlobalSettings] = useState<any>({
    support_qris_url: '',
    support_title: 'Support Sistem Ini Seikhlasmu',
    watermark_text: 'Powered by Reyyztore',
    watermark_url: 'https://wa.me/6283830108419',
  });

  const [businessName, setBusinessName] = useState('');
  const [username, setUsername] = useState('');
  const [slug, setSlug] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [creating, setCreating] = useState(false);

  const [filterTender, setFilterTender] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadingQris, setUploadingQris] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem('reyyztore_session');
    if (!raw) {
      router.push('/login');
      return;
    }
    const session = JSON.parse(raw);
    if (session.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
    fetchAllData();
  }, [router]);

  const fetchAllData = async () => {
    const { data: tendersData } = await supabase
      .from('tenders')
      .select('*')
      .eq('role', 'tender')
      .order('created_at', { ascending: false });
    if (tendersData) setTenders(tendersData);

    const { data: reviewsData } = await supabase
      .from('reviews')
      .select('*, tenders(business_name, slug)')
      .order('created_at', { ascending: false });
    if (reviewsData) setAllReviews(reviewsData);

    const { data: settingsData } = await supabase
      .from('global_settings')
      .select('*')
      .eq('id', 1)
      .single();
    if (settingsData) setGlobalSettings(settingsData);
  };

  const handleCreateTender = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pinCode.length !== 6 || !/^\d{6}$/.test(pinCode)) {
      alert('PIN wajib 6 digit angka!');
      return;
    }
    setCreating(true);
    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const cleanUser = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');

    const { error } = await supabase.from('tenders').insert({
      business_name: businessName.trim(),
      username: cleanUser,
      slug: cleanSlug,
      pin_code: pinCode,
      role: 'tender',
    });

    setCreating(false);
    if (error) {
      alert('Gagal membuat Tender: ' + error.message);
    } else {
      setBusinessName('');
      setUsername('');
      setSlug('');
      setPinCode('');
      fetchAllData();
    }
  };

  const toggleTenderActive = async (id: string, currentStatus: boolean) => {
    await supabase.from('tenders').update({ is_active: !currentStatus }).eq('id', id);
    fetchAllData();
  };

  const handleDeleteTender = async (id: string, name: string) => {
    if (!confirm(`Hapus permanen "${name}" beserta seluruh ulasan & fotonya?`)) return;
    await supabase.from('tenders').delete().eq('id', id);
    fetchAllData();
  };

  const handleUploadQris = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingQris(true);
    const fileName = `qris-support-${Date.now()}.${file.name.split('.').pop()}`;
    const { error: upErr } = await supabase.storage.from('assets').upload(fileName, file);
    if (!upErr) {
      const { data: urlData } = supabase.storage.from('assets').getPublicUrl(fileName);
      setGlobalSettings({ ...globalSettings, support_qris_url: urlData.publicUrl });
    }
    setUploadingQris(false);
  };

  const handleSaveGlobalSettings = async () => {
    const { error } = await supabase
      .from('global_settings')
      .update({
        support_qris_url: globalSettings.support_qris_url,
        support_title: globalSettings.support_title,
        watermark_text: globalSettings.watermark_text,
        watermark_url: globalSettings.watermark_url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);

    if (!error) alert('Pengaturan QRIS Support & Watermark berhasil disimpan!');
  };

  const filteredReviews = allReviews.filter((r) => {
    const matchTender = filterTender === 'all' || r.tender_id === filterTender;
    const matchSearch =
      r.whatsapp_number.includes(searchQuery) ||
      r.comment.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.tenders?.business_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchTender && matchSearch;
  });

  const exportToCSV = () => {
    const headers = ['Waktu', 'Nama Tender', 'Nomor WhatsApp', 'Rating', 'Komentar', 'Status Tampil', 'URL Foto'];
    const rows = filteredReviews.map((r) => [
      new Date(r.created_at).toLocaleString('id-ID'),
      `"${r.tenders?.business_name || '-'}"`,
      `"${r.whatsapp_number}"`,
      r.rating,
      `"${r.comment.replace(/"/g, '""')}"`,
      r.is_visible ? 'Tampil' : 'Disembunyikan',
      r.photo_url || '-',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `master-crm-reyyztore-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLogout = () => {
    localStorage.removeItem('reyyztore_session');
    router.push('/login');
  };

  const uniqueWaCount = new Set(allReviews.map((r) => r.whatsapp_number)).size;
  const avgRating = allReviews.length
    ? (allReviews.reduce((acc, r) => acc + r.rating, 0) / allReviews.length).toFixed(1)
    : '5.0';

  // Data grafik batang per tender
  const chartData = tenders.slice(0, 7).map((t) => ({
    name: t.business_name.slice(0, 8),
    count: allReviews.filter((r) => r.tender_id === t.id).length,
  }));
  const maxChart = Math.max(...chartData.map((d) => d.count), 1);

  return (
    <div className="min-h-screen bg-[#14110f] text-stone-100 relative overflow-hidden pb-16">
      {/* Warm Espresso & Amber Ambient Glow */}
      <div className="fixed -top-32 -left-24 w-[450px] h-[450px] bg-amber-600/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed top-1/3 right-0 w-[400px] h-[400px] bg-orange-500/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed -bottom-32 left-1/3 w-[500px] h-[350px] bg-stone-500/15 rounded-full blur-[130px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 pt-5 flex flex-col lg:flex-row gap-5 relative z-10">
        {/* FLOATING PILL SIDEBAR (Gaya Glassy V7) */}
        <aside className="lg:w-16 glass-v7 rounded-3xl lg:rounded-full p-2.5 flex lg:flex-col items-center justify-between lg:justify-start gap-3 h-fit lg:sticky lg:top-5">
          <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-stone-950 font-black shadow-lg shadow-amber-500/30 shrink-0">
            R
          </div>

          <nav className="flex lg:flex-col items-center gap-2">
            {[
              { id: 'overview', icon: LayoutGrid, label: 'Overview' },
              { id: 'tenders', icon: Users, label: 'Akun Tender' },
              { id: 'customers', icon: MessageSquare, label: 'CRM Pelanggan' },
              { id: 'qris', icon: QrCode, label: 'QRIS & Watermark' },
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
            title="Keluar"
            className="w-11 h-11 rounded-full bg-white/5 hover:bg-rose-500/20 text-stone-400 hover:text-rose-300 flex items-center justify-center lg:mt-auto transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </aside>

        {/* MAIN BENTO WORKSPACE */}
        <div className="flex-1 space-y-5">
          {/* Top Glass Header */}
          <header className="glass-v7 rounded-3xl px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs text-amber-300/90 font-medium flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Reyyztore Glassy V7 • Master CRM
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-white mt-0.5">
                Halo, Raihan! 👋
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari No. WA / Tender..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (activeTab === 'overview') setActiveTab('customers');
                  }}
                  className="w-full pl-10 pr-4 py-2.5 rounded-full bg-black/30 border border-white/10 text-xs text-white placeholder-stone-400 focus:outline-none focus:border-amber-400/50"
                />
              </div>
              <button
                onClick={() => setActiveTab('tenders')}
                className="px-4 py-2.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/25 hover:brightness-105 transition shrink-0"
              >
                <Plus className="w-4 h-4" /> Tender Baru
              </button>
            </div>
          </header>

          {/* 4 BENTO STATS CARDS (Kartu Pertama Warm Amber Gradient seperti referensi) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 animate-fade-up">
            <div
              onClick={() => setActiveTab('customers')}
              className="glass-v7-amber rounded-3xl p-6 cursor-pointer flex flex-col justify-between min-h-[145px]"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-950/80">
                  Total Ulasan & Foto
                </span>
                <span className="w-8 h-8 rounded-full bg-stone-950/15 flex items-center justify-center text-stone-950">
                  <MessageSquare className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-4 flex items-end justify-between">
                <h2 className="text-3xl font-black text-stone-950">{allReviews.length}</h2>
                <span className="inline-flex items-center gap-0.5 text-xs font-bold text-stone-950 bg-white/30 px-2.5 py-1 rounded-full">
                  <ArrowUpRight className="w-3.5 h-3.5" /> Live
                </span>
              </div>
            </div>

            <div
              onClick={() => setActiveTab('tenders')}
              className="glass-v7-card rounded-3xl p-6 cursor-pointer flex flex-col justify-between min-h-[145px]"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-stone-300">Akun Tender Aktif</span>
                <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-amber-300">
                  <Users className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-4 flex items-end justify-between">
                <h2 className="text-3xl font-bold text-white">{tenders.length}</h2>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                  <ArrowUpRight className="w-3.5 h-3.5" /> Multi-QR
                </span>
              </div>
            </div>

            <div
              onClick={() => setActiveTab('customers')}
              className="glass-v7-card rounded-3xl p-6 cursor-pointer flex flex-col justify-between min-h-[145px]"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-stone-300">Database No. WhatsApp</span>
                <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-emerald-400">
                  <Phone className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-4 flex items-end justify-between">
                <h2 className="text-3xl font-bold text-white">{uniqueWaCount}</h2>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                  <ArrowUpRight className="w-3.5 h-3.5" /> CRM Leads
                </span>
              </div>
            </div>

            <div className="glass-v7-card rounded-3xl p-6 flex flex-col justify-between min-h-[145px]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-stone-300">Rata-Rata Kepuasan</span>
                <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-amber-400">
                  <Star className="w-4 h-4 fill-amber-400" />
                </span>
              </div>
              <div className="mt-4 flex items-end justify-between">
                <h2 className="text-3xl font-bold text-white">{avgRating} <span className="text-sm font-normal text-stone-400">/ 5.0</span></h2>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                  <ArrowUpRight className="w-3.5 h-3.5" /> 98% Puas
                </span>
              </div>
            </div>
          </div>

          {/* OVERVIEW BENTO: GRAFIK BATANG + FEED PELANGGAN TERBARU */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 animate-fade-up">
              {/* Bar Chart Performa Per Tender (Gaya Glassy V7) */}
              <div className="lg:col-span-3 glass-v7 rounded-3xl p-6 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-bold text-base text-white">Performa Ulasan per Tender</h3>
                    <p className="text-xs text-stone-400">Perbandingan interaksi QR antar klien aktif</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('tenders')}
                    className="text-xs text-amber-300 hover:underline"
                  >
                    Kelola Semua →
                  </button>
                </div>

                <div className="h-52 flex items-end justify-around gap-3 pt-6 px-2 border-b border-white/10">
                  {chartData.length === 0 ? (
                    <p className="text-xs text-stone-500 m-auto">Belum ada data grafik Tender</p>
                  ) : (
                    chartData.map((d, i) => {
                      const heightPct = Math.max((d.count / maxChart) * 100, 14);
                      const isHighlight = i === 0;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                          <span className="text-[11px] font-bold text-stone-300">{d.count}</span>
                          <div
                            style={{ height: `${heightPct}%` }}
                            className={`w-full max-w-[44px] rounded-t-2xl transition-all duration-500 ${
                              isHighlight
                                ? 'bg-gradient-to-t from-amber-600 to-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.4)]'
                                : 'bg-white/15 hover:bg-white/25'
                            }`}
                          />
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="flex justify-around gap-3 pt-2.5 px-2">
                  {chartData.map((d, i) => (
                    <span key={i} className="flex-1 text-center text-[11px] text-stone-400 truncate">
                      {d.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Daftar Ulasan Terbaru Lintas Tender */}
              <div className="lg:col-span-2 glass-v7 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-white">Aktivitas Pelanggan Terbaru</h3>
                  <button
                    onClick={() => setActiveTab('customers')}
                    className="text-xs text-amber-300 hover:underline"
                  >
                    Lihat Master
                  </button>
                </div>
                <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                  {allReviews.slice(0, 5).map((r) => (
                    <div key={r.id} className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
                      {r.photo_url ? (
                        <img src={r.photo_url} alt="Foto" className="w-11 h-11 rounded-xl object-cover shrink-0" />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">
                          {r.rating}★
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-white truncate">{r.whatsapp_number}</p>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300 shrink-0">
                            {r.tenders?.business_name}
                          </span>
                        </div>
                        <p className="text-xs text-stone-400 truncate mt-0.5">{r.comment}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB KELOLA AKUN TENDER */}
          {activeTab === 'tenders' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-fade-up">
              <div className="glass-v7 rounded-3xl p-6 h-fit">
                <h2 className="font-bold text-base text-white mb-4 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-amber-400" /> Tambah Akun Tender Baru
                </h2>
                <form onSubmit={handleCreateTender} className="space-y-4">
                  <div>
                    <label className="block text-xs text-stone-400 mb-1">Nama Bisnis / Tender</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Kopi Senja Purwokerto"
                      value={businessName}
                      onChange={(e) => {
                        setBusinessName(e.target.value);
                        setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                      }}
                      className="w-full px-4 py-3 bg-black/35 border border-white/10 rounded-2xl text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-stone-400 mb-1">Username Login</label>
                    <input
                      type="text"
                      required
                      placeholder="kopisenja"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-4 py-3 bg-black/35 border border-white/10 rounded-2xl text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-stone-400 mb-1">Slug URL (/t/slug)</label>
                    <input
                      type="text"
                      required
                      placeholder="kopi-senja"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      className="w-full px-4 py-3 bg-black/35 border border-white/10 rounded-2xl text-sm text-amber-300 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-stone-400 mb-1">PIN Login (6 Digit Angka)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      required
                      placeholder="123456"
                      value={pinCode}
                      onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-4 py-3 bg-black/35 border border-white/10 rounded-2xl text-sm text-white font-mono tracking-widest"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={creating}
                    className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-orange-400 text-stone-950 font-bold rounded-2xl text-sm shadow-lg shadow-amber-500/20 hover:brightness-105 transition"
                  >
                    {creating ? 'Menyimpan...' : '+ Buat Akun Tender'}
                  </button>
                </form>
              </div>

              <div className="lg:col-span-2 space-y-3">
                {tenders.map((t) => {
                  const countReviews = allReviews.filter((r) => r.tender_id === t.id).length;
                  return (
                    <div
                      key={t.id}
                      className="glass-v7-card rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h3 className="font-bold text-white text-base">{t.business_name}</h3>
                          <span
                            className={`px-2.5 py-0.5 text-[11px] rounded-full font-semibold ${
                              t.is_active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            {t.is_active ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-400">
                          <span>User: <strong className="text-white">{t.username}</strong></span>
                          <span>PIN: <strong className="text-amber-300 font-mono">{t.pin_code}</strong></span>
                          <span>URL: <strong className="text-stone-200">/t/{t.slug}</strong></span>
                          <span>Ulasan: <strong className="text-emerald-400">{countReviews}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={`/t/${t.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2.5 rounded-full bg-white/10 hover:bg-amber-400 hover:text-stone-950 text-stone-200 transition"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => toggleTenderActive(t.id, t.is_active)}
                          className={`p-2.5 rounded-full transition ${
                            t.is_active ? 'bg-white/10 text-emerald-400' : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTender(t.id, t.business_name)}
                          className="p-2.5 rounded-full bg-white/10 hover:bg-rose-500 text-stone-200 hover:text-white transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB MASTER DATA CRM PELANGGAN */}
          {activeTab === 'customers' && (
            <div className="glass-v7 rounded-3xl p-6 space-y-4 animate-fade-up">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <select
                  value={filterTender}
                  onChange={(e) => setFilterTender(e.target.value)}
                  className="px-4 py-2.5 bg-black/35 border border-white/10 rounded-full text-xs text-white"
                >
                  <option value="all">Semua Tender (X / Y / Z / dst.)</option>
                  {tenders.map((t) => (
                    <option key={t.id} value={
