'use client';

export default function AdminChart({
  chartData,
  maxChart,
  onManageClick,
}: {
  chartData: { name: string; count: number }[];
  maxChart: number;
  onManageClick: () => void;
}) {
  return (
    <div className="lg:col-span-3 glass-v7 rounded-3xl p-6 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-bold text-base text-white">Performa Ulasan per Tender</h3>
          <p className="text-xs text-stone-400">Perbandingan interaksi QR antar klien aktif</p>
        </div>
        <button onClick={onManageClick} className="text-xs text-amber-300 hover:underline">
          Kelola Semua →
        </button>
      </div>

      <div className="h-52 flex items-end justify-around gap-3 pt-6 px-2 border-b border-white/10">
        {chartData.length === 0 ? (
          <p className="text-xs text-stone-500 m-auto">Belum ada data grafik Tender</p>
        ) : (
          chartData.map((d, i) => {
            const heightPct = Math.max((d.count / maxChart) * 100, 14);
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <span className="text-[11px] font-bold text-stone-300">{d.count}</span>
                <div
                  style={{ height: `${heightPct}%` }}
                  className={`w-full max-w-[44px] rounded-t-2xl transition-all duration-500 ${
                    i === 0
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
  );
}
