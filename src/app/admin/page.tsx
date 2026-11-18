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

  // Form tambah tender baru
  const [businessName, setBusinessName] = useState('');
  const [username, setUsername] = useState('');
  const [slug, setSlug] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [creating, setCreating] = useState(false);

  // Filter master data pelanggan
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
      alert('Gagal membuat Tender (Username atau Slug mungkin sudah dipakai): ' + error.message);
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

    if (!error) alert('Pengaturan QRIS Support & Watermark berhasil disimpan untuk semua halaman!');
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
      {/* Header */}
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
        {/* Ringkasan Statistik Global */}
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

        {/* Tab Navigasi */}
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

        {/* TAB 1: KELOLA TENDER */}
        {activeTab === 'tenders' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form Tambah Tender */}
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
                    
