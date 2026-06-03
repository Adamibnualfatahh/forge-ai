import React, { useState, useEffect, useMemo } from "react";
import { Upload, RefreshCw, Activity, Footprints, Flame, Heart, Scale, Clock, ChevronDown, ChevronUp, BarChart3 } from "lucide-react";
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

function MiniChart({ data, color, label, unit }: { data: { date: string; value: number }[]; color: string; label: string; unit: string }) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map(d => d.value), 1);
  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date)).slice(-7);

  return (
    <div className="bg-[#201f1f] rounded-2xl border border-zinc-800 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-zinc-300 uppercase tracking-wider">{label}</p>
        <p className="text-[10px] text-zinc-500">7 hari terakhir</p>
      </div>
      <div className="flex items-end gap-1.5 h-24">
        {sorted.map((d, i) => {
          const height = Math.max((d.value / max) * 100, 4);
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[9px] text-zinc-500 font-medium">
                {d.value >= 1000 ? `${(d.value / 1000).toFixed(1)}k` : Math.round(d.value)}
              </span>
              <div className="w-full rounded-t-md transition-all" style={{ height: `${height}%`, backgroundColor: color, opacity: i === sorted.length - 1 ? 1 : 0.6 }} />
              <span className="text-[8px] text-zinc-600">{d.date.slice(8)}</span>
            </div>
          );
        })}
      </div>
      {sorted.length > 0 && (
        <div className="flex items-center justify-between pt-1 border-t border-zinc-800">
          <span className="text-[10px] text-zinc-500">Hari ini</span>
          <span className="text-sm font-bold text-white">
            {sorted[sorted.length - 1].value.toLocaleString()} <span className="text-[10px] text-zinc-500">{unit}</span>
          </span>
        </div>
      )}
    </div>
  );
}

