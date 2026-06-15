import React, { useState } from "react";
import { motion } from "motion/react";
import { Camera, RefreshCw, X, Zap, CheckCircle2, AlertCircle, HelpCircle } from "lucide-react";
import imageCompression from "browser-image-compression";

interface EquipmentScannerProps {
  gymEquipmentList: string[];
  onSaveEquipment: (name: string) => void;
  onRemoveEquipment: (name: string) => void;
}

export default function EquipmentScanner({ 
  gymEquipmentList, 
  onSaveEquipment, 
  onRemoveEquipment 
}: EquipmentScannerProps) {
  // Scanner States
  const [scannerImage, setScannerImage] = useState<string | null>(null);
  const [scannerResult, setScannerResult] = useState<{
    name: string;
    description: string;
    target_muscles: string;
    proper_form: string;
  } | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleScannerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      readAndPreviewFile(file);
    }
  };

  const readAndPreviewFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setScannerError("File yang diunggah harus berupa gambar!");
      return;
    }
    setScannerError(null);
    setScannerResult(null);

    try {
      const compressed = await imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1024 });
      const reader = new FileReader();
      reader.onloadend = () => {
        setScannerImage(reader.result as string);
      };
      reader.readAsDataURL(compressed);
    } catch (err) {
      console.error("Compression error:", err);
      setScannerError("Gagal memproses gambar.");
    }
  };

  const runEquipmentScan = async () => {
    if (!scannerImage) return;
    setIsScanning(true);
    setScannerError(null);
    setScannerResult(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const res = await fetch("/api/scan-equipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: scannerImage }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        setScannerResult(data);
      } else {
        const errData = await res.json();
        setScannerError(errData.error || "Gagal memindai alat gym.");
      }
    } catch (err: any) {
      console.error(err);
      if (err.name === 'AbortError') {
        setScannerError("Waktu habis saat menganalisis gambar. Coba lagi dengan resolusi lebih rendah.");
      } else {
        setScannerError("Gagal menghubungi server untuk memindai alat.");
      }
    } finally {
      setIsScanning(false);
    }
  };

  const resetScanner = () => {
    setScannerImage(null);
    setScannerResult(null);
    setScannerError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) readAndPreviewFile(file);
  };

  return (
    <motion.div 
      key="scanner"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <h2 className="font-display text-2xl font-extrabold text-white tracking-tight">Scanner Alat Gym</h2>
      </div>

      <p className="text-sm text-zinc-400 leading-relaxed">
        Foto alat gym yang ingin kamu ketahui. Kami akan identifikasi nama, target otot, dan cara pakainya.
      </p>

      {/* Main Scanner Card Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Upload Slot */}
        <div 
          onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`relative aspect-square md:aspect-auto md:h-full min-h-[300px] rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-6 ${
            isDragOver ? "border-[#c3f400] bg-[#c3f400]/5" : "border-zinc-800 bg-[#121212] hover:border-zinc-700"
          }`}
        >
          {scannerImage ? (
            <div className="relative w-full h-full flex flex-col">
              <img src={scannerImage} alt="Preview" className="w-full h-full object-contain rounded-xl" />
              <div className="absolute top-2 right-2 flex gap-2">
                <button 
                  onClick={resetScanner}
                  className="bg-black/60 text-white p-2 rounded-full hover:bg-black transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-4 flex gap-2">
                <button 
                  onClick={resetScanner}
                  className="flex-1 bg-zinc-900 border border-zinc-800 text-zinc-400 py-3 rounded-xl text-xs font-bold uppercase tracking-wider min-h-[44px]"
                >
                  HAPUS FOTO
                </button>
                <button 
                  onClick={runEquipmentScan}
                  disabled={isScanning}
                  className="flex-[2] bg-[#c3f400] hover:bg-[#abd600] text-black py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all scale-down active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(195,244,0,0.15)] min-h-[44px]"
                >
                  {isScanning ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      MENGANALISIS ALAT...
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4" />
                      PINDAI SEKARANG
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-4 py-8">
              <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-[#c3f400] transition-colors">
                <Camera className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-200">Seret dan letakkan gambar alat gym di sini</p>
                <p className="text-xs text-zinc-500 mt-1">atau klik tombol di bawah untuk memilih file manual</p>
              </div>

              <label className="bg-zinc-900 border border-zinc-800 hover:border-[#c3f400] text-zinc-300 hover:text-white px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-widest cursor-pointer transition-colors block min-h-[44px] flex items-center justify-center">
                PILIH FILE ATAU FOTO
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleScannerFileChange} 
                  className="hidden" 
                />
              </label>
            </div>
          )}
        </div>

        {/* Analysis Report Display */}
        <div className="bg-[#201f1f] rounded-2xl p-6 border border-zinc-800 flex flex-col justify-between min-h-[340px]">
          {isScanning ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-3 py-12">
              <div className="w-12 h-12 rounded-full border-2 border-t-[#c3f400] border-zinc-850 animate-spin flex items-center justify-center text-[#c3f400]">
                <Zap className="w-5 h-5 animate-pulse" />
              </div>
              <p className="font-display font-bold text-[#c3f400] text-sm animate-pulse">Menganalisis...</p>
              <p className="text-xs text-zinc-500 text-center max-w-[240px]">Mengidentifikasi alat dan cara penggunaannya</p>
            </div>
          ) : scannerResult ? (
            <div className="space-y-4 animate-fade-in flex-1 text-left">
              <div>
                <span className="font-mono text-[12px] font-bold text-[#c3f400] bg-[#c3f400]/10 border border-[#c3f400]/25 rounded px-1.5 py-0.5 uppercase tracking-wider">Identifikasi Sukses</span>
                <h3 className="font-display text-2xl font-black text-white mt-1.5 border-b border-zinc-800 pb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-[#c3f400]" />
                  {scannerResult.name}
                </h3>
              </div>

              <div className="space-y-3 text-sm">
                <div className="space-y-1">
                  <h4 className="text-[12px] uppercase tracking-wider text-zinc-500 font-bold block">Deskripsi Alat</h4>
                  <p className="text-zinc-300 leading-relaxed font-sans text-xs">{scannerResult.description}</p>
                </div>

                <div className="space-y-1">
                  <h4 className="text-[12px] uppercase tracking-wider text-[#a6e6ff] font-bold block">Otot Target Utama</h4>
                  <p className="text-zinc-300 leading-relaxed font-sans text-xs font-semibold italic">{scannerResult.target_muscles}</p>
                </div>

                <div className="space-y-1.5">
                  <h4 className="text-[12px] uppercase tracking-wider text-[#c3f400] font-bold block">Cara Penggunaan Yang Benar</h4>
                  <div className="bg-zinc-900 border border-zinc-850 rounded-xl p-3.5 space-y-1.5 text-[12px] text-zinc-400 leading-relaxed max-h-[140px] overflow-y-auto font-sans">
                    {scannerResult.proper_form.split('\n').map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                  </div>
                </div>

                {/* Save to gym equipment */}
                <button
                  onClick={() => onSaveEquipment(scannerResult.name)}
                  disabled={gymEquipmentList.includes(scannerResult.name)}
                  className="w-full bg-[#c3f400] text-black font-bold py-2.5 rounded-xl text-xs disabled:opacity-40 disabled:cursor-default mt-2"
                >
                  {gymEquipmentList.includes(scannerResult.name) ? '✓ Sudah di Gym List' : '+ Tambah ke Gym List'}
                </button>
              </div>
            </div>
          ) : scannerError ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-3 py-12 text-center text-red-100">
              <AlertCircle className="w-10 h-10 text-red-500 animate-bounce" />
              <div>
                <p className="font-bold">Gagal Menganalisis Gambar</p>
                <p className="text-xs text-zinc-500 mt-1 max-w-[240px] mx-auto leading-relaxed">{scannerError}</p>
              </div>
              <button 
                onClick={resetScanner}
                className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-bold uppercase text-zinc-300 hover:text-white mt-2 min-h-[40px]"
              >
                Atur Ulang & Coba Lagi
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3 py-12 text-zinc-500">
              <HelpCircle className="w-10 h-10 text-zinc-700" />
              <div>
                <p className="text-sm font-bold text-zinc-450">Menunggu Unggahan Foto Alat</p>
                <p className="text-xs text-zinc-600 max-w-[220px] mx-auto mt-1 leading-relaxed">Pindai foto alat/mesin gym apa saja untuk langsung tahu nama, kelompok otot target, dan cara mengoperasikannya.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Gym Equipment List */}
      <div className="bg-[#121212] rounded-2xl p-5 border border-zinc-800 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-display font-bold text-white text-sm">Alat di Gym Saya</h4>
          <span className="text-[12px] text-zinc-500">{gymEquipmentList.length} alat</span>
        </div>
        {gymEquipmentList.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {gymEquipmentList.map(eq => (
              <span key={eq} className="inline-flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-[12px] text-zinc-300">
                {eq}
                <button onClick={() => onRemoveEquipment(eq)} className="text-zinc-600 hover:text-red-400 ml-0.5">×</button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Tambah alat manual..."
            id="manual-equip-input"
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl h-10 px-3 text-xs text-white"
            onKeyDown={e => {
              if (e.key === 'Enter') {
                const input = e.currentTarget;
                if (input.value.trim()) { onSaveEquipment(input.value.trim()); input.value = ''; }
              }
            }}
          />
          <button
            onClick={() => {
              const input = document.getElementById('manual-equip-input') as HTMLInputElement;
              if (input?.value.trim()) { onSaveEquipment(input.value.trim()); input.value = ''; }
            }}
            className="bg-[#c3f400] text-black font-bold px-4 rounded-xl text-xs"
          >+</button>
        </div>
        <p className="text-[12px] text-zinc-600">List ini digunakan saat generate plan latihan</p>
      </div>
    </motion.div>
  );
}
