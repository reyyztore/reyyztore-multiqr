'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  ShieldCheck, Users, MessageSquare, QrCode, Plus, Trash2,
  ExternalLink, Download, Search, LogOut, Power, Upload, Phone, Star, Eye, EyeOff
} from 'lucide-react';

export default function SuperAdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'tenders' | 'customers' | 'qris'>('tenders');
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
    if (!confirm(`Yakin hapus permanen "${name}" beserta seluruh ulasan & fotonya?`)) return;
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
    link.setAttribute('download', `master-pelanggan-reyyztore-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLogout = () => {
    localStorage.removeItem('reyyztore_session');
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-white leading-tight">Super Admin Reyyztore</h1>
              <p className="text-xs text-slate-400">Master Control Multi-QR & Database Pelanggan</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-red-500/20 hover:text-red-400 text-sm flex items-center gap-2 transition"
          >
            <LogOut className="w-4 h-4" /> Keluar
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 pt-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Total Akun Tender</p>
              <p className="text-3xl font-bold text-white mt-1">{tenders.length}</p>
            </div>
            <Users className="w-10 h-10 text-indigo-400/80" />
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Total Ulasan & Foto Masuk</p>
              <p className="text-3xl font-bold text-emerald-400 mt-1">{allReviews.length}</p>
            </div>
            <MessageSquare className="w-10 h-10 text-emerald-400/80" />
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Database No. WhatsApp</p>
              <p className="text-3xl font-bold text-amber-400 mt-1">
                {new Set(allReviews.map((r) => r.whatsapp_number)).size} <span className="text-xs font-normal text-slate-400">unik</span>
              </p>
            </div>
            <Phone className="w-10 h-10 text-amber-400/80" />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab('tenders')}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition flex items-center gap-2 ${
              activeTab === 'tenders' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" /> Kelola Akun Tender (X/Y/Z)
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition flex items-center gap-2 ${
              activeTab === 'customers' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4" /> Master Data Semua Pelanggan ({allReviews.length})
          </button>
          <button
            onClick={() => setActiveTab('qris')}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition flex items-center gap-2 ${
              activeTab === 'qris' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <QrCode className="w-4 h-4" /> QRIS Support & Watermark
          </button>
        </div>

        {activeTab === 'tenders' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 h-fit">
              <h2 className="font-bold text-lg text-white mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-400" /> Buat Akun Tender Baru
              </h2>
              <form onSubmit={handleCreateTender} className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Nama Bisnis / Tender</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Kopi Senja Purwokerto"
                    value={businessName}
                    onChange={(e) => {
                      setBusinessName(e.target.value);
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Username Login Tender</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: kopisenja"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Slug URL Publik (/t/slug)</label>
                  <input
                    type="text"
                    required
                    placeholder="kopi-senja"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-indigo-400 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">PIN Login (6 Digit Angka)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    placeholder="123456"
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-mono tracking-widest"
                  />
                </div>
                <button
                  type="submit"
                  disabled={creating}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-semibold text-white transition"
                >
                  {creating ? 'Menyimpan...' : '+ Tambah Tender Sekarang'}
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 space-y-3">
              {tenders.map((t) => {
                const countReviews = allReviews.filter((r) => r.tender_id === t.id).length;
                return (
                  <div
                    key={t.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="font-bold text-white text-base">{t.business_name}</h3>
                        <span
                          className={`px-2 py-0.5 text-[11px] rounded-full font-medium ${
                            t.is_active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                          }`}
                        >
                          {t.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                        <span>User: <strong className="text-slate-200">{t.username}</strong></span>
                        <span>PIN: <strong className="text-amber-400 font-mono">{t.pin_code}</strong></span>
                        <span>URL: <strong className="text-indigo-400">/t/{t.slug}</strong></span>
                        <span>Total Ulasan: <strong className="text-emerald-400">{countReviews}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={`/t/${t.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Lihat Halaman Publik"
                        className="p-2.5 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => toggleTenderActive(t.id, t.is_active)}
                        title={t.is_active ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                        className={`p-2.5 rounded-xl transition ${
                          t.is_active ? 'bg-slate-800 text-emerald-400 hover:bg-amber-500/20' : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTender(t.id, t.business_name)}
                        title="Hapus Tender"
                        className="p-2.5 rounded-xl bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white transition"
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

        {activeTab === 'customers' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex flex-col sm:flex-row gap-3 flex-1">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari No. WA, isi ulasan, atau Tender..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white"
                  />
                </div>
                <select
                  value={filterTender}
                  onChange={(e) => setFilterTender(e.target.value)}
                  className="px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white"
                >
                  <option value="all">Semua Tender (X / Y / Z / dst.)</option>
                  {tenders.map((t) => (
                    <option key={t.id} value={t.id}>{t.business_name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={exportToCSV}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition"
              >
                <Download className="w-4 h-4" /> Export CSV / Excel
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-xs text-slate-400 uppercase">
                    <th className="py-3 px-3">Foto</th>
                    <th className="py-3 px-3">Asal Tender</th>
                    <th className="py-3 px-3">Nomor WhatsApp</th>
                    <th className="py-3 px-3">Rating & Ulasan</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Waktu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 text-sm">
                  {filteredReviews.map((r) => {
                    const waClean = r.whatsapp_number.replace(/\D/g, '').replace(/^0/, '62');
                    return (
                      <tr key={r.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-3">
                          {r.photo_url ? (
                            <a href={r.photo_url} target="_blank" rel="noreferrer">
                              <img src={r.photo_url} alt="Foto" className="w-12 h-12 object-cover rounded-lg border border-slate-700" />
                            </a>
                          ) : (
                            <span className="text-xs text-slate-600">Tanpa Foto</span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-medium text-indigo-400">
                          {r.tenders?.business_name || '-'}
                        </td>
                        <td className="py-3 px-3">
                          <a
                            href={`https://wa.me/${waClean}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 font-mono text-xs"
                          >
                            <Phone className="w-3 h-3" /> {r.whatsapp_number}
                          </a>
                        </td>
                        <td className="py-3 px-3 max-w-xs">
                          <div className="flex items-center gap-1 text-amber-400 text-xs mb-1">
                            {Array.from({ length: r.rating }).map((_, i) => (
                              <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                            ))}
                          </div>
                          <p className="text-slate-300 text-xs line-clamp-2">{r.comment}</p>
                        </td>
                        <td className="py-3 px-3">
                          {r.is_visible ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                              <Eye className="w-3.5 h-3.5" /> Tampil
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                              <EyeOff className="w-3.5 h-3.5" /> Disembunyikan
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-xs text-slate-400 whitespace-nowrap">
                          {new Date(r.created_at).toLocaleString('id-ID')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'qris' && (
          <div className="max-w-xl bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
            <h2 className="font-bold text-lg text-white">Pengaturan Donasi QRIS & Watermark Global</h2>
            <p className="text-xs text-slate-400">
              Pengaturan ini otomatis tampil di pojok kiri atas (Logo Uang) dan bawah tengah pada semua halaman Tender X, Y, Z, dst.
            </p>

            <div>
              <label className="block text-xs text-slate-400 mb-2">Upload Gambar QRIS Kamu</label>
              <label className="flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-slate-700 rounded-xl cursor-pointer hover:border-indigo-500 transition text-sm text-slate-300">
                <Upload className="w-4 h-4 text-indigo-400" />
                {uploadingQris ? 'Mengunggah QRIS...' : 'Pilih Gambar QRIS (JPG/PNG)'}
                <input type="file" accept="image/*" onChange={handleUploadQris} className="hidden" />
              </label>
              {globalSettings.support_qris_url && (
                <div className="mt-3 p-3 bg-white rounded-xl w-44 mx-auto">
                  <img src={globalSettings.support_qris_url} alt="Preview QRIS" className="w-full h-auto rounded-lg" />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Judul Pop-up Support</label>
              <input
                type="text"
                value={globalSettings.support_title}
                onChange={(e) => setGlobalSettings({ ...globalSettings, support_title: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Teks Watermark Bawah Tengah</label>
              <input
                type="text"
                value={globalSettings.watermark_text}
                onChange={(e) => setGlobalSettings({ ...globalSettings, watermark_text: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Link Tujuan Saat Watermark Diklik</label>
              <input
                type="text"
                value={globalSettings.watermark_url}
                onChange={(e) => setGlobalSettings({ ...globalSettings, watermark_url: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-indigo-400"
              />
            </div>

            <button
              onClick={handleSaveGlobalSettings}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-semibold text-white transition"
            >
              Simpan Pengaturan Global
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