export default function AppleHealth({ profileId }: { profileId: string }) {
  const [data, setData] = useState<HealthEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [lastSynced, setLastSynced] = useState<number | null>(null);
  const [tab, setTab] = useState<"chart" | "log">("chart");

  useEffect(() => { fetchData(); }, [profileId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/profiles/${profileId}/apple-health`);
      const json = await res.json();
      const items = Array.isArray(json) ? json : Array.isArray(json.data) ? json.data : [];
      setData(items);
      setLastSynced(json.last_synced || null);
    } catch { setData([]); }
    setLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadResult(null);
    try {
      const text = await file.text();
      // Parse XML client-side (Apple Health exports can be 100MB+, can't upload to serverless)
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, "text/xml");
      const records = doc.querySelectorAll("Record");

      const relevantTypes: Record<string, string> = {
        "HKQuantityTypeIdentifierStepCount": "steps",
        "HKQuantityTypeIdentifierActiveEnergyBurned": "activeEnergy",
        "HKQuantityTypeIdentifierBasalEnergyBurned": "basalEnergy",
        "HKQuantityTypeIdentifierDistanceWalkingRunning": "distance",
        "HKQuantityTypeIdentifierHeartRate": "heartRate",
        "HKQuantityTypeIdentifierBodyMass": "bodyMass",
        "HKQuantityTypeIdentifierBodyFatPercentage": "bodyFat",
        "HKQuantityTypeIdentifierAppleExerciseTime": "exerciseMinutes",
      };

      // Aggregate by date + type
      const aggregated: Record<string, { type: string; value: number; unit: string; date: string }> = {};
      let scanned = 0;

      records.forEach(r => {
        const rType = r.getAttribute("type") || "";
        if (!relevantTypes[rType]) return;
        scanned++;
        const startDate = r.getAttribute("startDate") || "";
        const date = startDate.slice(0, 10); // yyyy-MM-dd
        if (!date) return;
        const val = parseFloat(r.getAttribute("value") || "0") || 0;
        const unit = r.getAttribute("unit") || "";
        const key = `${date}_${rType}`;
        if (!aggregated[key]) {
          aggregated[key] = { type: relevantTypes[rType], value: 0, unit, date };
        }
        aggregated[key].value += val;
      });

      const entries = Object.values(aggregated);
      // Send aggregated data to server in batches
      const batchSize = 50;
      let imported = 0;
      for (let i = 0; i < entries.length; i += batchSize) {
        const batch = entries.slice(i, i + batchSize);
        const res = await fetch(`/api/profiles/${profileId}/apple-health`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: batch }),
        });
        if (res.ok) {
          const json = await res.json();
          imported += json.imported || 0;
        }
      }
      setUploadResult(`✅ Berhasil import ${imported} data (${scanned.toLocaleString()} records diproses)`);
      fetchData();
    } catch (err: any) {
      setUploadResult(`❌ Error: ${err.message}`);
    }
    setUploading(false);
    e.target.value = "";
  };

  // Chart data
  const stepsData = useMemo(() => data.filter(d => d.type === "steps").map(d => ({ date: d.date, value: d.value })), [data]);
  const caloriesData = useMemo(() => data.filter(d => d.type === "activeEnergy").map(d => ({ date: d.date, value: d.value })), [data]);
  const exerciseData = useMemo(() => data.filter(d => d.type === "exerciseMinutes").map(d => ({ date: d.date, value: d.value })), [data]);

  // Group data by date for log view
  const grouped = useMemo(() => data.reduce((acc, entry) => {
    if (!acc[entry.date]) acc[entry.date] = [];
    acc[entry.date].push(entry);
    return acc;
  }, {} as Record<string, HealthEntry[]>), [data]);
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="space-y-5">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-display text-2xl font-extrabold text-white tracking-tight">Apple Health</h2>
          {lastSynced && (
            <p className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Terakhir sync: {new Date(lastSynced).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>
        <button onClick={fetchData} className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-[#c3f400] transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Tab Toggle: Chart / Log */}
      {data.length > 0 && (
        <div className="flex gap-2">
          <button onClick={() => setTab("chart")} className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${tab === "chart" ? "bg-[#c3f400] text-black" : "bg-zinc-900 text-zinc-500 border border-zinc-800"}`}>
            <BarChart3 className="w-3.5 h-3.5 inline mr-1" />Chart
          </button>
          <button onClick={() => setTab("log")} className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${tab === "log" ? "bg-[#c3f400] text-black" : "bg-zinc-900 text-zinc-500 border border-zinc-800"}`}>
            <Clock className="w-3.5 h-3.5 inline mr-1" />Riwayat
          </button>
        </div>
      )}

      {/* Charts */}
      {data.length > 0 && tab === "chart" && (
        <div className="space-y-4">
          <MiniChart data={stepsData} color="#c3f400" label="Langkah Harian" unit="langkah" />
          <MiniChart data={caloriesData} color="#ff6b35" label="Kalori Aktif" unit="kcal" />
          {exerciseData.length > 0 && <MiniChart data={exerciseData} color="#4361ee" label="Menit Latihan" unit="min" />}
        </div>
      )}

      {/* Daily Log */}
      {data.length > 0 && tab === "log" && (
        <div className="space-y-3">
          {sortedDates.map(date => (
            <div key={date} className="bg-[#201f1f] rounded-2xl border border-zinc-800 p-4 space-y-3">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                {new Date(date + "T00:00:00").toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" })}
              </p>
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
                          {entry.value.toLocaleString()}
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

      {/* Empty state */}
      {!loading && data.length === 0 && (
        <div className="text-center py-8 text-zinc-500 text-sm">
          Belum ada data Apple Health. Upload export atau setup Shortcut di bawah.
        </div>
      )}

      {/* Upload Section */}
      <div className="bg-[#201f1f] rounded-2xl border border-zinc-800 p-5 space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Import dari Apple Health Export</h3>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Buka app <strong className="text-zinc-200">Health</strong> → foto profil → <strong className="text-zinc-200">Export All Health Data</strong> → upload file <code className="text-[#c3f400]">export.xml</code>
        </p>
        <label className="flex items-center justify-center gap-2 bg-[#c3f400] hover:bg-[#abd600] text-black py-3 px-5 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all active:scale-95 min-h-[44px]">
          {uploading ? <><RefreshCw className="w-4 h-4 animate-spin" /> MEMPROSES...</> : <><Upload className="w-4 h-4" /> UPLOAD EXPORT.XML</>}
          <input type="file" accept=".xml" onChange={handleUpload} className="hidden" disabled={uploading} />
        </label>
        {uploadResult && <p className={`text-xs text-center ${uploadResult.includes("✅") ? "text-green-400" : "text-red-400"}`}>{uploadResult}</p>}
      </div>

      {/* iOS Shortcuts Guide */}
      <div className="bg-[#201f1f] rounded-2xl border border-zinc-800 overflow-hidden">
        <button onClick={() => setShowGuide(!showGuide)} className="w-full flex items-center justify-between p-5 text-left">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">⚡ Auto-Sync via iOS Shortcuts</h3>
            <p className="text-xs text-zinc-500 mt-1">Kirim data otomatis setiap hari tanpa export manual</p>
          </div>
          {showGuide ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
        </button>
        <AnimatePresence>
          {showGuide && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
              <div className="px-5 pb-5 space-y-3 text-xs text-zinc-300 leading-relaxed border-t border-zinc-800 pt-4">
                <p className="text-[#c3f400] font-bold">Cara termudah (GET URL, tanpa JSON):</p>
                <ol className="list-decimal list-inside space-y-2">
                  <li>Buka <strong>Shortcuts</strong> → tap <strong>+</strong></li>
                  <li>Add: <strong>Find Health Samples</strong> → Type: Steps, Start Date: today, Limit: 1</li>
                  <li>Add: <strong>Set Variable</strong> → nama: <code className="text-[#c3f400]">steps</code>, value: Health Samples.Value</li>
                  <li>Ulangi untuk <strong>Active Energy</strong> → variable: <code className="text-[#c3f400]">cal</code></li>
                  <li>Add: <strong>Get Contents of URL</strong> (method GET), URL:</li>
                </ol>
                <pre className="bg-black/50 rounded-lg p-3 text-[11px] text-zinc-300 overflow-x-auto break-all">{`https://forge-ai-lilac.vercel.app/api/profiles/${profileId}/apple-health/sync?steps=[steps]&calories=[cal]&date=[Current Date: yyyy-MM-dd]`}</pre>
                <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800">
                  <p className="text-zinc-400"><strong className="text-zinc-200">💡</strong> Automate: tab Automation → + → Time of Day 23:00 → Run Immediately</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {loading && <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 text-zinc-500 animate-spin" /></div>}
    </motion.div>
  );
}
