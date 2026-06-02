import React, { useState, useEffect } from "react";
import { Upload, RefreshCw, Activity, Footprints, Flame, Heart, Scale, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface HealthEntry {
  id: string;
  type: string;
  value: number;
  unit: string;
  date: string;
}

const TYPE_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  steps: { label: "Langkah", icon: Footprints, color: "#c3f400" },
  activeEnergy: { label: "Kalori Aktif", icon: Flame, color: "#ff6b35" },
  basalEnergy: { label: "Kalori Basal", icon: Flame, color: "#ff9f1c" },
  distance: { label: "Jarak", icon: Activity, color: "#2ec4b6" },
  heartRate: { label: "Detak Jantung", icon: Heart, color: "#e71d36" },
  bodyMass: { label: "Berat Badan", icon: Scale, color: "#7209b7" },
  bodyFat: { label: "Lemak Tubuh", icon: Scale, color: "#f72585" },
  exerciseMinutes: { label: "Menit Latihan", icon: Clock, color: "#4361ee" },
};

export default function AppleHealth({ profileId }: { profileId: string }) {
  const [data, setData] = useState<HealthEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    fetchData();
  }, [profileId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/profiles/${profileId}/apple-health`);
      const json = await res.json();
      setData(Array.isArray(json) ? json : []);
    } catch { setData([]); }
    setLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/profiles/${profileId}/apple-health/import-xml`, {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (json.success) {
        setUploadResult(`✅ Berhasil import ${json.imported} data dari ${json.totalRecordsScanned.toLocaleString()} records`);
        fetchData();
      } else {
        setUploadResult(`❌ ${json.error || "Upload gagal"}`);
      }
    } catch (err: any) {
      setUploadResult(`❌ Error: ${err.message}`);
    }
    setUploading(false);
    e.target.value = "";
  };

  // Group data by date
  const grouped = data.reduce((acc, entry) => {
    if (!acc[entry.date]) acc[entry.date] = [];
    acc[entry.date].push(entry);
    return acc;
  }, {} as Record<string, HealthEntry[]>);

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <h2 className="font-display text-2xl font-extrabold text-white tracking-tight">Apple Health</h2>
        <button onClick={fetchData} className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-[#c3f400] transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Upload Section */}
      <div className="bg-[#201f1f] rounded-2xl border border-zinc-800 p-5 space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Import dari Apple Health Export</h3>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Buka app <strong className="text-zinc-200">Health</strong> → tap foto profil → <strong className="text-zinc-200">Export All Health Data</strong> → upload file <code className="text-[#c3f400]">export.xml</code> di bawah.
        </p>
        <label className="flex items-center justify-center gap-2 bg-[#c3f400] hover:bg-[#abd600] text-black py-3 px-5 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all active:scale-95 min-h-[44px]">
          {uploading ? (
            <><RefreshCw className="w-4 h-4 animate-spin" /> MEMPROSES...</>
          ) : (
            <><Upload className="w-4 h-4" /> UPLOAD EXPORT.XML</>
          )}
          <input type="file" accept=".xml" onChange={handleUpload} className="hidden" disabled={uploading} />
        </label>
        {uploadResult && (
          <p className={`text-xs text-center ${uploadResult.includes("✅") ? "text-green-400" : "text-red-400"}`}>
            {uploadResult}
          </p>
        )}
      </div>

      {/* iOS Shortcuts Guide */}
      <div className="bg-[#201f1f] rounded-2xl border border-zinc-800 overflow-hidden">
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="w-full flex items-center justify-between p-5 text-left"
        >
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">⚡ Auto-Sync via iOS Shortcuts</h3>
            <p className="text-xs text-zinc-500 mt-1">Kirim data otomatis setiap hari tanpa export manual</p>
          </div>
          {showGuide ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
        </button>
        <AnimatePresence>
          {showGuide && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 space-y-3 text-xs text-zinc-300 leading-relaxed border-t border-zinc-800 pt-4">
                <p className="text-[#c3f400] font-bold">Cara Setup iOS Shortcut:</p>
                <ol className="list-decimal list-inside space-y-2">
                  <li>Buka app <strong>Shortcuts</strong> di iPhone</li>
                  <li>Tap <strong>+</strong> → buat Shortcut baru</li>
                  <li>Tambahkan action: <strong>"Find Health Samples"</strong>
                    <ul className="ml-4 mt-1 space-y-1 text-zinc-400">
                      <li>• Type: <code className="text-[#c3f400]">Steps</code> (atau Active Energy, dll.)</li>
                      <li>• Start Date: <code className="text-[#c3f400]">Start of Today</code></li>
                      <li>• Sort by: <code className="text-[#c3f400]">Start Date</code>, Limit: <code className="text-[#c3f400]">1</code></li>
                    </ul>
                  </li>
                  <li>Tambahkan action: <strong>"Get Contents of URL"</strong>
                    <ul className="ml-4 mt-1 space-y-1 text-zinc-400">
                      <li>• URL: <code className="text-[#c3f400] break-all">https://forge-ai-lilac.vercel.app/api/profiles/{profileId}/apple-health</code></li>
                      <li>• Method: <code className="text-[#c3f400]">POST</code></li>
                      <li>• Request Body: <code className="text-[#c3f400]">JSON</code></li>
                      <li>• Body content:</li>
                    </ul>
                    <pre className="bg-black/50 rounded-lg p-3 mt-2 text-[11px] text-zinc-300 overflow-x-auto">{`{
  "data": [{
    "type": "steps",
    "value": [Health Samples.Value],
    "unit": "count",
    "date": "[Current Date: yyyy-MM-dd]"
  }]
}`}</pre>
                  </li>
                  <li>Set <strong>Automation</strong>: jalankan setiap hari jam 23:00</li>
                </ol>
                <div className="bg-zinc-900 rounded-xl p-3 mt-3 border border-zinc-800">
                  <p className="text-zinc-400"><strong className="text-zinc-200">💡 Tips:</strong> Buat beberapa "Find Health Samples" untuk steps, active energy, dan exercise minutes sekaligus, lalu gabungkan jadi satu request JSON array.</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Data Display */}
      {loading ? (
        <div className="flex justify-center py-8">
          <RefreshCw className="w-6 h-6 text-zinc-500 animate-spin" />
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-8 text-zinc-500 text-sm">
          Belum ada data Apple Health. Upload export atau setup Shortcut di atas.
        </div>
      ) : (
        <div className="space-y-4">
          {sortedDates.slice(0, 7).map(date => (
            <div key={date} className="bg-[#201f1f] rounded-2xl border border-zinc-800 p-4 space-y-3">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{date}</p>
              <div className="grid grid-cols-2 gap-2">
                {grouped[date].map(entry => {
                  const meta = TYPE_LABELS[entry.type] || { label: entry.type, icon: Activity, color: "#888" };
                  const Icon = meta.icon;
                  return (
                    <div key={entry.id} className="bg-zinc-900 rounded-xl p-3 flex items-center gap-2">
                      <Icon className="w-4 h-4 flex-shrink-0" style={{ color: meta.color }} />
                      <div className="min-w-0">
                        <p className="text-[10px] text-zinc-500 truncate">{meta.label}</p>
                        <p className="text-sm font-bold text-white">
                          {entry.type === "heartRate" ? Math.round(entry.value) : entry.value.toLocaleString()}
                          <span className="text-[10px] text-zinc-500 ml-1">{entry.unit}</span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
