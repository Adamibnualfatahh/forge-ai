/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  Activity, 
  Dumbbell, 
  Sparkles, 
  Plus, 
  MessageSquare, 
  Settings, 
  Flame, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp, 
  X, 
  ChevronDown, 
  Zap, 
  CheckCircle2, 
  MapPin, 
  Scale, 
  Check, 
  Award,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  RefreshCw,
  Clock,
  UserPlus,
  Compass,
  ArrowUpRight,
  Trash2,
  Edit,
  ArrowUp,
  ArrowDown,
  Camera,
  Upload,
  Sun,
  Moon,
  Download,
  Share2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Profile, Exercise, WorkoutLog, RecompAnalysis, ChatMessage } from "./types";
import RestTimer from "./RestTimer";
import WeightChart from "./WeightChart";
import WorkoutTemplates from "./WorkoutTemplates";
import GoalSetting from "./GoalSetting";
import ProgressiveOverload from "./ProgressiveOverload";
import { getExerciseInfo, searchExercises, EXERCISE_DB, ExerciseInfo } from "./exerciseDb";
import MuscleIcon from "./MuscleIcon";
import ShareCard from "./ShareCard";

export default function App() {
  // Profiles state
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  
  // Custom Profile Form Dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [newProfileHeight, setNewProfileHeight] = useState("175");
  const [newProfileWeight, setNewProfileWeight] = useState("75");
  const [newProfileTargetWeight, setNewProfileTargetWeight] = useState("70");
  const [newProfileFocus, setNewProfileFocus] = useState("Full Body");

  // Form error state
  const [formError, setFormError] = useState("");

  // Navigation tab
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'logger' | 'progress' | 'chat' | 'scanner'>('dashboard');

  // Target Focus Plan state
  const [loggerPlanFocus, setLoggerPlanFocus] = useState("Otomatis (Rekomendasi AI)");

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

  // Saved gym equipment from scanner
  const [gymEquipmentList, setGymEquipmentList] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('forge-gym-equipment') || '[]'); } catch { return []; }
  });

  // Logs state
  const [logs, setLogs] = useState<WorkoutLog[]>([]);

  // Workout elapsed timer
  const [workoutStartTime, setWorkoutStartTime] = useState<number | null>(null);
  const [workoutElapsed, setWorkoutElapsed] = useState(0);

  useEffect(() => {
    if (!workoutStartTime) { setWorkoutElapsed(0); return; }
    const iv = setInterval(() => setWorkoutElapsed(Math.floor((Date.now() - workoutStartTime) / 1000)), 1000);
    return () => clearInterval(iv);
  }, [workoutStartTime]);

  // Exercise search
  const [exSearchQuery, setExSearchQuery] = useState("");
  const [showExSearch, setShowExSearch] = useState(false);

  // Share card after workout
  const [showShare, setShowShare] = useState(false);
  const [shareData, setShareData] = useState<{ focus: string; duration: number; exercises: Exercise[]; volume: number } | null>(null);

  // Dark/Light mode
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('forge-theme');
    return stored ? stored === 'dark' : true;
  });

  useEffect(() => {
    document.body.classList.toggle('light', !darkMode);
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    document.documentElement.style.colorScheme = darkMode ? 'dark' : 'light';
    localStorage.setItem('forge-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Profile Edit/Delete
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editProfileName, setEditProfileName] = useState("");
  const [editProfileHeight, setEditProfileHeight] = useState("");
  const [editProfileWeight, setEditProfileWeight] = useState("");
  const [editProfileTarget, setEditProfileTarget] = useState("");
  const [editProfileFocus, setEditProfileFocus] = useState("");
  const [confirmDeleteProfile, setConfirmDeleteProfile] = useState(false);
  
  // Active/Generated workout plan state
  const [todayPlan, setTodayPlan] = useState<{ focus: string; exercises: Exercise[] } | null>(null);
  const [isActivelyTraining, setIsActivelyTraining] = useState(false);
  const [completedExercises, setCompletedExercises] = useState<{ [key: string]: boolean }>({});
  const [workoutSessionLocation, setWorkoutSessionLocation] = useState("Muscle Prime Gym");

  // Logger Form state
  const [loggerDate, setLoggerDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [loggerLocation, setLoggerLocation] = useState("Muscle Prime Gym");
  const [loggerEquipment, setLoggerEquipment] = useState<string[]>(["Barbell", "Dumbbells"]);
  const [loggerExercises, setLoggerExercises] = useState<Exercise[]>([
    { name: "Barbell Bench Press", sets: 4, reps: "8-10", notes: "Turunkan terkontrol ke dada bawah." },
    { name: "Dumbbell Incline Fly", sets: 3, reps: "12", notes: "Stretch dada maksimal di bawah." },
    { name: "Decline Push Ups", sets: 3, reps: "Max Reps", notes: "Squeeze dada sampai kontraksi optimal." }
  ]);
  const [customExerciseName, setCustomExerciseName] = useState("");
  const [customExerciseSets, setCustomExerciseSets] = useState("3");
  const [customExerciseReps, setCustomExerciseReps] = useState("12");
  const [customExerciseNotes, setCustomExerciseNotes] = useState("");
  const [isGeneratingWorkoutPlan, setIsGeneratingWorkoutPlan] = useState(false);

  // Cardio and weight properties for logging and tracking
  const [customExerciseIsCardio, setCustomExerciseIsCardio] = useState(false);
  const [customExerciseDuration, setCustomExerciseDuration] = useState("30");
  const [customExerciseWeight, setCustomExerciseWeight] = useState("");

  // States to handle editing an existing log
  const [editingLog, setEditingLog] = useState<WorkoutLog | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editFocus, setEditFocus] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editEquipment, setEditEquipment] = useState<string[]>([]);
  const [editExercises, setEditExercises] = useState<Exercise[]>([]);
  // Individual exercise inputs for Edit Dialog/Form
  const [editExName, setEditExName] = useState("");
  const [editExSets, setEditExSets] = useState("3");
  const [editExReps, setEditExReps] = useState("12");
  const [editExNotes, setEditExNotes] = useState("");
  const [editExIsCardio, setEditExIsCardio] = useState(false);
  const [editExDuration, setEditExDuration] = useState("30");
  const [editExWeight, setEditExWeight] = useState("");

  // Delete configuration values
  const [deleteLogId, setDeleteLogId] = useState<string | null>(null);

  // States for inline exercises editing and reordering
  const [editingLoggerExIndex, setEditingLoggerExIndex] = useState<number | null>(null);
  const [editingEditExIndex, setEditingEditExIndex] = useState<number | null>(null);
  const [inlineExName, setInlineExName] = useState("");
  const [inlineExIsCardio, setInlineExIsCardio] = useState(false);
  const [inlineExSets, setInlineExSets] = useState("3");
  const [inlineExReps, setInlineExReps] = useState("12");
  const [inlineExWeight, setInlineExWeight] = useState("");
  const [inlineExDuration, setInlineExDuration] = useState("30");
  const [inlineExNotes, setInlineExNotes] = useState("");

  // States for custom gym calendar UI
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [selectedCalendarDateStr, setSelectedCalendarDateStr] = useState<string | null>(null);

  // Body Recomposition state
  const [latestRecomp, setLatestRecomp] = useState<RecompAnalysis | null>(null);
  const [tbInput, setTbInput] = useState("");
  const [bbInput, setBbInput] = useState("");
  const [isSubmittingRecomp, setIsSubmittingRecomp] = useState(false);
  const [recompHistory, setRecompHistory] = useState<RecompAnalysis[]>([]);

  // AI Chat state
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isSendingChat, setIsSendingChat] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Load baseline profiles on mount
  useEffect(() => {
    fetchProfiles();
  }, []);

  // Fetch profiles from server
  const fetchProfiles = async () => {
    try {
      const res = await fetch("/api/profiles");
      if (res.ok) {
        const data = await res.json();
        setProfiles(data);
      }
    } catch (err) {
      console.error("Failed to fetch profiles:", err);
    }
  };

  // Trigger dependencies load on active profile change
  useEffect(() => {
    if (activeProfile) {
      fetchLogs(activeProfile.id);
      fetchRecomp(activeProfile.id);
      fetchChatHistory(activeProfile.id);
      setTbInput(activeProfile.height?.toString() || "");
      setBbInput(activeProfile.weight?.toString() || "");
      
      // Default dynamic workout plan matching profile focus
      const isLimited = activeProfile.focus_area?.toLowerCase().includes("limited") || false;
      const initialExercises = activeProfile.id === 'thiara' 
        ? [
            { name: "Barbell Back Squats", sets: 4, reps: "8-10", notes: "Jaga dada tegak lurus, dorong dari dasar kaki." },
            { name: "Leg Press Machine", sets: 4, reps: "12", notes: "Squeeze hamstring bergantian dengan betis." },
            { name: "Dumbbell Romanian Deadlifts", sets: 3, reps: "12", notes: "Dorong pinggul ke belakang demi paha belakang." },
            { name: "Plank Hold", sets: 3, reps: "60 detik", notes: "Kencangkan core, hindari pinggul kendur." }
          ]
        : [
            { name: "Barbell Rows", sets: 4, reps: "10-12", notes: "Tarik ke pusar, kunci punggung tetap flat." },
            { name: "Wide-Grip Lat Pulldown", sets: 4, reps: "12", notes: "Buat punggung lebar merata layaknya sayap." },
            { name: "Incline Dumbbell Bicep Curls", sets: 3, reps: "10-12", notes: "Rentangkan lengan maksimal, rasakan regangannya." },
            { name: "Hammer Curls", sets: 3, reps: "12", notes: "Squeeze brachialis demi lengan tegap tebal." }
          ];

      setTodayPlan({
        focus: activeProfile.focus_area || "Pull Plan",
        exercises: initialExercises
      });
      
      // Reset training flow
      setIsActivelyTraining(false);
      setCompletedExercises({});
    }
  }, [activeProfile]);

  const fetchLogs = async (id: string) => {
    try {
      const res = await fetch(`/api/profiles/${id}/logs`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRecomp = async (id: string) => {
    try {
      const res = await fetch(`/api/profiles/${id}/recomp`);
      if (res.ok) {
        const data = await res.json();
        setLatestRecomp(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchChatHistory = async (id: string) => {
    try {
      const res = await fetch(`/api/profiles/${id}/chat`);
      if (res.ok) {
        const data = await res.json();
        setChatHistory(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Scroll to bottom of chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // Profiles Creation handler
  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!newProfileName.trim()) { setFormError("Nama wajib diisi"); return; }
    if (!newProfileHeight || parseFloat(newProfileHeight) <= 0) { setFormError("Tinggi badan tidak valid"); return; }
    if (!newProfileWeight || parseFloat(newProfileWeight) <= 0) { setFormError("Berat badan tidak valid"); return; }

    try {
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProfileName,
          height: parseFloat(newProfileHeight),
          weight: parseFloat(newProfileWeight),
          target_weight: parseFloat(newProfileTargetWeight) || parseFloat(newProfileWeight),
          focus_area: newProfileFocus
        })
      });

      if (!res.ok) { setFormError("Gagal menyimpan profil. Coba lagi."); return; }
      const data = await res.json();
      await fetchProfiles();
      setActiveProfile(data);
      setShowCreateDialog(false);
      setFormError("");
      setNewProfileName("");
      setNewProfileHeight("175");
      setNewProfileWeight("75");
      setNewProfileTargetWeight("70");
      setNewProfileFocus("Full Body");
    } catch (err) {
      setFormError("Koneksi gagal. Periksa jaringan.");
    }
  };

  // Profile Edit handler
  const handleEditProfile = async () => {
    if (!activeProfile) return;
    setFormError("");
    if (!editProfileName.trim()) { setFormError("Nama wajib diisi"); return; }
    if (!editProfileHeight || parseFloat(editProfileHeight) <= 0) { setFormError("Tinggi tidak valid"); return; }
    if (!editProfileWeight || parseFloat(editProfileWeight) <= 0) { setFormError("Berat tidak valid"); return; }
    try {
      const res = await fetch(`/api/profiles/${activeProfile.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editProfileName, height: parseFloat(editProfileHeight), weight: parseFloat(editProfileWeight), target_weight: parseFloat(editProfileTarget) || parseFloat(editProfileWeight), focus_area: activeProfile.focus_area || "Full Body" })
      });
      if (!res.ok) { setFormError("Gagal menyimpan perubahan"); return; }
      const updated = await res.json();
      setActiveProfile(updated);
      await fetchProfiles();
      setShowEditProfile(false);
    } catch { setFormError("Koneksi gagal"); }
  };

  // Profile Delete handler
  const handleDeleteProfile = async () => {
    if (!activeProfile) return;
    await fetch(`/api/profiles/${activeProfile.id}`, { method: "DELETE" });
    setActiveProfile(null);
    setConfirmDeleteProfile(false);
    await fetchProfiles();
  };

  // Open edit profile dialog
  const openEditProfile = () => {
    if (!activeProfile) return;
    setEditProfileName(activeProfile.name);
    setEditProfileHeight(String(activeProfile.height));
    setEditProfileWeight(String(activeProfile.weight));
    setEditProfileTarget(String(activeProfile.target_weight));
    setEditProfileFocus(activeProfile.focus_area);
    setShowEditProfile(true);
  };

  // CSV Export
  const handleExportCSV = () => {
    if (!activeProfile) return;
    window.open(`/api/profiles/${activeProfile.id}/export-csv`, '_blank');
  };

  // Apply template to logger
  const applyTemplate = (focus: string, exercises: Exercise[]) => {
    setLoggerExercises(exercises);
    setTodayPlan({ focus, exercises });
  };

  // Generator workout plan based on current logger setup
  const generateWorkoutPlan = async () => {
    if (!activeProfile) return;
    setIsGeneratingWorkoutPlan(true);

    try {
      const res = await fetch("/api/workouts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: activeProfile.id,
          location: loggerLocation,
          equipment: [...loggerEquipment, ...gymEquipmentList],
          lastFocus: todayPlan?.focus || activeProfile.focus_area,
          gymCompleteness: (loggerEquipment.length + gymEquipmentList.length) >= 4 ? "full gym" : "limited",
          targetFocus: loggerPlanFocus
        })
      });

      if (res.ok) {
        const data = await res.json();
        setLoggerExercises(data.exercises);
        setLoggerExercises((prev) => {
          // If exercises empty, fallback
          if (prev.length === 0) {
            return [
              { name: "Barbell Squats", sets: 4, reps: "10", notes: "Latihan asik sejuta umat." }
            ];
          }
          return prev;
        });
        
        // Populate current logger focus
        const planFocus = data.focus || "Custom Plan";
        setTodayPlan({
          focus: planFocus,
          exercises: data.exercises
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingWorkoutPlan(false);
    }
  };

  // Render message markdown formatting nicely
  const renderFormattedMessage = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');
    let insideList = false;
    let listItems: React.ReactNode[] = [];
    const elements: React.ReactNode[] = [];

    const formatInline = (str: string) => {
      const parts = str.split(/\*\*([^*]+)\*\*/g);
      return parts.map((part, i) => {
        if (i % 2 === 1) {
          return <strong key={i} className="text-[#c3f400] font-black">{part}</strong>;
        }
        const codeParts = part.split(/`([^`]+)`/g);
        return codeParts.map((subPart, j) => {
          if (j % 2 === 1) {
            return (
              <code key={j} className="font-mono bg-zinc-950 px-1.5 py-0.5 border border-zinc-850 rounded text-xs text-[#a6e6ff] select-all">
                {subPart}
              </code>
            );
          }
          return subPart;
        });
      });
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\.\s/.test(trimmed);

      if (isBullet) {
        if (!insideList) {
          insideList = true;
          listItems = [];
        }
        const content = trimmed.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '');
        listItems.push(
          <li key={index} className="ml-4 list-disc pl-1 mb-1 text-zinc-300">
            {formatInline(content)}
          </li>
        );
      } else {
        if (insideList) {
          elements.push(
            <ul key={`list-${index}`} className="my-2 space-y-1 list-inside">
              {listItems}
            </ul>
          );
          insideList = false;
          listItems = [];
        }

        if (trimmed === '') {
          elements.push(<div key={`spacer-${index}`} className="h-2" />);
        } else {
          elements.push(
            <p key={index} className="leading-relaxed mb-1 text-zinc-300">
              {formatInline(line)}
            </p>
          );
        }
      }
    });

    if (insideList) {
      elements.push(
        <ul key="list-last" className="my-2 space-y-1 list-inside">
          {listItems}
        </ul>
      );
    }

    return <div className="space-y-1">{elements}</div>;
  };

  // Scanner image upload reader helper
  const handleScannerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      readAndPreviewFile(file);
    }
  };

  const readAndPreviewFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setScannerError("File yang diunggah harus berupa gambar!");
      return;
    }
    setScannerError(null);
    setScannerResult(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      setScannerImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const runEquipmentScan = async () => {
    if (!scannerImage) return;
    setIsScanning(true);
    setScannerError(null);
    setScannerResult(null);

    try {
      const res = await fetch("/api/scan-equipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: scannerImage })
      });

      if (res.ok) {
        const data = await res.json();
        setScannerResult(data);
      } else {
        const errData = await res.json();
        setScannerError(errData.error || "Gagal memindai alat gym.");
      }
    } catch (err) {
      console.error(err);
      setScannerError("Gagal menghubungi server untuk memindai alat.");
    } finally {
      setIsScanning(false);
    }
  };

  const resetScanner = () => {
    setScannerImage(null);
    setScannerResult(null);
    setScannerError(null);
  };

  const saveEquipmentToGym = (name: string) => {
    if (!name || gymEquipmentList.includes(name)) return;
    const updated = [...gymEquipmentList, name];
    setGymEquipmentList(updated);
    localStorage.setItem('forge-gym-equipment', JSON.stringify(updated));
  };

  const removeGymEquipment = (name: string) => {
    const updated = gymEquipmentList.filter(e => e !== name);
    setGymEquipmentList(updated);
    localStorage.setItem('forge-gym-equipment', JSON.stringify(updated));
  };

  // Save manual/custom workout log
  const handleSaveWorkoutLog = async () => {
    if (!activeProfile) return;
    if (loggerExercises.length === 0) { setFormError("Tambahkan minimal 1 gerakan"); return; }
    if (!loggerDate) { setFormError("Tanggal wajib diisi"); return; }
    setFormError("");
    
    try {
      const res = await fetch(`/api/profiles/${activeProfile.id}/logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: loggerDate,
          focus: todayPlan?.focus || "Custom Workouts",
          location: loggerLocation,
          equipment: loggerEquipment.join(", "),
          exercises: loggerExercises
        })
      });

      if (!res.ok) { setFormError("Gagal menyimpan workout. Coba lagi."); return; }
      await fetchLogs(activeProfile.id);
      await fetchProfiles();
      setActiveProfile(prev => prev ? {
        ...prev,
        total_sessions: prev.total_sessions + 1,
        streak: prev.streak + 1
      } : null);
      setCurrentTab('dashboard');
    } catch (err) {
      setFormError("Koneksi gagal. Periksa jaringan.");
    }
  };

  // Start executing the interactive today plan
  const triggerStartWorkout = () => {
    setIsActivelyTraining(true);
    setCompletedExercises({});
    setWorkoutStartTime(Date.now());
  };

  // Toggle set / exercises checkbox completion in active workout
  const toggleExerciseCheck = (index: number) => {
    setCompletedExercises(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Finished active workout checkpoint
  const submitActiveWorkout = async () => {
    if (!activeProfile || !todayPlan) return;

    try {
      const todayDateStr = new Date().toISOString().split('T')[0];
      const res = await fetch(`/api/profiles/${activeProfile.id}/logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: todayDateStr,
          focus: todayPlan.focus,
          location: workoutSessionLocation,
          equipment: "Pilihan Custom",
          exercises: todayPlan.exercises
        })
      });

      if (res.ok) {
        const vol = calculateTotalVolume(todayPlan.exercises);
        setShareData({ focus: todayPlan.focus, duration: workoutElapsed, exercises: todayPlan.exercises, volume: vol });
        setShowShare(true);
        setIsActivelyTraining(false);
        setCompletedExercises({});
        setWorkoutStartTime(null);
        await fetchLogs(activeProfile.id);
        await fetchProfiles();
        setActiveProfile(prev => prev ? {
          ...prev,
          total_sessions: prev.total_sessions + 1,
          streak: prev.streak + 1
        } : null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit metrics to trigger Body Recomposition Advice inside Progress Tab
  const handleLogMetrics = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfile) return;

    const tb = parseFloat(tbInput);
    const bb = parseFloat(bbInput);

    if (isNaN(tb) || isNaN(bb) || tb <= 0 || bb <= 0) {
      alert("Masukkan Tinggi Badan (cm) dan Berat Badan (kg) dengan angka positif yang valid.");
      return;
    }

    setIsSubmittingRecomp(true);
    try {
      const res = await fetch(`/api/profiles/${activeProfile.id}/recomp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ height: tb, weight: bb })
      });

      if (res.ok) {
        const data = await res.json();
        setLatestRecomp(data);
        // Refresh active profile metrics as height/weight gets updated in active profile
        setProfiles(prev => prev.map(p => p.id === activeProfile.id ? { ...p, height: tb, weight: bb } : p));
        setActiveProfile(prev => prev ? { ...prev, height: tb, weight: bb } : null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingRecomp(false);
    }
  };

  // Send Conversational Chat to Forge AI
  const handleSendChat = async (inputMessageProps?: string) => {
    if (!activeProfile) return;
    const msgToSend = inputMessageProps || chatInput;
    if (!msgToSend.trim()) return;

    if (!inputMessageProps) {
      setChatInput("");
    }
    
    // Optimistic UI updates
    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      profile_id: activeProfile.id,
      sender: 'user',
      message: msgToSend,
      timestamp: Date.now()
    };
    
    setChatHistory(prev => [...prev, userMsg]);
    setIsSendingChat(true);

    try {
      const res = await fetch(`/api/profiles/${activeProfile.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msgToSend })
      });

      if (res.ok) {
        const aiResponse = await res.json();
        setChatHistory(prev => [...prev, aiResponse]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSendingChat(false);
    }
  };

  // Suggest last known location automatically
  useEffect(() => {
    if (activeProfile && logs && logs.length > 0) {
      const lastKnownLoc = logs[0]?.location || logs[logs.length - 1]?.location;
      if (lastKnownLoc && lastKnownLoc.trim() !== "") {
        setLoggerLocation(lastKnownLoc);
        setWorkoutSessionLocation(lastKnownLoc);
      }
    }
  }, [logs, activeProfile]);

  // Volume calculations and funny/insightful animals comparison helpers
  const calculateTotalVolume = (exercises: Exercise[]): number => {
    if (!exercises || exercises.length === 0) return 0;
    return exercises.reduce((acc, ex) => {
      if (ex.is_cardio) return acc;
      const sets = ex.sets || 0;
      let repsCount = 10;
      const match = ex.reps.match(/\d+/);
      if (match) {
        repsCount = parseInt(match[0]);
      }
      const weight = ex.weight_kg || 0;
      return acc + (sets * repsCount * weight);
    }, 0);
  };

  const getAnimalAnalogy = (volumeKg: number): string => {
    if (volumeKg <= 0) return "Sesi ini tidak memiliki angkatan beban.";
    if (volumeKg <= 100) return `Setara dengan mengangkat seekor Kambing Dewasa! 🐐 (${volumeKg} kg)`;
    if (volumeKg <= 250) return `Setara dengan mengangkat seekor Gorila Gunung! 🦍 (${volumeKg} kg)`;
    if (volumeKg <= 500) return `Setara dengan mengangkat seekor Beruang Grizzly! 🐻 (${volumeKg} kg)`;
    if (volumeKg <= 1000) return `Setara dengan mengangkat seekor Sapi Limousin! 🐂 (${volumeKg} kg)`;
    if (volumeKg <= 2500) return `Setara dengan mengangkat seekor Badak Sumatra! 🦏 (${volumeKg} kg)`;
    if (volumeKg <= 5000) return `Setara dengan mengangkat seekor Gajah Asia! 🐘 (${volumeKg} kg)`;
    return `Setara dengan mengangkat sebuah Truk Ekspedisi Colt Diesel! 🚚 (${volumeKg} kg)`;
  };

  // Calendar Renderer Helper
  const renderCalendar = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const monthNames = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay(); // Weekday index 0-6
    
    const daysArr = [];
    // Padding for first week
    for (let i = 0; i < firstDayIndex; i++) {
      daysArr.push(null);
    }
    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
      daysArr.push(d);
    }
    
    const weekdays = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    
    return (
      <div className="bg-[#121212] p-5 rounded-2xl border border-zinc-800 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
          <h4 className="font-display font-black text-white text-md tracking-tight flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#c3f400]" />
            Kalender Latihan
          </h4>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
              className="p-1 px-2 text-xs bg-zinc-800 hover:bg-zinc-700 hover:text-white rounded text-[#c4c9ac] transition-all"
            >
              &lt;
            </button>
            <span className="font-display text-sm font-extrabold text-white">
              {monthNames[month]} {year}
            </span>
            <button 
              onClick={() => setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
              className="p-1 px-2 text-xs bg-zinc-800 hover:bg-zinc-700 hover:text-white rounded text-[#c4c9ac] transition-all"
            >
              &gt;
            </button>
          </div>
        </div>
        
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 text-center font-sans text-xs">
          {/* Weekday headers */}
          {weekdays.map(wd => (
            <div key={wd} className="text-zinc-500 font-bold py-1 select-none">
              {wd}
            </div>
          ))}
          
          {/* Cells */}
          {daysArr.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="py-2.5"></div>;
            }
            
            // Format date to local YYYY-MM-DD
            const monthStr = String(month + 1).padStart(2, '0');
            const dayStr = String(day).padStart(2, '0');
            const cellDateStr = `${year}-${monthStr}-${dayStr}`;
            
            // Search any workouts logged on this YYYY-MM-DD
            const workoutsOnDay = logs.filter(log => {
              return log.date === cellDateStr;
            });
            
            const hasWorkout = workoutsOnDay.length > 0;
            const isSelected = selectedCalendarDateStr === cellDateStr;
            
            return (
              <button
                key={`day-${day}`}
                onClick={() => {
                  if (hasWorkout) {
                    setSelectedCalendarDateStr(isSelected ? null : cellDateStr);
                  } else {
                    setSelectedCalendarDateStr(null);
                  }
                }}
                disabled={!hasWorkout}
                className={`py-2 rounded-lg font-bold transition-all relative border flex flex-col items-center justify-center min-h-[40px] ${
                  hasWorkout 
                    ? isSelected 
                      ? "bg-[#c3f400] text-black border-[#c3f400] shadow-[0_0_15px_rgba(195,244,0,0.4)]"
                      : "bg-[#c3f400]/15 text-white border-[#c3f400]/40 hover:bg-[#c3f400]/25"
                    : "text-zinc-650 border-transparent hover:bg-zinc-900/40 cursor-default"
                }`}
              >
                <span>{day}</span>
                {hasWorkout && !isSelected && (
                  <span className="w-1.5 h-1.5 bg-[#c3f400] rounded-full absolute bottom-1"></span>
                )}
              </button>
            );
          })}
        </div>
        
        {/* Calendar Selected Day Workouts drawer/display inline */}
        {selectedCalendarDateStr && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 bg-zinc-950 p-4 rounded-xl border border-zinc-800/80 space-y-3"
          >
            <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
              <span className="text-xs text-[#c3f400] font-bold font-mono">DETAIL SESI: {selectedCalendarDateStr}</span>
              <button 
                onClick={() => setSelectedCalendarDateStr(null)}
                className="text-zinc-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {logs.filter(log => log.date === selectedCalendarDateStr).map((log, idx) => (
              <div key={idx} className="space-y-2 text-left">
                <div className="flex justify-between">
                  <h5 className="font-display font-extrabold text-white text-sm">{log.focus}</h5>
                  {log.location && <span className="text-[10px] text-zinc-400 font-bold">@ {log.location}</span>}
                </div>
                <div className="space-y-1 bg-zinc-900/50 p-2.5 rounded border border-zinc-800/40">
                  {log.exercises?.map((ex, exIdx) => (
                    <div key={exIdx} className="text-xs text-[#c4c9ac] flex justify-between">
                      <span>• {ex.name}</span>
                      <span className="text-zinc-400">
                        {ex.is_cardio 
                          ? `⏱️ ${ex.duration_minutes || 30}m Kardio` 
                          : `${ex.sets}s x ${ex.reps} ${ex.weight_kg ? `@ ${ex.weight_kg}kg` : ""}`}
                      </span>
                    </div>
                  ))}
                </div>
                
                {/* Total volume for selected day */}
                <div className="text-[11px] text-[#a6e6ff] font-mono leading-relaxed bg-[#a6e6ff]/10 p-2 rounded">
                  📈 <strong>Total Angkatan:</strong> {calculateTotalVolume(log.exercises)} kg <br />
                  💡 {getAnimalAnalogy(calculateTotalVolume(log.exercises))}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    );
  };

  // Delete log action
  const handleDeleteWorkoutLog = async (logId: string) => {
    if (!activeProfile) return;
    try {
      const res = await fetch(`/api/profiles/${activeProfile.id}/logs/${logId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        // Refresh logs and client profile statistics
        await fetchLogs(activeProfile.id);
        await fetchProfiles();
        // Update local active profile sessions count
        setActiveProfile(prev => prev ? {
          ...prev,
          total_sessions: Math.max(0, prev.total_sessions - 1)
        } : null);
        setDeleteLogId(null);
      } else {
        alert("Gagal menghapus riwayat latihan.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Reorder exercises list on logger tab
  const moveLoggerExercise = (index: number, direction: 'up' | 'down') => {
    setLoggerExercises(prev => {
      const newList = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newList.length) return prev;
      const temp = newList[index];
      newList[index] = newList[targetIndex];
      newList[targetIndex] = temp;
      return newList;
    });
  };

  // Reorder exercises list in edit log modal
  const moveEditExercise = (index: number, direction: 'up' | 'down') => {
    setEditExercises(prev => {
      const newList = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newList.length) return prev;
      const temp = newList[index];
      newList[index] = newList[targetIndex];
      newList[targetIndex] = temp;
      return newList;
    });
  };

  // Start inline editing of an exercise in logger list
  const startInlineEditLoggerEx = (index: number, ex: Exercise) => {
    setEditingLoggerExIndex(index);
    setInlineExName(ex.name);
    setInlineExIsCardio(!!ex.is_cardio);
    setInlineExSets(String(ex.sets || 3));
    setInlineExReps(ex.reps || "12");
    setInlineExWeight(ex.weight_kg ? String(ex.weight_kg) : "");
    setInlineExDuration(ex.duration_minutes ? String(ex.duration_minutes) : "30");
    setInlineExNotes(ex.notes || "");
  };

  // Save inline edit in logger list
  const saveInlineEditLoggerEx = (index: number) => {
    if (!inlineExName.trim()) return;
    setLoggerExercises(prev => {
      const newList = [...prev];
      newList[index] = {
        name: inlineExName,
        sets: inlineExIsCardio ? 1 : (parseInt(inlineExSets) || 3),
        reps: inlineExIsCardio ? `${inlineExDuration} Menit` : (inlineExReps || "12"),
        notes: inlineExNotes || (inlineExIsCardio ? "Treadmill/Kardio" : "Eksekusi gerak terkendali"),
        is_cardio: inlineExIsCardio,
        duration_minutes: inlineExIsCardio ? (parseInt(inlineExDuration) || 30) : undefined,
        weight_kg: (!inlineExIsCardio && inlineExWeight.trim()) ? (parseFloat(inlineExWeight) || undefined) : undefined
      };
      return newList;
    });
    setEditingLoggerExIndex(null);
  };

  // Start inline editing of an exercise in edit modal
  const startInlineEditEditEx = (index: number, ex: Exercise) => {
    setEditingEditExIndex(index);
    setInlineExName(ex.name);
    setInlineExIsCardio(!!ex.is_cardio);
    setInlineExSets(String(ex.sets || 3));
    setInlineExReps(ex.reps || "12");
    setInlineExWeight(ex.weight_kg ? String(ex.weight_kg) : "");
    setInlineExDuration(ex.duration_minutes ? String(ex.duration_minutes) : "30");
    setInlineExNotes(ex.notes || "");
  };

  // Save inline edit in edit modal
  const saveInlineEditEditEx = (index: number) => {
    if (!inlineExName.trim()) return;
    setEditExercises(prev => {
      const newList = [...prev];
      newList[index] = {
        name: inlineExName,
        sets: inlineExIsCardio ? 1 : (parseInt(inlineExSets) || 3),
        reps: inlineExIsCardio ? `${inlineExDuration} Menit` : (inlineExReps || "12"),
        notes: inlineExNotes || (inlineExIsCardio ? "Treadmill/Kardio" : "Eksekusi gerak terkendali"),
        is_cardio: inlineExIsCardio,
        duration_minutes: inlineExIsCardio ? (parseInt(inlineExDuration) || 30) : undefined,
        weight_kg: (!inlineExIsCardio && inlineExWeight.trim()) ? (parseFloat(inlineExWeight) || undefined) : undefined
      };
      return newList;
    });
    setEditingEditExIndex(null);
  };

  // Populate state to edit a log
  const startEditLog = (log: WorkoutLog) => {
    setEditingLog(log);
    setEditDate(log.date);
    setEditFocus(log.focus);
    setEditLocation(log.location || "");
    const equipArray = log.equipment ? log.equipment.split(",").map(e => e.trim()) : [];
    setEditEquipment(equipArray);
    setEditExercises(log.exercises || []);
    
    // reset individual add forms inside edit
    setEditExName("");
    setEditExSets("3");
    setEditExReps("12");
    setEditExNotes("");
    setEditExIsCardio(false);
    setEditExDuration("30");
    setEditExWeight("");
  };

  // Save edited log changes
  const handleUpdateWorkoutLog = async () => {
    if (!activeProfile || !editingLog) return;
    try {
      const res = await fetch(`/api/profiles/${activeProfile.id}/logs/${editingLog.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: editDate,
          focus: editFocus,
          location: editLocation,
          equipment: editEquipment.join(", "),
          exercises: editExercises
        })
      });
      if (res.ok) {
        await fetchLogs(activeProfile.id);
        setEditingLog(null);
      } else {
        alert("Gagal memperbarui riwayat latihan.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add individual exercise inside editing log
  const handleAddEditCustomExercise = () => {
    if (!editExName.trim()) return;
    const newEx: Exercise = {
      name: editExName,
      sets: editExIsCardio ? 1 : (parseInt(editExSets) || 3),
      reps: editExIsCardio ? `${editExDuration} Menit` : (editExReps || "12"),
      notes: editExNotes || (editExIsCardio ? "Treadmill/Kardio" : "Eksekusi gerak terkendali"),
      is_cardio: editExIsCardio,
      duration_minutes: editExIsCardio ? (parseInt(editExDuration) || 30) : undefined,
      weight_kg: (!editExIsCardio && editExWeight.trim()) ? (parseFloat(editExWeight) || undefined) : undefined
    };

    setEditExercises(prev => [...prev, newEx]);
    setEditExName("");
    setEditExNotes("");
    setEditExWeight("");
  };

  // Add customized exercise inside manual logger form
  const handleAddCustomExercise = () => {
    if (!customExerciseName.trim()) return;
    const newEx: Exercise = {
      name: customExerciseName,
      sets: customExerciseIsCardio ? 1 : (parseInt(customExerciseSets) || 3),
      reps: customExerciseIsCardio ? `${customExerciseDuration} Menit` : (customExerciseReps || "12"),
      notes: customExerciseNotes || (customExerciseIsCardio ? "Treadmill/Kardio" : "Eksekusi gerak terkendali"),
      is_cardio: customExerciseIsCardio,
      duration_minutes: customExerciseIsCardio ? (parseInt(customExerciseDuration) || 30) : undefined,
      weight_kg: (!customExerciseIsCardio && customExerciseWeight.trim()) ? (parseFloat(customExerciseWeight) || undefined) : undefined
    };

    setLoggerExercises(prev => [...prev, newEx]);
    setCustomExerciseName("");
    setCustomExerciseNotes("");
    setCustomExerciseWeight("");
  };

  // Toggle equipment item select inside manual logger form
  const toggleLoggerEquipment = (item: string) => {
    if (loggerEquipment.includes(item)) {
      setLoggerEquipment(prev => prev.filter(e => e !== item));
    } else {
      setLoggerEquipment(prev => [...prev, item]);
    }
  };

  // Quick Action Buttons definitions inside Chat tab to improve user UX
  const chatPrompts = [
    "Bagaimana cara squats yang benar?",
    "Menu protein murah meriah penambah otot",
    "Tips rampingkan perut buncit dalam sebulan",
    "Mending surplus kalori atau deficit kalori saat ideal?"
  ];

  // Calculated BMI dynamically
  const computedBmiVal = activeProfile?.weight && activeProfile?.height 
    ? (activeProfile.weight / Math.pow(activeProfile.height / 100, 2)).toFixed(1)
    : "0.0";

  // BMI status selector
  const getBmiStatus = (bmiStr: string) => {
    const val = parseFloat(bmiStr);
    if (val === 0) return "Not Logged";
    if (val < 18.5) return "Underweight (Surplus Target!)";
    if (val < 24.9) return "Ideal Atletis (Rekomposisi!)";
    return "Overweight (Deficit Target!)";
  };

  if (!activeProfile) {
    // ---------------- PROFILE SELECTOR SCREEN ----------------
    return (
      <div className="min-h-screen w-full bg-[#0d0d0d] text-[#e5e2e1] px-6 py-12 flex flex-col items-center justify-center relative overflow-hidden" id="profile-selection-canvas">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] bg-[#c3f400]/5 rounded-full blur-[100px] pointer-events-none"></div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.5 }}
          className="w-full max-w-4xl relative z-10 flex flex-col items-center"
        >
          {/* Header */}
          <header className="text-center mb-12">
            <div className="w-16 h-16 rounded-full bg-[#201f1f] flex items-center justify-center mx-auto mb-6 border border-[#444933] shadow-[0_0_25px_rgba(195,244,0,0.1)]">
              <Dumbbell className="text-[#c3f400] w-8 h-8" />
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tighter text-white mb-3">FORGE AI</h1>
            <p className="font-sans text-base text-zinc-400 max-w-md mx-auto">Pilih profil untuk melanjutkan</p>
          </header>

          {/* Profiles Selection Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl mb-12">
            {profiles.length === 0 ? (
              // Loading fallback
              <div className="col-span-2 text-center text-[#c4c9ac]">
                <RefreshCw className="animate-spin inline-block mr-2 text-[#c3f400]" /> Memuat...
              </div>
            ) : (
              profiles.map((profile) => (
                <motion.button
                  key={profile.id}
                  whileHover={{ scale: 1.02, borderColor: "#c3f400" }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveProfile(profile)}
                  className="group relative flex flex-col items-center justify-center p-8 rounded-2xl bg-[#201f1f] border border-[#444933] hover:shadow-[0_0_30px_rgba(195,244,0,0.15)] transition-all ease-out h-[280px] w-full"
                >
                  {/* Subtle inner linear neon lights */}
                  <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#c3f400]/45 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  
                  <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-zinc-700 group-hover:border-[#c3f400] transition-colors p-1" id={`avatar-${profile.id}`}>
                    <img 
                      src={profile.avatar} 
                      alt={profile.name} 
                      className="w-full h-full object-cover rounded-full filter grayscale group-hover:grayscale-0 transition-all duration-300"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  
                  <h2 className="title-profile font-display text-2xl font-bold text-white mt-4">{profile.name}</h2>
                  <p className="font-sans text-sm text-[#c4c9ac] mt-1">{profile.height}cm • {profile.weight}kg</p>
                  <p className="font-sans text-[11px] font-semibold text-[#c3f400] bg-[#c3f400]/10 border border-[#c3f400]/30 px-2 py-0.5 rounded-full mt-2 uppercase tracking-wide">
                    {profile.focus_area}
                  </p>

                  <div className="mt-4 flex items-center justify-center gap-2 font-display text-xs font-semibold text-[#c3f400] opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                    <span>Pilih Profil</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </motion.button>
              ))
            )}
          </div>

          {/* Action Trigger Buttons */}
          <button 
            onClick={() => setShowCreateDialog(true)}
            className="font-sans text-sm font-semibold text-[#c4c9ac] hover:text-white transition-colors flex items-center gap-2 px-6 py-3 rounded-full border border-zinc-800 hover:border-[#444933] bg-zinc-900/50 hover:bg-[#201f1f]"
          >
            <UserPlus className="w-4 h-4 text-[#c3f400]" />
            Buat Profil Baru
          </button>
        </motion.div>

        {/* Create Profile Dialog Pop-up */}
        <AnimatePresence>
          {showCreateDialog && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-[#201f1f] border border-[#444933] rounded-2xl w-full max-w-md p-6 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-[3px] bg-[#c3f400]"></div>
                <button 
                  onClick={() => setShowCreateDialog(false)}
                  className="absolute top-4 right-4 text-[#c4c9ac] hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>

                <h3 className="font-display text-xl font-bold tracking-tight text-white mb-4">Profil Baru</h3>
                <form onSubmit={handleCreateProfile} className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-[#c4c9ac] font-bold mb-1">Nama Lengkap</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. John Doe"
                      value={newProfileName}
                      onChange={(e) => setNewProfileName(e.target.value)}
                      className="w-full bg-[#131313] border border-zinc-700 rounded-lg h-11 px-3 text-white focus:outline-none focus:border-[#c3f400] transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs uppercase tracking-widest text-[#c4c9ac] font-bold mb-1">Tinggi Badan (cm)</label>
                      <input 
                        type="number" 
                        required
                        value={newProfileHeight}
                        onChange={(e) => setNewProfileHeight(e.target.value)}
                        className="w-full bg-[#131313] border border-zinc-700 rounded-lg h-11 px-3 text-white focus:outline-none focus:border-[#c3f400] transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-widest text-[#c4c9ac] font-bold mb-1">Berat Badan (kg)</label>
                      <input 
                        type="number" 
                        required
                        value={newProfileWeight}
                        onChange={(e) => setNewProfileWeight(e.target.value)}
                        className="w-full bg-[#131313] border border-zinc-700 rounded-lg h-11 px-3 text-white focus:outline-none focus:border-[#c3f400] transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-widest text-[#c4c9ac] font-bold mb-1">Target Berat (kg)</label>
                    <input 
                      type="number" 
                      required
                      value={newProfileTargetWeight}
                      onChange={(e) => setNewProfileTargetWeight(e.target.value)}
                      className="w-full bg-[#131313] border border-zinc-700 rounded-lg h-11 px-3 text-white focus:outline-none focus:border-[#c3f400] transition-colors"
                    />
                  </div>

                  {formError && <p className="field-error-msg text-center">{formError}</p>}
                  <button 
                    type="submit" 
                    className="w-full bg-[#c3f400] hover:bg-[#abd600] text-black font-display font-bold py-3 px-4 rounded-xl shadow-[0_4px_15px_rgba(195,244,0,0.2)] transition-opacity"
                  >
                    Simpan Profil
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ---------------- MAIN INNER APPLICATION CANVAS ----------------
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e5e2e1] flex flex-col font-sans select-none" id="applet-viewport" style={{ maxWidth: '430px', margin: '0 auto' }}>
      {/* GLOBAL HEADER BAR */}
      <header className="ios-glass bg-[#121212]/80 dark-nav sticky top-0 z-40 border-b border-[#2c2c2c] dark-border pt-[env(safe-area-inset-top,16px)] pb-3 px-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden border border-zinc-800 hover:opacity-80 transition-opacity p-0.5" id="profile-trigger-avatar">
            <img 
              src={activeProfile.avatar} 
              alt={activeProfile.name} 
              className="w-full h-full object-cover rounded-full"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-display font-bold text-white text-sm tracking-tight">{activeProfile.name}</span>
            <span className="font-sans text-[10px] text-zinc-500">{activeProfile.focus_area || 'Training'}</span>
          </div>
        </div>

        {/* Swap Profile Settings trigger button */}
        <div className="flex gap-2">
          <button onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg border border-zinc-800 dark-border bg-zinc-900/60 dark-card text-zinc-300 hover:text-white transition-all">
            {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
          <button onClick={openEditProfile}
            className="p-2 rounded-lg border border-zinc-800 dark-border bg-zinc-900/60 dark-card text-zinc-300 hover:text-white transition-all">
            <Settings className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={() => setActiveProfile(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 dark-border bg-zinc-900/60 dark-card hover:bg-[#201f1f] text-xs font-semibold text-zinc-300 hover:text-white transition-all scale-down active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ganti</span>
          </button>
        </div>
      </header>

      {/* VIEWPORT AREA RESPONSIVE CONTAINER */}
      <main className="w-full max-w-[1200px] px-4 md:px-6 mx-auto mt-6 flex-1 flex flex-col pb-[calc(env(safe-area-inset-bottom)+100px)]">
        
        {/* INTERACTIVE TAB WINDOWS */}
        <AnimatePresence mode="wait">
          {currentTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              {/* Hello Welcome and Current Date Panel */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h2 className="font-display text-2xl font-bold text-white tracking-tight">Halo, {activeProfile.name}</h2>
                  <p className="font-sans text-sm text-[#c4c9ac] mt-1 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-[#c3f400]" />
                    {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
                {/* Visual state badges */}
              </div>

              {/* BENTO STATS CARDS GRID */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-[#121212] rounded-xl p-5 flex flex-col justify-between border border-zinc-800/10 min-h-[110px] secondary-glow">
                  <span className="text-xs uppercase tracking-wider text-[#c4c9ac] font-semibold">Total Sesi Gym</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="font-display text-4xl font-extrabold text-white">{activeProfile.total_sessions || logs.length}</span>
                    <TrendingUp className="w-5 h-5 text-[#a6e6ff]" />
                  </div>
                </div>

                <div className="bg-[#121212] rounded-xl p-5 flex flex-col justify-between border border-[#c3f400]/20 min-h-[110px] ai-glow">
                  <span className="text-xs uppercase tracking-wider text-[#c4c9ac] font-semibold">Weekly Streak</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="font-display text-4xl font-extrabold text-[#c3f400]">{activeProfile.streak ?? 0}</span>
                    <Flame className="w-5 h-5 text-[#c3f400] fill-[#c3f400]/50" />
                  </div>
                </div>

                {/* Animals Equivalence & Day Weight Lifted summary */}
                {(() => {
                  const todayDateStrStr = new Date().toISOString().split('T')[0];
                  const todayLogs = logs.filter(log => log.date === todayDateStrStr);
                  const todayVolume = todayLogs.reduce((acc, log) => acc + calculateTotalVolume(log.exercises), 0);
                  const latestLogStr = logs[0];
                  const latestVolume = latestLogStr ? calculateTotalVolume(latestLogStr.exercises) : 0;
                  const currentVol = todayVolume > 0 ? todayVolume : latestVolume;

                  return (
                    <div className="col-span-2 md:col-span-1 bg-[#121212] rounded-xl p-5 flex flex-col justify-between border border-zinc-800/10 min-h-[110px] secondary-glow">
                      <span className="text-xs uppercase tracking-wider text-[#c4c9ac] font-semibold">
                        {todayVolume > 0 ? "Angkatan Hari Ini" : "Beban Sesi Terakhir"}
                      </span>
                      <div className="mt-2 text-left">
                        <div className="flex items-baseline gap-2">
                          <span className="font-display text-3xl font-extrabold text-[#c3f400]">{currentVol.toLocaleString('id-ID')} kg</span>
                          <Dumbbell className="w-4.5 h-4.5 text-[#c3f400]" />
                        </div>
                        <p className="font-sans text-[10px] text-[#c4c9ac] mt-1 leading-tight flex items-center gap-1">
                          <span>{getAnimalAnalogy(currentVol)}</span>
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* DYNAMIC PLAN / START WORKOUT HERO AREA */}
              {!isActivelyTraining ? (
                <div className="bg-[#201f1f] rounded-2xl p-6 border border-[#444933] shadow-md relative overflow-hidden ai-glow">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#c3f400]/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1">
                      <span className="text-xs font-mono uppercase tracking-widest text-[#c4c9ac] font-bold">Fokus Hari Ini</span>
                      <h3 className="font-display text-2xl font-black text-white">{todayPlan?.focus || "Custom Plan"}</h3>
                    </div>
                    <span className="bg-[#c3f400]/15 text-[#c3f400] border border-[#c3f400]/30 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 fill-[#c3f400]" />
                      Ready
                    </span>
                  </div>

                  <div className="space-y-3 border-t border-zinc-800 pt-4 mb-6">
                    <p className="font-sans text-sm text-[#c4c9ac] flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#a6e6ff]" />
                      Tercapai melalui kustomisasi: <strong>{workoutSessionLocation}</strong>
                    </p>
                    <p className="font-sans text-sm text-[#c4c9ac] flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#a6e6ff]" />
                      Estimasi: <strong>4 gerakan • ~45 menit latihan intensif</strong>
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button 
                      onClick={triggerStartWorkout}
                      className="flex-1 bg-[#c3f400] hover:bg-[#abd600] text-black font-display font-extrabold py-4 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_4px_20px_rgba(195,244,0,0.3)] hover:scale-[1.01] active:scale-95"
                    >
                      <CheckCircle2 className="w-5 h-5 fill-black/10" />
                      Mulai Workout
                    </button>
                    <button 
                      onClick={() => {
                        setLoggerLocation(workoutSessionLocation);
                        setCurrentTab('logger');
                      }}
                      className="font-sans text-sm font-semibold text-[#c4c9ac] hover:text-white border border-zinc-700 bg-zinc-900/60 hover:bg-zinc-800/80 px-5 py-4 rounded-xl transition-all"
                    >
                      Ubah Setelan Plan
                    </button>
                  </div>
                </div>
              ) : (
                // ACTIVE GYM WORKOUT FLOW PANEL
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-[#201f1f] rounded-2xl p-6 border-2 border-[#c3f400] shadow-[0_0_30px_rgba(195,244,0,0.15)] relative"
                >
                  <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
                    <div>
                      <span className="text-[10px] uppercase font-semibold tracking-wide text-[#c3f400]">Sedang Latihan</span>
                      <h3 className="font-display text-2xl font-black text-white">{todayPlan?.focus}</h3>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[10px] text-zinc-500 block">Durasi</span>
                        <span className="font-mono text-lg font-bold text-white">{Math.floor(workoutElapsed/60)}:{String(workoutElapsed%60).padStart(2,'0')}</span>
                      </div>
                      <button 
                        onClick={() => { setIsActivelyTraining(false); setWorkoutStartTime(null); }}
                        className="text-zinc-400 hover:text-white p-1 rounded-full bg-zinc-900 hover:bg-zinc-800 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Tickable Exercises Stack */}
                  <div className="space-y-4 mb-6">
                    {todayPlan?.exercises.map((ex, index) => (
                      <div 
                        key={index} 
                        onClick={() => toggleExerciseCheck(index)}
                        className={`p-4 rounded-xl transition-all border cursor-pointer select-none flex items-center justify-between ${
                          completedExercises[index] 
                            ? "bg-zinc-900/45 border-zinc-800/70 opacity-60" 
                            : "bg-[#131313] border-zinc-800 hover:border-zinc-700"
                        }`}
                      >
                        <div className="flex gap-3 items-center">
                          <MuscleIcon name={ex.name} size={40} />
                          <div>
                            <h4 className={`font-display text-md font-bold text-white ${completedExercises[index] ? "line-through text-zinc-500" : ""}`}>{ex.name}</h4>
                            <p className="font-sans text-xs text-[#c4c9ac] mt-1">
                              <strong>{ex.sets} Sets</strong> x <strong>{ex.reps} Reps</strong> 
                            </p>
                            <p className="font-mono text-[11px] text-[#a6e6ff] mt-0.5">{ex.notes}</p>
                          </div>
                        </div>
                        
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${
                          completedExercises[index] 
                            ? "border-[#c3f400] bg-[#c3f400] text-black" 
                            : "border-zinc-700"
                        }`}>
                          {completedExercises[index] && <Check className="w-4 h-4 stroke-[3]" />}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Rest Timer */}
                  <RestTimer />

                  {/* Actions checklist bar */}
                  <div className="flex gap-3 items-center">
                    <button 
                      onClick={submitActiveWorkout}
                      className="flex-1 bg-[#c3f400] hover:bg-[#abd600] text-black font-display font-extrabold py-4 px-4 rounded-xl flex items-center justify-center gap-2 transition-all"
                    >
                      <Award className="w-5 h-5" />
                      Selesai & Simpan
                    </button>
                    <button 
                      onClick={() => setIsActivelyTraining(false)}
                      className="font-sans text-sm text-[#c4c9ac] hover:text-white border border-zinc-800 hover:bg-zinc-900/60 px-5 py-4 rounded-xl transition-all"
                    >
                      Discard
                    </button>
                  </div>
                </motion.div>
              )}

              {/* CALENDAR VIEW */}
              {renderCalendar()}

              {/* TODAY'S PLAN & NUTRITION */}
              <div className="bg-[#121212] rounded-2xl p-5 border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-display font-bold text-white text-sm">Plan Hari Ini</h4>
                  <button onClick={generateWorkoutPlan} disabled={isGeneratingWorkoutPlan}
                    className="text-[11px] text-[#c3f400] font-bold flex items-center gap-1 disabled:opacity-50">
                    <Sparkles className="w-3.5 h-3.5" /> {isGeneratingWorkoutPlan ? "..." : "Refresh"}
                  </button>
                </div>
                {todayPlan && (
                  <div className="space-y-2">
                    {todayPlan.exercises.slice(0, 4).map((ex, i) => (
                      <div key={i} className="flex justify-between items-center text-xs">
                        <span className="text-zinc-300">{ex.name}</span>
                        <span className="text-zinc-500">{ex.sets}×{ex.reps}</span>
                      </div>
                    ))}
                    {todayPlan.exercises.length > 4 && (
                      <span className="text-[10px] text-zinc-500">+{todayPlan.exercises.length - 4} gerakan lagi</span>
                    )}
                  </div>
                )}
              </div>

              {/* DAILY NUTRITION GUIDE */}
              {latestRecomp && (
                <div className="bg-[#121212] rounded-2xl p-5 border border-zinc-800 space-y-3">
                  <h4 className="font-display font-bold text-white text-sm">Target Nutrisi Harian</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-zinc-900 rounded-xl p-3 text-center">
                      <span className="text-lg font-bold text-white block">{latestRecomp.calories}</span>
                      <span className="text-[10px] text-zinc-500">Kcal</span>
                    </div>
                    <div className="bg-zinc-900 rounded-xl p-3 text-center">
                      <span className="text-lg font-bold text-[#a6e6ff] block">{latestRecomp.protein}g</span>
                      <span className="text-[10px] text-zinc-500">Protein</span>
                    </div>
                    <div className="bg-zinc-900 rounded-xl p-3 text-center">
                      <span className="text-lg font-bold text-[#c3f400] block">{latestRecomp.focus_type === 'Caloric Deficit' ? 'Deficit' : latestRecomp.focus_type === 'Surplus' ? 'Surplus' : 'Maintain'}</span>
                      <span className="text-[10px] text-zinc-500">Strategi</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    {latestRecomp.focus_type === 'Caloric Deficit' 
                      ? `Fokus defisit ~300-500 kcal. Prioritaskan protein ${latestRecomp.protein}g/hari untuk jaga massa otot.`
                      : latestRecomp.focus_type === 'Surplus'
                      ? `Surplus 300-500 kcal di atas TDEE. Pastikan ${latestRecomp.protein}g protein untuk growth.`
                      : `Makan sesuai TDEE. ${latestRecomp.protein}g protein untuk rekomposisi tubuh optimal.`}
                  </p>
                </div>
              )}

              {/* Goals quick view */}
              {activeProfile && <GoalSetting profileId={activeProfile.id} currentWeight={activeProfile.weight} totalSessions={activeProfile.total_sessions} />}

              {/* RECENT GYM LOGS HISTORY */}
              <div className="space-y-4">
                <h3 className="font-display text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#a6e6ff]" />
                  Riwayat Gym Terakhir
                </h3>
                {logs.length === 0 ? (
                  <div className="bg-[#121212] p-6 text-center rounded-xl border border-zinc-800/60">
                    <p className="font-sans text-[#c4c9ac]">Belum ada riwayat tercatat. Mulai sesi pertamamu!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {logs.map((log) => {
                      const logVol = calculateTotalVolume(log.exercises);
                      const isConfirmingDelete = deleteLogId === log.id;

                      return (
                        <div key={log.id} className="bg-[#121212] p-5 rounded-xl border border-zinc-800 flex flex-col gap-4">
                          <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                            <div className="flex items-start gap-3">
                              <div className="p-2.5 rounded-lg bg-zinc-900 text-[#c3f400] mt-1 shrink-0 border border-zinc-800">
                                <Activity className="w-5 h-5" />
                              </div>
                              <div>
                                <span className="font-mono text-[10px] text-[#c4c9ac] font-bold block bg-zinc-900/40 py-0.5 px-2 rounded border border-zinc-800/20 inline-block">
                                  {log.date} {log.location ? `@ ${log.location}` : ""}
                                </span>
                                <h4 className="font-display text-md font-bold text-white mt-1.5">{log.focus}</h4>
                                <p className="font-sans text-xs text-[#c4c9ac] mt-1">
                                  <strong>{log.exercises?.length || 0} gerakan</strong> direkam
                                </p>
                              </div>
                            </div>

                            {/* Actions area with Inline confirmation */}
                            <div className="flex items-center gap-2 self-end sm:self-start">
                              {isConfirmingDelete ? (
                                <div className="bg-red-950/40 border border-red-500/35 p-2 rounded-lg flex items-center gap-2 text-xs">
                                  <span className="text-red-300 font-semibold font-sans">Yakin hapus?</span>
                                  <button
                                    onClick={() => handleDeleteWorkoutLog(log.id)}
                                    className="bg-red-600 hover:bg-red-700 text-white font-bold px-2.5 py-1 rounded transition-colors"
                                  >
                                    Ya
                                  </button>
                                  <button
                                    onClick={() => setDeleteLogId(null)}
                                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2.5 py-1 rounded transition-colors"
                                  >
                                    Batal
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => startEditLog(log)}
                                    title="Ubah Sesi Latihan"
                                    className="p-2 rounded bg-zinc-850 hover:bg-zinc-800 text-[#a6e6ff] hover:text-white transition-colors border border-zinc-800 flex items-center gap-1 text-xs font-semibold"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                    <span>Ubah</span>
                                  </button>
                                  <button
                                    onClick={() => { setShareData({ focus: log.focus, duration: 0, exercises: log.exercises, volume: calculateTotalVolume(log.exercises) }); setShowShare(true); }}
                                    title="Share"
                                    className="p-2 rounded bg-zinc-850 hover:bg-zinc-800 text-[#c3f400] hover:text-[#c3f400] transition-colors border border-zinc-800 flex items-center gap-1 text-xs font-semibold"
                                  >
                                    <Share2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setDeleteLogId(log.id)}
                                    title="Hapus Sesi Latihan"
                                    className="p-2 rounded bg-zinc-850 hover:bg-red-950/80 text-red-400 hover:text-red-300 transition-colors border border-zinc-800 flex items-center gap-1 text-xs font-semibold"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Hapus</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Exercise List & Equivalent detail */}
                          <div className="border-t border-zinc-850 pt-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div className="flex flex-wrap gap-2">
                              {log.exercises?.map((ex, idx) => (
                                <div key={idx} className="bg-zinc-900 border border-zinc-800/60 rounded px-2.5 py-1 text-[11px] font-sans flex flex-col gap-0.5">
                                  <span className="font-semibold text-white">{ex.name}</span>
                                  <span className="text-zinc-400 text-[10px]">
                                    {ex.is_cardio 
                                      ? `⏱️ ${ex.duration_minutes || 30}m Kardio` 
                                      : `${ex.sets}s x ${ex.reps} ${ex.weight_kg ? `@ ${ex.weight_kg}kg` : ""}`}
                                  </span>
                                </div>
                              ))}
                            </div>

                            {/* Total volume diangkat */}
                            {logVol > 0 && (
                              <div className="bg-[#c3f400]/5 border border-[#c3f400]/25 rounded-lg p-2 max-w-full md:max-w-xs text-right shrink-0">
                                <p className="font-mono text-[10px] text-[#c3f400] font-black uppercase tracking-wider">
                                  🏋️‍♂️ Total Angkatan Sesi: {logVol} kg
                                </p>
                                <p className="font-sans text-[10px] text-[#c4c9ac] mt-0.5 leading-tight">
                                  {getAnimalAnalogy(logVol)}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {currentTab === 'logger' && (
            <motion.div 
              key="logger"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <h2 className="font-display text-2xl font-extrabold text-white tracking-tight">Catat Sesi</h2>
              </div>

              {/* Form parameters */}
              <div className="bg-[#201f1f] rounded-2xl p-6 border border-[#444933] space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Date Input */}
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-[#c4c9ac] font-bold mb-1">Tanggal</label>
                    <input 
                      type="date"
                      value={loggerDate}
                      onChange={(e) => setLoggerDate(e.target.value)}
                      className="w-full bg-[#131313] border border-zinc-700 rounded-lg h-11 px-3 text-white focus:outline-none focus:border-[#c3f400] transition-colors"
                    />
                  </div>

                  {/* Location Input */}
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-[#c4c9ac] font-bold mb-1">Lokasi Gym</label>
                    <input 
                      type="text"
                      placeholder="e.g. Muscle Prime Gym"
                      value={loggerLocation}
                      onChange={(e) => setLoggerLocation(e.target.value)}
                      className="w-full bg-[#131313] border border-zinc-700 rounded-lg h-11 px-3 text-white focus:outline-none focus:border-[#c3f400] transition-colors"
                    />
                  </div>
                </div>

                {/* Equipment Chips selectable */}
                <div className="space-y-2">
                  <label className="block text-xs uppercase tracking-widest text-[#c4c9ac] font-bold">Peralatan Tersedia</label>
                  <div className="flex flex-wrap gap-2">
                    {["Barbell", "Dumbbells", "Cable", "Machines", "Bodyweight"].map((item) => {
                      const selected = loggerEquipment.includes(item);
                      return (
                        <button
                          key={item}
                          onClick={() => toggleLoggerEquipment(item)}
                          className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all min-h-[40px] flex items-center border ${
                            selected 
                              ? "bg-[#a6e6ff] text-[#003543] border-transparent" 
                              : "bg-zinc-800 text-[#c4c9ac] border-zinc-700 "
                          }`}
                        >
                          {item}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Target Training Focus Selector */}
                <div className="space-y-2">
                  <label className="block text-xs uppercase tracking-widest text-[#c4c9ac] font-bold">Target Fokus Sesi Latihan</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      "Otomatis (Rekomendasi AI)",
                      "Push Day", 
                      "Pull Day", 
                      "Legs Day", 
                      "Upper Body", 
                      "Lower Body", 
                      "Full Body", 
                      "Core"
                    ].map((foc) => {
                      const selected = loggerPlanFocus === foc;
                      return (
                        <button
                          key={foc}
                          type="button"
                          onClick={() => setLoggerPlanFocus(foc)}
                          className={`px-3 py-2 rounded-xl text-xs font-semibold tracking-tight transition-all min-h-[40px] flex items-center justify-center text-center border ${
                            selected 
                              ? "bg-[#c3f400] text-black border-transparent font-extrabold shadow-[0_2px_10px_rgba(195,244,0,0.15)]" 
                              : "bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-705"
                          }`}
                        >
                          {foc}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* AI Plan Trigger */}
                <div className="pt-2">
                  <button 
                    onClick={generateWorkoutPlan}
                    disabled={isGeneratingWorkoutPlan}
                    className="w-full bg-zinc-900 border border-zinc-800 hover:border-[#444933] text-[#c3f400] hover:text-[#c3f400]/80 font-display font-black py-3.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all text-sm scale-down active:scale-95 disabled:opacity-50"
                  >
                    <Sparkles className="w-4.5 h-4.5" />
                    {isGeneratingWorkoutPlan ? "Generating..." : "Generate Plan Baru"}
                  </button>
                </div>
              </div>

              {/* LIST EXERCISES ADDITION */}
              <div className="bg-[#121212] rounded-xl p-5 border border-zinc-800 space-y-4">
                <h3 className="font-display text-md font-bold text-white flex items-center justify-between">
                  <span>Daftar Gerakan ({loggerExercises.length})</span>
                  <span className="text-zinc-500 font-sans text-xs">Akan direkam ke logger</span>
                </h3>

                {/* Draft Exercises List */}
                <div className="space-y-3">
                  {loggerExercises.map((item, idx) => {
                    const isInlineEditing = editingLoggerExIndex === idx;

                    if (isInlineEditing) {
                      return (
                        <div key={idx} className="bg-[#181818] border border-[#c3f400]/40 p-4 rounded-lg space-y-3 text-left">
                          <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                            <span className="text-xs font-mono text-[#c3f400] font-black">UBAH GERAKAN #{idx + 1}</span>
                            <span className="text-[10px] text-zinc-500">Manual Logger Draft</span>
                          </div>

                          {/* Exercise Types radio */}
                          <div className="flex gap-4 text-xs font-bold">
                            <label className="flex items-center gap-1.5 cursor-pointer text-white select-none">
                              <input 
                                type="radio" 
                                checked={!inlineExIsCardio} 
                                onChange={() => setInlineExIsCardio(false)} 
                                className="text-[#c3f400] focus:ring-0"
                              />
                              Latihan Beban
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer text-white select-none">
                              <input 
                                type="radio" 
                                checked={inlineExIsCardio} 
                                onChange={() => setInlineExIsCardio(true)} 
                                className="text-[#c3f400] focus:ring-0"
                              />
                              Kardio
                            </label>
                          </div>

                          {/* Inputs */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div className="sm:col-span-1">
                              <label className="block text-[10px] text-zinc-400 font-bold mb-1 uppercase">Nama Gerakan</label>
                              <input 
                                type="text"
                                value={inlineExName}
                                onChange={(e) => setInlineExName(e.target.value)}
                                className="w-full bg-[#111] border border-zinc-700 rounded h-8 px-2 text-xs text-white"
                              />
                            </div>

                            {inlineExIsCardio ? (
                              <div>
                                <label className="block text-[10px] text-zinc-400 font-bold mb-1 uppercase">Durasi (Menit)</label>
                                <input 
                                  type="number"
                                  value={inlineExDuration}
                                  onChange={(e) => setInlineExDuration(e.target.value)}
                                  className="w-full bg-[#111] border border-zinc-700 rounded h-8 px-2 text-xs text-white"
                                />
                              </div>
                            ) : (
                              <div className="grid grid-cols-3 gap-1 col-span-1">
                                <div>
                                  <label className="block text-[10px] text-zinc-400 font-bold mb-1 uppercase text-center">Sets</label>
                                  <input 
                                    type="number"
                                    value={inlineExSets}
                                    onChange={(e) => setInlineExSets(e.target.value)}
                                    className="w-full bg-[#111] border border-zinc-700 rounded h-8 text-center text-xs text-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] text-zinc-400 font-bold mb-1 uppercase text-center">Reps</label>
                                  <input 
                                    type="text"
                                    value={inlineExReps}
                                    onChange={(e) => setInlineExReps(e.target.value)}
                                    className="w-full bg-[#111] border border-zinc-700 rounded h-8 text-center text-xs text-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] text-zinc-400 font-bold mb-1 uppercase text-center">Beban kg</label>
                                  <input 
                                    type="number"
                                    value={inlineExWeight}
                                    onChange={(e) => setInlineExWeight(e.target.value)}
                                    className="w-full bg-[#111] border border-zinc-700 rounded h-8 text-center text-xs text-[#c3f400]"
                                  />
                                </div>
                              </div>
                            )}

                            <div className="sm:col-span-1">
                              <label className="block text-[10px] text-zinc-400 font-bold mb-1 uppercase">Catatan / Note</label>
                              <input 
                                type="text"
                                value={inlineExNotes}
                                onChange={(e) => setInlineExNotes(e.target.value)}
                                className="w-full bg-[#111] border border-zinc-700 rounded h-8 px-2 text-xs text-white"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              onClick={() => setEditingLoggerExIndex(null)}
                              className="bg-zinc-805 hover:bg-zinc-750 text-zinc-300 text-[10px] font-bold px-3 py-1.5 rounded transition-all"
                            >
                              Batal
                            </button>
                            <button
                              onClick={() => saveInlineEditLoggerEx(idx)}
                              className="bg-[#c3f400] hover:bg-[#abd600] text-black text-[10px] font-extrabold px-4 py-1.5 rounded transition-all"
                            >
                              Simpan
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={idx} className="bg-zinc-900 border border-zinc-800/80 p-4 rounded-lg flex justify-between items-start gap-2 text-left">
                        <div className="flex items-start gap-2">
                          <MuscleIcon name={item.name} size={36} />
                          <div>
                            <h4 className="font-display font-bold text-white text-md">{item.name}</h4>
                            <p className="font-sans text-xs text-[#c4c9ac] mt-1 flex flex-wrap items-center gap-2">
                              {item.is_cardio ? (
                                <span className="bg-blue-900/40 text-blue-300 border border-blue-800/60 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                  Kardio {item.duration_minutes || 30} Menit
                                </span>
                              ) : (
                                <span>
                                  <strong>{item.sets} Sets</strong> x <strong>{item.reps} Reps</strong>
                                  {item.weight_kg && <strong> @ {item.weight_kg} kg</strong>}
                                </span>
                              )}
                            </p>
                            {item.notes && <p className="font-mono text-[10px] text-[#a6e6ff] mt-0.5 italic">Note: {item.notes}</p>}
                          </div>
                        </div>
                        
                        {/* Control buttons for reordering & editing & deletion */}
                        <div className="flex items-center gap-1 shrink-0">
                          {/* Move Up */}
                          <button
                            onClick={() => moveLoggerExercise(idx, 'up')}
                            disabled={idx === 0}
                            title="Pindah Ke Atas"
                            className="bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-[#c3f400] disabled:opacity-30 disabled:hover:text-zinc-400 p-1.5 rounded transition-colors border border-zinc-800/80"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>

                          {/* Move Down */}
                          <button
                            onClick={() => moveLoggerExercise(idx, 'down')}
                            disabled={idx === loggerExercises.length - 1}
                            title="Pindah Ke Bawah"
                            className="bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-[#c3f400] disabled:opacity-30 disabled:hover:text-zinc-400 p-1.5 rounded transition-colors border border-zinc-800/80"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>

                          {/* Inline Edit Trigger */}
                          <button
                            onClick={() => startInlineEditLoggerEx(idx, item)}
                            title="Sunting Latihan"
                            className="bg-zinc-850 hover:bg-zinc-800 text-zinc-450 hover:text-white p-1.5 rounded transition-colors border border-zinc-800/80"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button 
                            onClick={() => setLoggerExercises(prev => prev.filter((_, i) => i !== idx))}
                            title="Hapus"
                            className="bg-zinc-850 hover:bg-red-950 text-zinc-450 hover:text-red-450 p-1.5 rounded transition-colors border border-zinc-800/80"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Manual Adder Inline Frame */}
                <div className="border-t border-zinc-800 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#c4c9ac] uppercase">Tambah Gerakan</span>
                    <button onClick={() => setShowExSearch(true)} className="text-[11px] text-[#c3f400] font-bold flex items-center gap-1">
                      <Plus className="w-3.5 h-3.5" /> Cari Exercise
                    </button>
                  </div>
                  
                  {/* Cardio or Strength toggle */}
                  <div className="flex items-center gap-4 text-xs font-bold">
                    <label className="flex items-center gap-2 cursor-pointer text-white select-none">
                      <input 
                        type="radio"
                        checked={!customExerciseIsCardio}
                        onChange={() => setCustomExerciseIsCardio(false)}
                        className="text-[#c3f400] focus:ring-0"
                      />
                      Latihan Beban (Strength)
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-white select-none">
                      <input 
                        type="radio"
                        checked={customExerciseIsCardio}
                        onChange={() => setCustomExerciseIsCardio(true)}
                        className="text-[#c3f400] focus:ring-0"
                      />
                      Kardio (e.g. Treadmill)
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="relative w-full sm:col-span-1">
                      <input 
                        type="text"
                        placeholder="Cari atau ketik gerakan..."
                        value={customExerciseName}
                        onChange={(e) => setCustomExerciseName(e.target.value)}
                        className="w-full bg-[#201f1f] border border-zinc-700/80 rounded h-10 px-2.5 text-xs text-white"
                      />
                      {customExerciseName.trim().length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-zinc-800 rounded-xl max-h-48 overflow-y-auto z-20 shadow-lg">
                          {searchExercises(customExerciseName).slice(0, 6).map(ex => (
                            <button key={ex.name} type="button" onClick={() => { setCustomExerciseName(ex.name); setCustomExerciseIsCardio(ex.category === 'cardio'); }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-zinc-800 transition-colors text-left">
                              <MuscleIcon name={ex.name} size={32} />
                              <div>
                                <span className="text-xs font-medium text-white block">{ex.name}</span>
                                <span className="text-[10px] text-zinc-500">{ex.muscle}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {customExerciseIsCardio ? (
                      <input 
                        type="number"
                        placeholder="Durasi (e.g. 30 Menit)"
                        value={customExerciseDuration}
                        onChange={(e) => setCustomExerciseDuration(e.target.value)}
                        className="w-full bg-[#201f1f] border border-zinc-700/80 rounded h-10 px-2.5 text-xs text-white"
                      />
                    ) : (
                      <div className="grid grid-cols-3 gap-1.5 sm:col-span-1">
                        <input 
                          type="number"
                          placeholder="Sets"
                          value={customExerciseSets}
                          onChange={(e) => setCustomExerciseSets(e.target.value)}
                          className="w-full bg-[#201f1f] border border-zinc-700/80 rounded h-10 px-2.5 text-xs text-white"
                        />
                        <input 
                          type="text"
                          placeholder="Reps"
                          value={customExerciseReps}
                          onChange={(e) => setCustomExerciseReps(e.target.value)}
                          className="w-full bg-[#201f1f] border border-zinc-700/80 rounded h-10 px-2.5 text-xs text-white"
                        />
                        <input 
                          type="number"
                          placeholder="Beban kg"
                          value={customExerciseWeight}
                          onChange={(e) => setCustomExerciseWeight(e.target.value)}
                          className="w-full bg-[#201f1f] border border-zinc-700/80 rounded h-10 px-2.5 text-xs text-[#c3f400]"
                        />
                      </div>
                    )}

                    <input 
                      type="text"
                      placeholder="Catatan / Notes (e.g. Fokus napas)"
                      value={customExerciseNotes}
                      onChange={(e) => setCustomExerciseNotes(e.target.value)}
                      className="w-full sm:col-span-1 bg-[#201f1f] border border-zinc-700/80 rounded h-10 px-2.5 text-xs text-white"
                    />
                  </div>
                  
                  <button 
                    onClick={handleAddCustomExercise}
                    className="font-sans text-xs font-black bg-zinc-800 hover:bg-zinc-700 hover:text-white text-[#c3f400] h-10 px-4 rounded w-full flex items-center justify-center gap-1 border border-zinc-700"
                  >
                    <Plus className="w-4.5 h-4.5" /> Tambah Gerakan Ke Draft List
                  </button>
                </div>
              </div>

              {/* Workout Templates */}
              {activeProfile && (
                <WorkoutTemplates
                  profileId={activeProfile.id}
                  onApply={applyTemplate}
                  currentFocus={todayPlan?.focus}
                  currentExercises={loggerExercises}
                />
              )}

              {/* SAVE FINISHED DATA TRIGGER */}
              {formError && currentTab === 'logger' && <p className="field-error-msg text-center">{formError}</p>}
              <button 
                onClick={handleSaveWorkoutLog}
                disabled={loggerExercises.length === 0}
                className="w-full bg-[#c3f400] text-black font-display font-black py-4 px-4 rounded-xl flex items-center justify-center gap-2 transition-all text-md shadow-[0_4px_15px_rgba(195,244,0,0.2)]"
              >
                <CheckCircle2 className="w-5 h-5 fill-black/10" />
                Simpan Workout
              </button>
            </motion.div>
          )}

          {currentTab === 'progress' && (
            <motion.div 
              key="progress"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <h2 className="font-display text-2xl font-extrabold text-white tracking-tight">Progress & Recomp</h2>
              </div>

              {/* ACTIVE AI RECOMPOSITION MATRIX INSIGHT CARD */}
              <div className="bg-[#201f1f] rounded-2xl p-6 border border-[#c3f400] shadow-md relative overflow-hidden ai-glow">
                <div className="absolute -right-8 -top-8 w-28 h-28 bg-[#c3f400]/10 rounded-full blur-2xl"></div>

                <div className="flex items-start gap-4 mb-5">
                  <div className="w-12 h-12 rounded-full bg-[#c3f400]/25 text-[#c3f400] border border-[#c3f400]/30 flex items-center justify-center shrink-0">
                    <Sparkles className="w-6 h-6 fill-[#c3f400]" />
                  </div>
                  <div>
                    <span className="font-sans text-[10px] uppercase font-semibold tracking-wide text-zinc-500">Analisa Tubuh</span>
                    <h3 className="font-display text-lg font-bold text-white mt-0.5">Rekomposisi Tubuh</h3>
                    
                    <p className="font-sans text-sm text-[#c4c9ac] leading-relaxed mt-2">
                      {latestRecomp ? latestRecomp.analysis : "Input tinggi dan berat badan untuk mendapatkan analisa komposisi tubuh, target kalori harian, dan kebutuhan proteinmu."}
                    </p>
                  </div>
                </div>

                {latestRecomp && (
                  <div className="grid grid-cols-3 gap-2 border-t border-zinc-800/80 pt-4 mt-2">
                    <div className="bg-[#131313] p-3 rounded-xl border border-zinc-800 text-center overflow-hidden">
                      <span className="text-[10px] text-[#c4c9ac] font-bold uppercase block tracking-wider">Strategi</span>
                      <span className="text-[11px] font-bold font-display text-[#c3f400] block mt-1 truncate">{latestRecomp.focus_type}</span>
                    </div>
                    <div className="bg-[#131313] p-3 rounded-xl border border-zinc-800 text-center">
                      <span className="text-[10px] text-[#c4c9ac] font-bold uppercase block tracking-wider">Target Kalori</span>
                      <span className="text-sm font-extrabold font-display text-white block mt-1">{latestRecomp.calories} Kcal</span>
                    </div>
                    <div className="bg-[#131313] p-3 rounded-xl border border-zinc-800 text-center">
                      <span className="text-[10px] text-[#c4c9ac] font-bold uppercase block tracking-wider">Target Protein</span>
                      <span className="text-sm font-extrabold font-display text-[#a6e6ff] block mt-1">{latestRecomp.protein} gram</span>
                    </div>
                  </div>
                )}
              </div>

              {/* BODY METRICS INPUT BLOCK */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Metrics Logger Form */}
                <div className="bg-[#121212] p-5 rounded-xl border border-zinc-800">
                  <h3 className="font-display text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Scale className="w-5 h-5 text-[#c3f400]" />
                    Catat Metrik Tinggi/Berat
                  </h3>

                  <form onSubmit={handleLogMetrics} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-[#c4c9ac] mb-1">Tinggi Badan (cm)</label>
                        <input 
                          type="number"
                          placeholder="e.g. 182"
                          value={tbInput}
                          onChange={(e) => setTbInput(e.target.value)}
                          className="w-full bg-[#201f1f] border-none text-white font-display text-md rounded-lg h-11 px-3 focus:ring-1 focus:ring-[#c3f400] transition-shadow"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-[#c4c9ac] mb-1">Berat Badan (kg)</label>
                        <input 
                          type="number" 
                          step="0.1"
                          placeholder="e.g. 84.5"
                          value={bbInput}
                          onChange={(e) => setBbInput(e.target.value)}
                          className="w-full bg-[#201f1f] border-none text-white font-display text-md rounded-lg h-11 px-3 focus:ring-1 focus:ring-[#c3f400] transition-shadow"
                        />
                      </div>
                    </div>

                    <button 
                      type="submit"
                      disabled={isSubmittingRecomp}
                      className="w-full bg-[#c3f400] text-black font-display font-black uppercase text-xs tracking-wider rounded-lg h-11 flex items-center justify-center gap-1.5 hover:opacity-90 transition-all disabled:opacity-50"
                    >
                      <Sparkles className="w-4 h-4 fill-black" />
                      {isSubmittingRecomp ? "Menganalisis..." : "Analisa Komposisi"}
                    </button>
                  </form>
                </div>

                {/* BMI Gauge summary panel */}
                <div className="bg-[#121212] p-5 rounded-xl border border-zinc-800 flex flex-col justify-between min-h-[170px]" id="bmi-display-panel">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-lg font-bold text-white">Current BMI</h3>
                    <div className="p-2 bg-zinc-900 rounded-full text-zinc-400">
                      <Flame className="w-4.5 h-4.5" />
                    </div>
                  </div>

                  <div className="flex items-baseline gap-2 mt-4">
                    <span className="font-display text-5xl font-black text-white">{computedBmiVal}</span>
                    <span className="font-sans text-xs text-[#c4c9ac] block">kg/m²</span>
                  </div>

                  <p className="font-sans text-xs text-[#c3f400] uppercase font-bold tracking-widest border border-[#c3f400]/25 bg-[#c3f400]/5 px-2.5 py-1.5 rounded-lg inline-block w-fit mt-3">
                    {getBmiStatus(computedBmiVal)}
                  </p>

                  {/* Horizontal BMI status scale bar placeholder */}
                  <div className="w-full h-1 bg-zinc-800 rounded-full mt-4 overflow-hidden flex">
                    <div className="h-full bg-blue-600/50 w-[18.5%]"></div>
                    <div className="h-full bg-emerald-500 w-[25.5%]"></div>
                    <div className="h-full bg-orange-400 w-[15.5%] relative">
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white border border-black rounded-full"></div>
                    </div>
                    <div className="h-full bg-red-600 w-[40.5%]"></div>
                  </div>
                </div>
              </div>

              {/* ELEVATED WEIGHT HISTORY TRAJECTORY (CSS BAR CHART) */}
              <div className="bg-[#121212] rounded-xl p-5 border border-zinc-800">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[#a6e6ff]" />
                    Weight Trajectory
                  </h3>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 font-mono">Last 3 Readings</span>
                </div>

                {/* Grid Visual Histogram */}
                <div className="h-44 flex items-end justify-between w-full pt-6 pb-2 border-b border-zinc-800 relative">
                  {/* Grid Lines */}
                  <div className="absolute w-full h-[1px] bg-zinc-800/80 top-1/2 -translate-y-1/2 border-dashed"></div>
                  
                  {/* Standard Static readings representing target timeline progress bars */}
                  <div className="w-full mx-2 bg-zinc-800 rounded-t-md h-[78%] relative group transition-colors hover:bg-zinc-700">
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 font-display text-[10px] text-zinc-400 font-bold">85kg</div>
                    <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 font-sans text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Wk 1</span>
                  </div>

                  <div className="w-full mx-2 bg-zinc-800 rounded-t-md h-[81%] relative group transition-colors hover:bg-zinc-700">
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 font-display text-[10px] text-zinc-400 font-bold">85.4kg</div>
                    <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 font-sans text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Wk 2</span>
                  </div>

                  {/* Active Weight Reading Glow */}
                  <div className="w-full mx-2 bg-[#c3f400]/20 rounded-t-md h-[84%] border-t-2 border-[#c3f400] relative group">
                    <div className="absolute w-full h-4 top-0 bg-[#c3f400]/20 blur-sm"></div>
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 font-display text-[11px] text-[#c3f400] font-extrabold">{activeProfile?.weight || "72.0"}kg</div>
                    <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 font-sans text-[10px] text-[#c3f400] font-extrabold uppercase tracking-wider block">Real</span>
                  </div>
                </div>

                {/* Margin spacer */}
                <div className="h-6"></div>
              </div>

              {/* Weight History Chart */}
              {activeProfile && <WeightChart profileId={activeProfile.id} />}

              {/* Progressive Overload Tracking */}
              <ProgressiveOverload logs={logs} />

              {/* Goal Setting */}
              {activeProfile && <GoalSetting profileId={activeProfile.id} currentWeight={activeProfile.weight} totalSessions={activeProfile.total_sessions} />}

              {/* CSV Export */}
              <button onClick={handleExportCSV}
                className="w-full bg-zinc-900 dark-card border border-zinc-800 dark-border text-zinc-300 dark-text font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-sm hover:bg-zinc-800 transition-colors">
                <Download className="w-4 h-4 text-[#a6e6ff]" /> Export Data ke CSV
              </button>
            </motion.div>
          )}

          {currentTab === 'chat' && (
            <motion.div 
              key="chat"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex flex-col min-h-[450px] relative"
            >
              <div className="bg-[#121212] rounded-t-2xl border border-zinc-800 border-b-0 p-4 shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-full bg-[#c3f400] animate-pulse"></div>
                  <span className="font-display font-bold text-sm text-white tracking-tight">Chat Trainer</span>
                </div>
                <span className="font-sans text-[10px] font-medium text-zinc-500">Online</span>
              </div>

              {/* Chat Thread Panel */}
              <div className="flex-1 bg-[#201f1f]/50 border border-zinc-850 overflow-y-auto p-4 space-y-4 no-scrollbar flex flex-col">
                <div className="text-center text-[10px] text-zinc-600 my-2">Hari ini</div>

                {/* Default Greeting Message block */}
                <div className="flex justify-start w-full gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-[#c2f400] flex-shrink-0 flex items-center justify-center text-black">
                    <Zap className="w-4 h-4 fill-black" />
                  </div>
                  <div className="max-w-[85%] bg-zinc-900 border border-zinc-800 text-[#e5e2e1] font-sans text-sm rounded-2xl rounded-tl-sm p-4 leading-relaxed relative ai-glow">
                    Halo, <strong>{activeProfile.name}!</strong> 💪 
                    Ada yang bisa dibantu soal program latihan, nutrisi, atau form exercise hari ini?
                  </div>
                </div>

                {/* Chat items maps */}
                {chatHistory.map((msg) => (
                  <div 
                    key={msg.id || Math.random().toString()} 
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} w-full gap-2.5`}
                  >
                    {msg.sender === 'assistant' && (
                      <div className="w-7 h-7 rounded-full bg-[#a6e6ff] flex-shrink-0 flex items-center justify-center text-zinc-900">
                        <Zap className="w-4 h-4 fill-zinc-900" />
                      </div>
                    )}
                    <div 
                      className={`max-w-[85%] text-sm rounded-2xl p-4 leading-relaxed relative ${
                        msg.sender === 'user' 
                          ? "bg-zinc-800 text-white border border-zinc-700 rounded-tr-sm self-end"
                          : "bg-zinc-900 border border-zinc-800 text-[#e5e2e1] rounded-tl-sm ai-glow"
                      }`}
                    >
                      {msg.sender === 'assistant' && (
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-[#c3f400]/20 rounded-t-2xl"></div>
                      )}
                      
                      {/* Message formatted string simply */}
                      {renderFormattedMessage(msg.message)}
                    </div>
                  </div>
                ))}
                
                {isSendingChat && (
                  <div className="flex justify-start w-full gap-2.5 items-center">
                    <div className="w-7 h-7 rounded-full bg-[#a6e6ff] flex-shrink-0 flex items-center justify-center text-zinc-900 animate-spin">
                      <RefreshCw className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-sans text-zinc-500 italic">Mengetik...</span>
                  </div>
                )}

                <div ref={chatBottomRef} />
              </div>

              {/* CHAT INPUT AND KEYWORDS SUGGESTIONS CHIPS FOOTER */}
              <div className="bg-[#121212] border border-zinc-800 p-4 rounded-b-2xl space-y-4 shrink-0">
                
                {/* Suggestions triggers chips */}
                {chatHistory.length === 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold block">Topik Populer:</span>
                    <div className="flex flex-wrap gap-2">
                      {chatPrompts.map((prompt) => (
                        <button
                          key={prompt}
                          onClick={() => handleSendChat(prompt)}
                          className="px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 hover:bg-[#201f1f] text-xs font-medium text-zinc-300 hover:text-[#c3f400] transition-colors"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input action field */}
                <div className="flex items-center gap-2 bg-[#131313] rounded-xl border border-zinc-800 p-1.5 focus-within:border-[#c3f400] transition-all">
                  <input 
                    type="text"
                    placeholder="Tanya Trainer AI..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSendChat();
                    }}
                    className="w-full bg-transparent border-none text-white font-sans text-sm outline-none px-3 h-10 placeholder-zinc-500 focus:outline-none focus:ring-0"
                  />
                  <button 
                    onClick={() => handleSendChat()}
                    disabled={isSendingChat || !chatInput.trim()}
                    className="bg-[#c3f400] hover:bg-[#abd600] text-black h-10 w-10 shrink-0 rounded-lg flex items-center justify-center scale-down active:scale-95 transition-transform disabled:opacity-50 shadow-[0_0_12px_rgba(195,244,0,0.2)]"
                  >
                    <ArrowRight className="w-5 h-5 font-black" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {currentTab === 'scanner' && (
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                {/* Visual Image Input Area with Drag & Drop and manual select */}
                <div 
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) {
                      readAndPreviewFile(file);
                    }
                  }}
                  className={`bg-[#201f1f] rounded-2xl border-2 border-dashed p-6 flex flex-col items-center justify-center min-h-[340px] text-center transition-all relative ${
                    isDragOver ? "border-[#c3f400] bg-[#c3f400]/5" : "border-zinc-805 hover:border-zinc-700"
                  }`}
                >
                  {scannerImage ? (
                    <div className="w-full h-full flex flex-col justify-between items-center space-y-4">
                      <div className="relative max-h-[220px] rounded-lg overflow-hidden border border-zinc-850">
                        <img 
                          src={scannerImage} 
                          alt="Pratinjau alat gym" 
                          referrerPolicy="no-referrer"
                          className="max-h-[200px] max-w-full object-contain rounded-lg"
                        />
                        <button 
                          onClick={resetScanner}
                          className="absolute top-2 right-2 p-1.5 bg-black/80 hover:bg-black text-white hover:text-[#c3f400] rounded-full transition-colors"
                          title="Hapus foto"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex w-full gap-3">
                        <button
                          onClick={resetScanner}
                          className="flex-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors min-h-[44px]"
                        >
                          Ganti Foto
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
                        <span className="font-mono text-[9px] font-bold text-[#c3f400] bg-[#c3f400]/10 border border-[#c3f400]/25 rounded px-1.5 py-0.5 uppercase tracking-wider">Identifikasi Sukses</span>
                        <h3 className="font-display text-2xl font-black text-white mt-1.5 border-b border-zinc-800 pb-2 flex items-center gap-2">
                          <CheckCircle2 className="w-6 h-6 text-[#c3f400]" />
                          {scannerResult.name}
                        </h3>
                      </div>

                      <div className="space-y-3 text-sm">
                        <div className="space-y-1">
                          <h4 className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold block">Deskripsi Alat</h4>
                          <p className="text-zinc-300 leading-relaxed font-sans text-xs">{scannerResult.description}</p>
                        </div>

                        <div className="space-y-1">
                          <h4 className="text-[10px] uppercase tracking-wider text-[#a6e6ff] font-bold block">Otot Target Utama</h4>
                          <p className="text-zinc-300 leading-relaxed font-sans text-xs font-semibold italic">{scannerResult.target_muscles}</p>
                        </div>

                        <div className="space-y-1.5">
                          <h4 className="text-[10px] uppercase tracking-wider text-[#c3f400] font-bold block">Cara Penggunaan Yang Benar</h4>
                          <div className="bg-zinc-900 border border-zinc-850 rounded-xl p-3.5 space-y-1.5 text-[11px] text-zinc-400 leading-relaxed max-h-[140px] overflow-y-auto font-sans">
                            {scannerResult.proper_form.split('\n').map((para, i) => (
                              <p key={i}>{para}</p>
                            ))}
                          </div>
                        </div>

                        {/* Save to gym equipment */}
                        <button
                          onClick={() => saveEquipmentToGym(scannerResult.name)}
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
                  <span className="text-[10px] text-zinc-500">{gymEquipmentList.length} alat</span>
                </div>
                {gymEquipmentList.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {gymEquipmentList.map(eq => (
                      <span key={eq} className="inline-flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-[11px] text-zinc-300">
                        {eq}
                        <button onClick={() => removeGymEquipment(eq)} className="text-zinc-600 hover:text-red-400 ml-0.5">×</button>
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
                        if (input.value.trim()) { saveEquipmentToGym(input.value.trim()); input.value = ''; }
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      const input = document.getElementById('manual-equip-input') as HTMLInputElement;
                      if (input?.value.trim()) { saveEquipmentToGym(input.value.trim()); input.value = ''; }
                    }}
                    className="bg-[#c3f400] text-black font-bold px-4 rounded-xl text-xs"
                  >+</button>
                </div>
                <p className="text-[10px] text-zinc-600">List ini digunakan saat generate plan latihan</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* FIXED BOTTOM NAVIGATION BAR SYSTEM */}
      <nav className="fixed bottom-0 left-0 w-full ios-glass bg-[#121212]/80 dark-nav border-t border-[#2c2c2c] dark-border pt-2 pb-[max(env(safe-area-inset-bottom),12px)] px-3 flex justify-around items-center z-40" style={{ maxWidth: '430px', margin: '0 auto', right: 0 }}>
        {/* Tab 1: Dashboard */}
        <button 
          onClick={() => setCurrentTab('dashboard')}
          className={`flex flex-col items-center justify-center py-1.5 px-1 sm:px-3 rounded-xl transition-all scale-down active:scale-90 flex-1 sm:flex-none ${
            currentTab === 'dashboard' 
              ? "bg-[#c3f400] text-black shadow-[0_2px_10px_rgba(195,244,0,0.25)] font-bold" 
              : "text-zinc-500 hover:text-white"
          }`}
        >
          <Activity className="w-5 sm:w-5.5 h-5 sm:h-5.5" />
          <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider mt-1 block">Home</span>
        </button>

        {/* Tab 2: Logger */}
        <button 
          onClick={() => setCurrentTab('logger')}
          className={`flex flex-col items-center justify-center py-1.5 px-1 sm:px-3 rounded-xl transition-all scale-down active:scale-90 flex-1 sm:flex-none ${
            currentTab === 'logger' 
              ? "bg-[#c3f400] text-black shadow-[0_2px_10px_rgba(195,244,0,0.25)] font-bold" 
              : "text-zinc-500 hover:text-white"
          }`}
        >
          <Dumbbell className="w-5 sm:w-5.5 h-5 sm:h-5.5" />
          <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider mt-1 block">Logger</span>
        </button>

        {/* Tab 3: Progress */}
        <button 
          onClick={() => setCurrentTab('progress')}
          className={`flex flex-col items-center justify-center py-1.5 px-1 sm:px-3 rounded-xl transition-all scale-down active:scale-90 flex-1 sm:flex-none ${
            currentTab === 'progress' 
              ? "bg-[#c3f400] text-black shadow-[0_2px_10px_rgba(195,244,0,0.25)] font-bold" 
              : "text-zinc-500 hover:text-white"
          }`}
        >
          <Scale className="w-5 sm:w-5.5 h-5 sm:h-5.5" />
          <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider mt-1 block">Recomp</span>
        </button>

        {/* Tab 4: AI Chat */}
        <button 
          onClick={() => setCurrentTab('chat')}
          className={`flex flex-col items-center justify-center py-1.5 px-1 sm:px-3 rounded-xl transition-all scale-down active:scale-90 flex-1 sm:flex-none ${
            currentTab === 'chat' 
              ? "bg-[#c3f400] text-black shadow-[0_2px_10px_rgba(195,244,0,0.25)] font-bold" 
              : "text-zinc-500 hover:text-white"
          }`}
        >
          <MessageSquare className="w-5 sm:w-5.5 h-5 sm:h-5.5" />
          <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider mt-1 block">Chat AI</span>
        </button>

        {/* Tab 5: Scanner */}
        <button 
          onClick={() => setCurrentTab('scanner')}
          className={`flex flex-col items-center justify-center py-1.5 px-1 sm:px-3 rounded-xl transition-all scale-down active:scale-90 flex-1 sm:flex-none ${
            currentTab === 'scanner' 
              ? "bg-[#c3f400] text-black shadow-[0_2px_10px_rgba(195,244,0,0.25)] font-bold" 
              : "text-zinc-500 hover:text-white"
          }`}
        >
          <Camera className="w-5 sm:w-5.5 h-5 sm:h-5.5" />
          <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider mt-1 block">Scan</span>
        </button>
      </nav>

      {/* SHARE WORKOUT CARD */}
      {showShare && shareData && activeProfile && (
        <ShareCard
          name={activeProfile.name}
          focus={shareData.focus}
          duration={shareData.duration}
          exercises={shareData.exercises}
          totalVolume={shareData.volume}
          onClose={() => setShowShare(false)}
        />
      )}

      {/* EXERCISE SEARCH MODAL */}
      <AnimatePresence>
        {showExSearch && (
          <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-end p-0 z-50 backdrop-blur-sm">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25 }}
              className="bg-[#121212] border-t border-zinc-800 rounded-t-2xl w-full max-w-[430px] max-h-[80vh] flex flex-col">
              <div className="p-4 border-b border-zinc-800 flex items-center gap-3">
                <input type="text" placeholder="Cari exercise..." value={exSearchQuery} onChange={e => setExSearchQuery(e.target.value)} autoFocus
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl h-10 px-3 text-sm text-white" />
                <button onClick={() => { setShowExSearch(false); setExSearchQuery(""); }} className="text-zinc-400 p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {searchExercises(exSearchQuery).map(ex => (
                  <button key={ex.name} onClick={() => {
                    setLoggerExercises(prev => [...prev, { name: ex.name, sets: 3, reps: "12", notes: ex.muscle, is_cardio: ex.category === 'cardio', duration_minutes: ex.category === 'cardio' ? 30 : undefined }]);
                    setShowExSearch(false); setExSearchQuery("");
                  }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-900 transition-colors text-left">
                    <MuscleIcon name={ex.name} size={40} />
                    <div className="flex-1">
                      <span className="text-sm font-semibold text-white block">{ex.name}</span>
                      <span className="text-[11px] text-zinc-500">{ex.muscle}</span>
                    </div>
                    <Plus className="w-4 h-4 text-zinc-600" />
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PROFILE EDIT/DELETE MODAL */}
      <AnimatePresence>
        {showEditProfile && activeProfile && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#201f1f] dark-card border border-[#444933] dark-border rounded-2xl w-full max-w-md p-6 relative ios-appear">
              <div className="absolute top-0 left-0 w-full h-[3px] bg-[#c3f400]"></div>
              <button onClick={() => { setShowEditProfile(false); setConfirmDeleteProfile(false); }} className="absolute top-4 right-4 text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-display text-xl font-bold text-white dark-text mb-4">Edit Profil</h3>
              <div className="space-y-3">
                <input value={editProfileName} onChange={e => setEditProfileName(e.target.value)} placeholder="Nama"
                  className="w-full bg-[#131313] dark-input border border-zinc-700 rounded-xl h-11 px-3 text-white text-sm" />
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" value={editProfileHeight} onChange={e => setEditProfileHeight(e.target.value)} placeholder="Tinggi (cm)"
                    className="bg-[#131313] dark-input border border-zinc-700 rounded-xl h-11 px-3 text-white text-sm" />
                  <input type="number" value={editProfileWeight} onChange={e => setEditProfileWeight(e.target.value)} placeholder="Berat (kg)"
                    className="bg-[#131313] dark-input border border-zinc-700 rounded-xl h-11 px-3 text-white text-sm" />
                </div>
                <input type="number" value={editProfileTarget} onChange={e => setEditProfileTarget(e.target.value)} placeholder="Target Berat (kg)"
                  className="w-full bg-[#131313] dark-input border border-zinc-700 rounded-xl h-11 px-3 text-white text-sm" />
                {formError && showEditProfile && <p className="field-error-msg text-center">{formError}</p>}
                <button onClick={handleEditProfile}
                  className="w-full bg-[#c3f400] text-black font-display font-bold py-3 rounded-xl">Simpan Perubahan</button>
                <div className="border-t border-zinc-800 pt-3">
                  {!confirmDeleteProfile ? (
                    <button onClick={() => setConfirmDeleteProfile(true)}
                      className="w-full text-red-400 text-xs font-semibold py-2 border border-red-900/50 rounded-xl hover:bg-red-950/30">Hapus Profil Ini</button>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={handleDeleteProfile} className="flex-1 bg-red-600 text-white font-bold py-2 rounded-xl text-xs">Ya, Hapus</button>
                      <button onClick={() => setConfirmDeleteProfile(false)} className="flex-1 bg-zinc-800 text-zinc-300 py-2 rounded-xl text-xs">Batal</button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* UPDATE WORKOUT LOG MODAL DIALOG */}
      <AnimatePresence>
        {editingLog && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-[#121212] w-full max-w-2xl rounded-2xl border border-zinc-800 p-6 space-y-6 shadow-[0_0_50px_rgba(195,244,0,0.1)] my-8 text-left"
            >
              {/* Modal header */}
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#c3f400] font-black">UBAH SESI LATIHAN</span>
                  <h3 className="font-display text-xl font-bold text-white mt-0.5">{editFocus}</h3>
                </div>
                <button 
                  onClick={() => setEditingLog(null)}
                  className="text-zinc-500 hover:text-white p-1 rounded-full bg-zinc-900 border border-zinc-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form elements */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Date */}
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-[#c4c9ac] font-bold mb-1">Tanggal</label>
                    <input 
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="w-full bg-[#1c1c1c] border border-zinc-700 rounded-lg h-10 px-3 text-xs text-white"
                    />
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-[#c4c9ac] font-bold mb-1">Lokasi Gym (Opsional)</label>
                    <input 
                      type="text"
                      placeholder="e.g. Muscle Prime Gym"
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                      className="w-full bg-[#1c1c1c] border border-zinc-700 rounded-lg h-10 px-3 text-xs text-white"
                    />
                  </div>
                </div>

                {/* Edit Focus string */}
                <div>
                  <label className="block text-xs uppercase tracking-widest text-[#c4c9ac] font-bold mb-1">Fokus Latihan</label>
                  <input 
                    type="text"
                    value={editFocus}
                    onChange={(e) => setEditFocus(e.target.value)}
                    className="w-full bg-[#1c1c1c] border border-zinc-700 rounded-lg h-10 px-3 text-xs text-white"
                  />
                </div>

                {/* Current Exercises list in modal */}
                <div className="space-y-2">
                  <label className="block text-xs uppercase tracking-widest text-[#c4c9ac] font-bold font-display">Daftar Gerakan ({editExercises.length})</label>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 bg-[#1a1a1a]/55 p-3 rounded-lg border border-zinc-850">
                    {editExercises.length === 0 ? (
                      <p className="text-zinc-500 text-xs italic">Belum ada gerakan dalam draf sesi ini.</p>
                    ) : (
                      editExercises.map((et, idx) => {
                        const isInlineEditing = editingEditExIndex === idx;

                        if (isInlineEditing) {
                          return (
                            <div key={idx} className="bg-zinc-950 p-3 rounded border border-[#c3f400]/40 space-y-3 mt-1 text-left">
                              <div className="flex justify-between items-center pb-1 border-b border-zinc-900">
                                <span className="text-[10px] font-mono text-[#c3f400] font-black">EDIT GERAKAN #{idx + 1}</span>
                              </div>

                              {/* Cardio / Strength Toggle */}
                              <div className="flex gap-3 text-[10px] font-bold text-[#c4c9ac]">
                                <label className="flex items-center gap-1 cursor-pointer select-none">
                                  <input 
                                    type="radio" 
                                    checked={!inlineExIsCardio} 
                                    onChange={() => setInlineExIsCardio(false)} 
                                    className="text-[#c3f400] focus:ring-0"
                                  />
                                  Beban
                                </label>
                                <label className="flex items-center gap-1 cursor-pointer select-none">
                                  <input 
                                    type="radio" 
                                    checked={inlineExIsCardio} 
                                    onChange={() => setInlineExIsCardio(true)} 
                                    className="text-[#c3f400] focus:ring-0"
                                  />
                                  Kardio
                                </label>
                              </div>

                              {/* Form */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <div className="sm:col-span-1">
                                  <label className="block text-[9px] text-zinc-500 font-bold mb-0.5">NAMA GERAKAN</label>
                                  <input 
                                    type="text"
                                    value={inlineExName}
                                    onChange={(e) => setInlineExName(e.target.value)}
                                    className="w-full bg-[#111] border border-zinc-800 rounded h-7 px-2 text-xs text-white"
                                  />
                                </div>

                                {inlineExIsCardio ? (
                                  <div>
                                    <label className="block text-[9px] text-zinc-500 font-bold mb-0.5">DURASI (MENIT)</label>
                                    <input 
                                      type="number"
                                      value={inlineExDuration}
                                      onChange={(e) => setInlineExDuration(e.target.value)}
                                      className="w-full bg-[#111] border border-zinc-800 rounded h-7 px-2 text-xs text-white"
                                    />
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-3 gap-1 col-span-1">
                                    <div>
                                      <label className="block text-[9px] text-zinc-500 font-bold mb-0.5 text-center">SETS</label>
                                      <input 
                                        type="number"
                                        value={inlineExSets}
                                        onChange={(e) => setInlineExSets(e.target.value)}
                                        className="w-full bg-[#111] border border-zinc-800 rounded h-7 text-center text-xs text-white"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[9px] text-zinc-500 font-bold mb-0.5 text-center">REPS</label>
                                      <input 
                                        type="text"
                                        value={inlineExReps}
                                        onChange={(e) => setInlineExReps(e.target.value)}
                                        className="w-full bg-[#111] border border-zinc-800 rounded h-7 text-center text-xs text-white"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[9px] text-zinc-500 font-bold mb-0.5 text-center">BEBAN KG</label>
                                      <input 
                                        type="number"
                                        value={inlineExWeight}
                                        onChange={(e) => setInlineExWeight(e.target.value)}
                                        className="w-full bg-[#111] border border-[#222] rounded h-7 text-center text-xs text-[#c3f400]"
                                      />
                                    </div>
                                  </div>
                                )}

                                <div className="sm:col-span-1">
                                  <label className="block text-[9px] text-zinc-500 font-bold mb-0.5">CATATAN</label>
                                  <input 
                                    type="text"
                                    value={inlineExNotes}
                                    onChange={(e) => setInlineExNotes(e.target.value)}
                                    className="w-full bg-[#111] border border-zinc-800 rounded h-7 px-2 text-xs text-white"
                                  />
                                </div>
                              </div>

                              <div className="flex justify-end gap-1.5 pt-1">
                                <button
                                  onClick={() => setEditingEditExIndex(null)}
                                  className="bg-zinc-900 border border-zinc-805 hover:bg-zinc-800 text-zinc-400 text-[10px] font-bold px-2.5 py-1 rounded transition-colors"
                                >
                                  Batal
                                </button>
                                <button
                                  onClick={() => saveInlineEditEditEx(idx)}
                                  className="bg-[#c3f400] hover:bg-[#abd600] text-black text-[10px] font-extrabold px-3 py-1 rounded transition-all"
                                >
                                  Simpan
                                </button>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={idx} className="bg-zinc-900 px-3 py-2 rounded border border-zinc-800/80 flex justify-between items-center text-xs">
                            <div className="text-left">
                              <span className="font-bold text-white mr-2">{idx + 1}. {et.name}</span>
                              <span className="text-[#c4c9ac]">
                                {et.is_cardio 
                                  ? `⏱️ Kardio ${et.duration_minutes || 30}m`
                                  : `${et.sets}s x ${et.reps} ${et.weight_kg ? `@ ${et.weight_kg}kg` : ""}`}
                              </span>
                              {et.notes && <p className="text-[10px] text-[#a6e6ff] italic mt-0.5">Note: {et.notes}</p>}
                            </div>

                            {/* Control button row */}
                            <div className="flex items-center gap-1 ml-2">
                              {/* Move Up */}
                              <button
                                onClick={() => moveEditExercise(idx, 'up')}
                                disabled={idx === 0}
                                title="Geser ke Atas"
                                className="bg-zinc-950 p-1.5 rounded hover:text-[#c3f400] text-zinc-400 disabled:opacity-30 border border-zinc-800"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>

                              {/* Move Down */}
                              <button
                                onClick={() => moveEditExercise(idx, 'down')}
                                disabled={idx === editExercises.length - 1}
                                title="Geser ke Bawah"
                                className="bg-zinc-950 p-1.5 rounded hover:text-[#c3f400] text-zinc-400 disabled:opacity-30 border border-zinc-800"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>

                              {/* Inline Edit Trigger */}
                              <button
                                onClick={() => startInlineEditEditEx(idx, et)}
                                title="Sunting"
                                className="bg-zinc-950 p-1.5 rounded hover:text-white text-zinc-400 border border-zinc-800"
                              >
                                <Edit className="w-3 h-3" />
                              </button>

                              {/* Delete */}
                              <button 
                                onClick={() => setEditExercises(prev => prev.filter((_, i) => i !== idx))}
                                title="Hapus"
                                className="bg-zinc-950 p-1.5 rounded hover:text-red-400 text-zinc-400 border border-zinc-800"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Inline Exercise Adder in Modal */}
                <div className="bg-[#1c1c1c] p-3 rounded-lg border border-zinc-800 space-y-2">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase block">Tambah Gerakan Baru</span>
                  
                  {/* Workout type selector */}
                  <div className="flex gap-3 text-[11px] font-semibold text-[#c4c9ac]">
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input 
                        type="radio" 
                        checked={!editExIsCardio} 
                        onChange={() => setEditExIsCardio(false)} 
                        className="text-[#c3f400] focus:ring-0"
                      />
                      Beban (Strength)
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input 
                        type="radio" 
                        checked={editExIsCardio} 
                        onChange={() => setEditExIsCardio(true)} 
                        className="text-[#c3f400] focus:ring-0"
                      />
                      Kardio (Cardio)
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input 
                      type="text"
                      placeholder={editExIsCardio ? "Treadmill Run, dll" : "Nama gerakan"}
                      value={editExName}
                      onChange={(e) => setEditExName(e.target.value)}
                      className="bg-black/40 border border-zinc-700 rounded h-8 px-2 text-xs text-white sm:col-span-1"
                    />

                    {editExIsCardio ? (
                      <input 
                        type="number"
                        placeholder="Durasi (menit)"
                        value={editExDuration}
                        onChange={(e) => setEditExDuration(e.target.value)}
                        className="bg-black/40 border border-zinc-700 rounded h-8 px-2 text-xs text-white"
                      />
                    ) : (
                      <div className="grid grid-cols-3 gap-1 col-span-1">
                        <input 
                          type="number"
                          placeholder="Sets"
                          value={editExSets}
                          onChange={(e) => setEditExSets(e.target.value)}
                          className="bg-black/40 border border-zinc-700 rounded h-8 text-center text-xs text-white"
                        />
                        <input 
                          type="text"
                          placeholder="Reps"
                          value={editExReps}
                          onChange={(e) => setEditExReps(e.target.value)}
                          className="bg-black/40 border border-zinc-700 rounded h-8 text-center text-xs text-white"
                        />
                        <input 
                          type="number"
                          placeholder="kg"
                          value={editExWeight}
                          onChange={(e) => setEditExWeight(e.target.value)}
                          className="bg-black/40 border border-zinc-700 rounded h-8 text-center text-xs text-white"
                        />
                      </div>
                    )}

                    <input 
                      type="text"
                      placeholder="Catatan gerakan"
                      value={editExNotes}
                      onChange={(e) => setEditExNotes(e.target.value)}
                      className="bg-black/40 border border-zinc-700 rounded h-8 px-2 text-xs text-white sm:col-span-1"
                    />
                  </div>

                  <button
                    onClick={handleAddEditCustomExercise}
                    className="w-full bg-zinc-800 hover:bg-zinc-750 text-[#c3f400] text-[11px] font-bold py-1.5 rounded"
                  >
                    + Tambahkan Gerakan ke Sesi
                  </button>
                </div>
              </div>

              {/* Modal controls */}
              <div className="flex gap-4 border-t border-zinc-800 pt-4 justify-end">
                <button
                  onClick={() => setEditingLog(null)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold px-5 py-2.5 rounded-xl text-xs transition-colors user-button"
                >
                  Batal
                </button>
                <button
                  onClick={handleUpdateWorkoutLog}
                  disabled={editExercises.length === 0}
                  className="bg-[#c3f400] hover:bg-[#abd600] text-black font-display font-black px-6 py-2.5 rounded-xl text-xs transition-all disabled:opacity-50"
                >
                  SIMPAN PERUBAHAN
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
