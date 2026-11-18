'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AdminChart from '@/components/AdminChart';
import {
  Users, MessageSquare, QrCode, Plus, Trash2, ExternalLink, Download,
  Search, LogOut, Power, Upload, Phone, Eye, EyeOff, ArrowUpRight, Sparkles, LayoutGrid
} from 'lucide-react';

export default function SuperAdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'tenders' | 'customers' | 'qris'>('overview');
  const [tenders, setTenders] = useState<any[]>([]);
  const [allReviews, setAllReviews] = useState<any[]>([]);
  const [globalSettings, setGlobalSettings] = useState<any>({
    id: 1,
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
    if (!raw) { router.push('/login'); return; }
    const session = JSON.parse(raw);
    if (session.role !== 'admin') { router.push('/dashboard'); return; }
    fetchAllData();
  }, [router]);

  const fetchAllData = async () => {
    const { data: tData } = await supabase.from('tenders').select('*').eq('role', 'tender').order('created_at', { ascending: false });
    if (tData) setTenders(tData);
    const { data: rData } = await supabase.from('reviews').select('*, tenders(business_name, slug)').order('created_at', { ascending: false });
    if (rData) setAllReviews(rData);
    const { data: sData } = await supabase.from('global_settings').select('*').eq('id', 1).single();
    if (sData) setGlobalSettings(sData);
  };

  const handleCreateTender = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pinCode.length !== 6) { alert('PIN wajib 6 digit!'); return; }
    setCreating(true);
    const { error } = await supabase.from('tenders').insert({
      business_name: businessName.trim(),
      username: username.trim().toLowerCase(),
      slug: slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      pin_code: pinCode,
      role: 'tender',
    });
    setCreating(false);
    if (error) alert(error.message);
    else { setBusinessName(''); setUsername(''); setSlug(''); setPinCode(''); fetchAllData(); }
  };

  const toggleTenderActive = async (id: string, cur: boolean) => {
    await supabase.from('tenders').update({ is_active: !cur }).eq('id', id);
    fetchAllData();
  };

  const handleDeleteTender = async (id: string, name: string) => {
    if (!confirm(`Hapus permanen "${name}"?`)) return;
    await supabase.from('tenders').delete().eq('id', id);
    fetchAllData();
  };

  const handleUploadQris = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingQris(true);
    const fileName = `qris-${Date.now()}.${file.name.split('.').pop() || 'png'}`;

    const { error: upErr } = await supabase.storage
      .from('assets')
      .upload(fileName, file, { upsert: true, contentType: file.type });

    if (upErr) {
      alert('Gagal upload QRIS: ' + upErr.message);
      setUploadingQris(false);
      return;
    }

    const { data } = supabase.storage.from('assets').getPublicUrl(fileName);
    const updated = {
      id: 1,
      support_qris_url: data.publicUrl,
      support_title: globalSettings.support_title || 'Support Sistem Ini Seikhlasmu',
      watermark_text: globalSettings.watermark_text || 'Powered by Reyyztore',
      watermark_url: globalSettings.watermark_url || 'https://wa.me/6283830108419',
      updated_at: new Date().toISOString(),
    };

    const { error: dbErr } = await supabase.from('global_settings').upsert(updated, { onConflict: 'id' });
    setGlobalSettings(updated);
    setUploadingQris(false);

    if (dbErr) alert('Upload sukses, gagal simpan DB: ' + dbErr.message);
    else alert('QRIS berhasil diupload dan langsung aktif di semua halaman pelanggan!');
  };

  const handleSaveGlobalSettings = async () => {
    const { error } = await supabase.from('global_settings').upsert({
      id: 1,
      support_qris_url: globalSettings.support_qris_url || '',
      support_title: globalSettings.support_title,
      watermark_text: globalSettings.watermark_text,
      watermark_url: globalSettings.watermark_url,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    if (error) alert('Gagal menyimpan: ' + error.message);
    else alert('Pengaturan QRIS & Watermark berhasil disimpan!');
  };

  const filteredReviews = allReviews.filter((r) => {
    const matchTender = filterTender === 'all' || r.tender_id === filterTender;
    const matchSearch = r.whatsapp_number.includes(searchQuery) || r.comment.toLowerCase().includes(searchQuery.toLowerCase());
    return matchTender && matchSearch;
  });

  const exportToCSV = () => {
    const headers = ['Waktu', 'Tender', 'WhatsApp', 'Rating', 'Komentar', 'Status'];
    const rows = filteredReviews.map((r) => [
      new Date(r.created_at).toLocaleString('id-ID'),
      `"${r.tenders?.business_name || '-'}"`,
      `"${r.whatsapp_number}"`,
      r.rating,
      `"${r.comment.replace(/"/g, '""')}"`,
      r.is_visible ? 'Tampil' : 'Hidden',
    ]);
    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const a = document.createElement('a');
    a.href = encodeURI(csv);
    a.download = `crm-reyyztore-${Date.now()}.csv`;
    a.click();
  };

  const uniqueWa = new Set(allReviews.map((r) => r.whatsapp_number)).size;
  const avgRating = allReviews.length ? (allReviews.reduce((a, b) => a + b.rating, 0) / allReviews.length).toFixed(1) : '5.0';
  const chartData = tenders.slice(0, 7).map((t) => ({
    name: t.business_name.slice(0, 8),
    count: allReviews.filter((r) => r.tender_id === t.id).length,
  }));
  const maxChart = Math.max(...chartData.map((d) => d.count), 1);

  return (
    <div className="min-h-screen bg-[#14110f] text-stone-100 relative overflow-hidden pb-16">
      <div className="fixed -top-32 -left-24 w-[450px] h-[450px] bg-amber-600/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed top-1/3 right-0 w-[400px] h-[400px] bg-orange-500/15 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 pt-5 flex flex-col lg:flex-row gap-5 relative z-10">
        <aside className="lg:w-16 glass-v7 rounded-3xl lg:rounded-full p-2.5 flex lg:flex-col items-center justify-between lg:justify-start gap-3 h-fit lg:sticky lg:top-5">
          <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-stone-950 font-black">R</div>
          <nav className="flex lg:flex-col items-center gap-2">
            {[
              { id: 'overview', icon: LayoutGrid },
              { id: 'tenders', icon: Users },
              { id: 'customers', icon: MessageSquare },
              { id: 'qris', icon: QrCode },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition ${
                    activeTab === item.id ? 'bg-amber-400 text-stone-950 shadow-lg' : 'text-stone-400 hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </button>
              );
            })}
          </nav>
          <button
            onClick={() => { localStorage.removeItem('reyyztore_session'); router.push('/login'); }}
            className="w-11 h-11 rounded-full bg-white/5 hover:bg-rose-500/20 text-stone-400 hover:text-rose-300 flex items-center justify-center lg:mt-auto"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </aside>

        <div className="flex-1 space-y-5">
          <header className="glass-v7 rounded-3xl px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs text-amber-300 flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> Reyyztore Master CRM</p>
              <h1 className="text-2xl font-bold text-white">Halo, Raihan! 👋</h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative flex-1 sm:w-60">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari No. WA / Ulasan..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); if (activeTab === 'overview') setActiveTab('customers'); }}
                  className="w-full pl-10 pr-4 py-2.5 rounded-full bg-black/30 border border-white/10 text-xs text-white"
                />
              </div>
              <button onClick={() => setActiveTab('tenders')} className="px-4 py-2.5 rounded-full bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1">
                <Plus className="w-4 h-4" /> Tender
              </button>
            </div>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div onClick={() => setActiveTab('customers')} className="glass-v7-amber rounded-3xl p-6 cursor-pointer">
              <span className="text-xs font-bold uppercase text-stone-950/80">Total Ulasan</span>
              <div className="mt-4 flex items-end justify-between">
                <h2 className="text-3xl font-black text-stone-950">{allReviews.length}</h2>
                <span className="text-xs font-bold text-stone-950 bg-white/30 px-2.5 py-1 rounded-full flex items-center"><ArrowUpRight className="w-3.5 h-3.5" /> Live</span>
              </div>
            </div>
            <div onClick={() => setActiveTab('tenders')} className="glass-v7-card rounded-3xl p-6 cursor-pointer">
              <span className="text-xs text-stone-300">Akun Tender</span>
              <div className="mt-4 flex items-end justify-between">
                <h2 className="text-3xl font-bold text-white">{tenders.length}</h2>
                <span className="text-xs text-emerald-400">Multi-QR</span>
              </div>
            </div>
            <div onClick={() => setActiveTab('customers')} className="glass-v7-card rounded-3xl p-6 cursor-pointer">
              <span className="text-xs text-stone-300">Database WhatsApp</span>
              <div className="mt-4 flex items-end justify-between">
                <h2 className="text-3xl font-bold text-white">{uniqueWa}</h2>
                <span className="text-xs text-emerald-400">Leads</span>
              </div>
            </div>
            <div className="glass-v7-card rounded-3xl p-6">
              <span className="text-xs text-stone-300">Rating Rata-rata</span>
              <div className="mt-4 flex items-end justify-between">
                <h2 className="text-3xl font-bold text-white">{avgRating}</h2>
                <span className="text-xs text-amber-400">★ 5.0</span>
              </div>
            </div>
          </div>

          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
              <AdminChart chartData={chartData} maxChart={maxChart} onManageClick={() => setActiveTab('tenders')} />
              <div className="lg:col-span-2 glass-v7 rounded-3xl p-6 space-y-3">
                <h3 className="font-bold text-base text-white">Pelanggan Terbaru</h3>
                {allReviews.slice(0, 5).map((r) => (
                  <div key={r.id} className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
                    {r.photo_url ? <img src={r.photo_url} alt="" className="w-10 h-10 rounded-xl object-cover" /> : <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center text-xs font-bold">{r.rating}★</div>}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white truncate">{r.whatsapp_number} • <span className="text-amber-300">{r.tenders?.business_name}</span></p>
                      <p className="text-xs text-stone-400 truncate">{r.comment}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'tenders' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <form onSubmit={handleCreateTender} className="glass-v7 rounded-3xl p-6 space-y-4 h-fit">
                <h2 className="font-bold text-base text-white">+ Tambah Akun Tender</h2>
                <input type="text" required placeholder="Nama Bisnis" value={businessName} onChange={(e) => { setBusinessName(e.target.value); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-')); }} className="w-full px-4 py-3 bg-black/35 border border-white/10 rounded-2xl text-sm text-white" />
                <input type="text" required placeholder="Username Login" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-4 py-3 bg-black/35 border border-white/10 rounded-2xl text-sm text-white" />
                <input type="text" required placeholder="Slug URL" value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full px-4 py-3 bg-black/35 border border-white/10 rounded-2xl text-sm text-amber-300 font-mono" />
                <input type="text" maxLength={6} required placeholder="PIN 6 Digit" value={pinCode} onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))} className="w-full px-4 py-3 bg-black/35 border border-white/10 rounded-2xl text-sm text-white font-mono" />
                <button type="submit" disabled={creating} className="w-full py-3.5 bg-amber-400 text-stone-950 font-bold rounded-2xl text-sm">{creating ? 'Menyimpan...' : 'Buat Akun'}</button>
              </form>
              <div className="lg:col-span-2 space-y-3">
                {tenders.map((t) => (
                  <div key={t.id} className="glass-v7-card rounded-3xl p-5 flex items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-white">{t.business_name}</h3>
                      <p className="text-xs text-stone-400 mt-1">User: <strong className="text-white">{t.username}</strong> • PIN: <strong className="text-amber-300">{t.pin_code}</strong> • /t/{t.slug}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <a href={`/t/${t.slug}`} target="_blank" rel="noreferrer" className="p-2.5 rounded-full bg-white/10"><ExternalLink className="w-4 h-4" /></a>
                      <button onClick={() => toggleTenderActive(t.id, t.is_active)} className={`p-2.5 rounded-full ${t.is_active ? 'bg-white/10 text-emerald-400' : 'bg-rose-500/20 text-rose-300'}`}><Power className="w-4 h-4" /></button>
                      <button onClick={() => handleDeleteTender(t.id, t.business_name)} className="p-2.5 rounded-full bg-white/10 hover:bg-rose-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'customers' && (
            <div className="glass-v7 rounded-3xl p-6 space-y-4">
              <div className="flex flex-wrap justify-between gap-3">
                <select value={filterTender} onChange={(e) => setFilterTender(e.target.value)} className="px-4 py-2.5 bg-black/35 border border-white/10 rounded-full text-xs text-white">
                  <option value="all">Semua Tender</option>
                  {tenders.map((t) => <option key={t.id} value={t.id}>{t.business_name}</option>)}
                </select>
                <button onClick={exportToCSV} className="px-5 py-2.5 bg-emerald-500 rounded-full text-xs font-bold text-stone-950 flex items-center gap-2"><Download className="w-4 h-4" /> Export CSV</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-xs text-stone-400">
                      <th className="py-3 px-2">Foto</th><th className="py-3 px-2">Tender</th><th className="py-3 px-2">WhatsApp</th><th className="py-3 px-2">Ulasan</th><th className="py-3 px-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredReviews.map((r) => (
                      <tr key={r.id}>
                        <td className="py-3 px-2">{r.photo_url ? <img src={r.photo_url} alt="" className="w-11 h-11 rounded-xl object-cover" /> : '-'}</td>
                        <td className="py-3 px-2 text-amber-300 font-semibold">{r.tenders?.business_name}</td>
                        <td className="py-3 px-2 font-mono text-xs text-emerald-300"><Phone className="w-3 h-3 inline mr-1" />{r.whatsapp_number}</td>
                        <td className="py-3 px-2 text-xs">{r.rating}★ — {r.comment}</td>
                        <td className="py-3 px-2 text-xs">{r.is_visible ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4 text-stone-500" />}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'qris' && (
            <div className="max-w-lg glass-v7 rounded-3xl p-6 space-y-4">
              <h2 className="font-bold text-lg text-white">QRIS Support & Watermark</h2>
              <label className="flex items-center justify-center gap-2 p-4 border border-dashed border-white/20 rounded-2xl cursor-pointer text-xs hover:border-amber-400 transition">
                <Upload className="w-4 h-4 text-amber-400" /> {uploadingQris ? 'Mengunggah QRIS...' : 'Pilih & Upload Gambar QRIS'}
                <input type="file" accept="image/*" onChange={handleUploadQris} className="hidden" />
              </label>
              {globalSettings.support_qris_url ? (
                <div className="bg-white p-3 rounded-2xl w-48 mx-auto shadow-xl text-center">
                  <img src={globalSettings.support_qris_url} alt="QRIS Aktif" className="w-full h-auto rounded-xl" />
                  <p className="text-[10px] font-bold text-emerald-600 mt-1.5">✓ QRIS Aktif di Web Pelanggan</p>
                </div>
              ) : (
                <p className="text-xs text-center text-stone-400">Belum ada gambar QRIS yang terpasang.</p>
              )}
              <input type="text" value={globalSettings.support_title} onChange={(e) => setGlobalSettings({ ...globalSettings, support_title: e.target.value })} placeholder="Judul Pop-up Support" className="w-full px-4 py-3 bg-black/35 border border-white/10 rounded-2xl text-sm text-white" />
              <input type="text" value={globalSettings.watermark_text} onChange={(e) => setGlobalSettings({ ...globalSettings, watermark_text: e.target.value })} placeholder="Teks Watermark" className="w-full px-4 py-3 bg-black/35 border border-white/10 rounded-2xl text-sm text-white" />
              <input type="text" value={globalSettings.watermark_url} onChange={(e) => setGlobalSettings({ ...globalSettings, watermark_url: e.target.value })} placeholder="Link Watermark" className="w-full px-4 py-3 bg-black/35 border border-white/10 rounded-2xl text-sm text-amber-300" />
              <button onClick={handleSaveGlobalSettings} className="w-full py-3.5 bg-amber-400 text-stone-950 font-bold rounded-2xl text-sm shadow-lg">Simpan Teks & Link</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
