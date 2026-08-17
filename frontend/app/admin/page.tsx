"use client";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { api, image } from "../../lib/api";
import { Show } from "../../components/content";
import { Plus, Trash2, Video, Film, Upload, ShieldAlert, Edit3, ShieldCheck, Eye } from "lucide-react";
import { showSuccess, showError } from "../../components/notification-provider";
import { DeleteConfirmModal } from "../../components/delete-confirm-modal";

function parseScheduleIso(isoStr: string) {
  if (!isoStr) return { date: "", hour: "12", minute: "00", ampm: "PM" };
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return { date: "", hour: "12", minute: "00", ampm: "PM" };
    const istOffsetMs = (5 * 60 + 30) * 60 * 1000;
    const istDate = new Date(d.getTime() + istOffsetMs);
    const date = istDate.toISOString().slice(0, 10);
    let h = istDate.getUTCHours();
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    const hour = String(h).padStart(2, "0");
    const minute = String(istDate.getUTCMinutes()).padStart(2, "0");
    return { date, hour, minute, ampm };
  } catch {
    return { date: "", hour: "12", minute: "00", ampm: "PM" };
  }
}

export default function Admin() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"series" | "episodes" | "episode-views">("series");

  // Fetch Series List
  const { data: seriesList = [], refetch: refetchSeries, error: seriesError } = useQuery({
    queryKey: ["admin-series-list"],
    queryFn: async () => {
      const res = await api.get("/series?all=true&limit=1000");
      return Array.isArray(res.data) ? res.data : [];
    }
  });

  // Fetch Episodes List
  const { data: episodesList = [], refetch: refetchEpisodes, error: episodesError } = useQuery({
    queryKey: ["admin-episodes-list"],
    queryFn: async () => {
      const res = await api.get("/episodes?all=true&limit=2000");
      return Array.isArray(res.data) ? res.data : [];
    }
  });

  // Fetch Stats (for totals)
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => (await api.get("/admin/stats")).data
  });

  // Series Form State
  const [sTitle, setSTitle] = useState("");
  const [sDesc, setSDesc] = useState("");
  const [sLogo, setSLogo] = useState("");
  const [sThumbnail, setSThumbnail] = useState("");
  const [sBanner, setSBanner] = useState("");
  const [sType, setSType] = useState("Anime");
  const [sCreator, setSCreator] = useState("Sri Explainer");
  const [sVisibility, setSVisibility] = useState<"public" | "subscription">("public");
  const [sStatus, setSStatus] = useState("Ongoing");
  const [sYear, setSYear] = useState(2026);
  const [sLanguage, setSLanguage] = useState("Tamil");
  const [sRating, setSRating] = useState("4.9");
  const [sIsUpcoming, setSIsUpcoming] = useState(false);
  const [sUpcomingMessage, setSUpcomingMessage] = useState("");
  const [sNotice, setSNotice] = useState("");
  const [editingSeries, setEditingSeries] = useState<any>(null);

  // Episode Form State
  const [epSeriesId, setEpSeriesId] = useState("");
  const [epNumber, setEpNumber] = useState(1);
  const [epTitle, setEpTitle] = useState("");
  const [epUrl, setEpUrl] = useState("");
  const [epDuration, setEpDuration] = useState("");
  const [epQuality, setEpQuality] = useState("1080P");
  const [epThumbnail, setEpThumbnail] = useState("");
  const [epVisibility, setEpVisibility] = useState<"public" | "private">("public");
  const [epAccess, setEpAccess] = useState<"free" | "xp_coins">("free");
  const [epXpCost, setEpXpCost] = useState(5);
  const [epScheduledReleaseAt, setEpScheduledReleaseAt] = useState<string | null>(null);
  const [epIsUpcoming, setEpIsUpcoming] = useState(false);
  const [epUpcomingDisplayMessage, setEpUpcomingDisplayMessage] = useState("");
  const [epReleaseDate, setEpReleaseDate] = useState("");
  const [epCommentsDisabled, setEpCommentsDisabled] = useState(false);
  const [epCommentsLocked, setEpCommentsLocked] = useState(false);
  const [epNotice, setEpNotice] = useState("");
  const [editingEpisode, setEditingEpisode] = useState<any>(null);
  const [epVisibilityFilter, setEpVisibilityFilter] = useState("all");

  // File Upload Helper
  async function handleFileUpload(file: File, setter: (val: string) => void) {
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await api.post("/admin/upload", formData);
      if (res.data?.url) {
        setter(res.data.url);
        showSuccess("Image uploaded successfully!");
      }
    } catch {
      showError("Failed to upload image. Please try again.");
    }
  }

  // Create Series
  async function createSeries(e: FormEvent) {
    e.preventDefault();
    setSNotice("");
    try {
      await api.post("/admin/series", {
        title: sTitle,
        description: sDesc,
        logo: sLogo,
        thumbnail: sThumbnail,
        banner: sBanner,
        type: sType,
        creator: sCreator,
        visibility: sVisibility,
        status: sStatus,
        year: Number(sYear),
        language: sLanguage,
        rating: sRating,
        isUpcoming: sStatus.toLowerCase() === "upcoming" ? true : sIsUpcoming,
        upcomingMessage: sUpcomingMessage
      });
      setSTitle("");
      setSDesc("");
      setSLogo("");
      setSThumbnail("");
      setSBanner("");
      setSNotice("Series created successfully!");
      showSuccess("Series created successfully!");
      refetchSeries();
      refetchStats();
      queryClient.invalidateQueries({ queryKey: ["series"] });
      queryClient.invalidateQueries({ queryKey: ["public-series"] });
      queryClient.invalidateQueries({ queryKey: ["all-series"] });
    } catch (err: any) {
      setSNotice(err.response?.data?.message || "Could not create series.");
      showError(err.response?.data?.message || "Could not create series.");
    }
  }

  // Update Series
  async function updateSeries(e: FormEvent) {
    e.preventDefault();
    if (!editingSeries) return;
    try {
      await api.patch(`/admin/series/${editingSeries.id || editingSeries._id}`, {
        title: editingSeries.title,
        description: editingSeries.description,
        logo: editingSeries.logo,
        thumbnail: editingSeries.thumbnail,
        banner: editingSeries.banner,
        type: editingSeries.type,
        status: editingSeries.status,
        creator: editingSeries.creator,
        year: Number(editingSeries.year),
        language: editingSeries.language,
        rating: editingSeries.rating,
        visibility: editingSeries.visibility,
        isUpcoming: (editingSeries.status || "").toLowerCase() === "upcoming" ? true : editingSeries.isUpcoming,
        upcomingMessage: editingSeries.upcomingMessage || ""
      });
      showSuccess("Series updated successfully!");
      setEditingSeries(null);
      refetchSeries();
      refetchStats();
      queryClient.invalidateQueries({ queryKey: ["series"] });
      queryClient.invalidateQueries({ queryKey: ["public-series"] });
      queryClient.invalidateQueries({ queryKey: ["all-series"] });
    } catch (err: any) {
      showError(err.response?.data?.message || "Could not update series.");
    }
  }

  // Create Episode
  async function createEpisode(e: FormEvent) {
    e.preventDefault();
    setEpNotice("");
    try {
      await api.post("/admin/episodes", {
        series: epSeriesId,
        seriesId: epSeriesId,
        number: Number(epNumber),
        title: epTitle,
        rumbleEmbedUrl: epUrl,
        duration: epDuration,
        quality: epQuality,
        thumbnail: epThumbnail,
        visibility: epVisibility === "private" ? "private" : "public",
        access: epAccess === "xp_coins" ? "xp_coins" : "free",
        xpCost: epAccess === "xp_coins" ? Math.max(1, Number(epXpCost || 5)) : 0,
        scheduledReleaseAt: epScheduledReleaseAt || null,
        isUpcoming: epIsUpcoming,
        upcomingDisplayMessage: epUpcomingDisplayMessage,
        releaseDate: epReleaseDate || undefined,
        commentsDisabled: epCommentsDisabled,
        commentsLocked: epCommentsLocked
      });
      setEpTitle("");
      setEpUrl("");
      setEpDuration("");
      setEpThumbnail("");
      setEpScheduledReleaseAt(null);
      setEpUpcomingDisplayMessage("");
      setEpNumber((n) => n + 1);
      setEpNotice("Episode published successfully!");
      showSuccess("Episode published successfully!");
      refetchEpisodes();
      refetchSeries();
      refetchStats();
      queryClient.invalidateQueries();
    } catch (err: any) {
      setEpNotice(err.response?.data?.message || "Could not publish episode.");
      showError(err.response?.data?.message || "Could not publish episode.");
    }
  }

  // Update Episode
  async function updateEpisode(e: FormEvent) {
    e.preventDefault();
    if (!editingEpisode) return;
    try {
      const accessVal = (editingEpisode.access === "xp_coins" || editingEpisode.access === "premium") ? "xp_coins" : "free";
      const xpCostVal = accessVal === "xp_coins" ? Math.max(1, Number(editingEpisode.xpCost !== undefined ? editingEpisode.xpCost : 5)) : 0;

      await api.patch(`/admin/episodes/${editingEpisode.id || editingEpisode._id}`, {
        number: Number(editingEpisode.number),
        title: editingEpisode.title,
        rumbleEmbedUrl: editingEpisode.rumbleEmbedUrl,
        quality: editingEpisode.quality,
        visibility: editingEpisode.visibility === "private" ? "private" : "public",
        access: accessVal,
        xpCost: xpCostVal,
        scheduledReleaseAt: editingEpisode.scheduledReleaseAt || null,
        upcomingDisplayMessage: editingEpisode.upcomingDisplayMessage || ""
      });
      showSuccess("Episode updated successfully!");
      setEditingEpisode(null);
      refetchEpisodes();
      refetchSeries();
      refetchStats();
      queryClient.invalidateQueries();
    } catch (err: any) {
      showError(err.response?.data?.message || "Could not update episode.");
    }
  }

  // Custom Delete Modal State
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    type: "series" | "episode" | null;
    id: string | null;
    title: string;
    message: string;
    isDeleting: boolean;
  }>({
    isOpen: false,
    type: null,
    id: null,
    title: "",
    message: "",
    isDeleting: false
  });

  function requestDeleteSeries(id: string) {
    const target = seriesList.find((s: any) => (s._id || s.id) === id);
    setDeleteModalState({
      isOpen: true,
      type: "series",
      id,
      title: "Delete Series",
      message: `Are you sure you want to delete "${target?.title || "this series"}"? All associated episodes will be permanently deleted.`,
      isDeleting: false
    });
  }

  function requestDeleteEpisode(id: string) {
    const target = episodesList.find((e: any) => (e._id || e.id) === id);
    setDeleteModalState({
      isOpen: true,
      type: "episode",
      id,
      title: "Delete Episode",
      message: `Are you sure you want to delete Episode ${target?.number || ""}: "${target?.title || "this episode"}"?`,
      isDeleting: false
    });
  }

  async function handleConfirmDelete() {
    const { type, id } = deleteModalState;
    if (!type || !id) return;
    setDeleteModalState((prev) => ({ ...prev, isDeleting: true }));
    try {
      if (type === "series") {
        await api.delete(`/admin/series/${id}`);
        refetchSeries();
        refetchEpisodes();
        refetchStats();
        showSuccess("Series deleted successfully!");
      } else if (type === "episode") {
        await api.delete(`/admin/episodes/${id}`);
        refetchEpisodes();
        refetchSeries();
        refetchStats();
        queryClient.invalidateQueries();
        showSuccess("Episode deleted successfully!");
      }
    } catch {
      showError(type === "series" ? "Failed to delete series." : "Failed to delete episode.");
    } finally {
      setDeleteModalState({
        isOpen: false,
        type: null,
        id: null,
        title: "",
        message: "",
        isDeleting: false
      });
    }
  }

  const filteredEpisodes = episodesList.filter((ep: any) => {
    if (epVisibilityFilter === "all") return true;
    return (ep.visibility || "public") === epVisibilityFilter;
  });

  const error = seriesError || episodesError;
  if (error) {
    return (
      <main className="shell py-20 text-center">
        <div className="glass-card max-w-md mx-auto p-8 border border-rose-500/30">
          <ShieldAlert size={48} className="text-rose-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Admin Access Required</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Sign in with an authorized admin account to access the Control Center.
          </p>
          <a
            href="/login"
            className="mt-6 inline-block rounded-full brand-gradient px-6 py-2.5 text-sm font-bold text-white shadow-lg"
          >
            Sign In Now
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="px-4 sm:px-8 py-8 w-full max-w-7xl 3xl:max-w-[2200px] 4xl:max-w-[2800px] mx-auto space-y-8">
      {/* Sleek Top Banner & 4-Module Admin Navigation */}
      <div className="relative overflow-hidden rounded-3xl border-[1.5px] border-white/15 bg-[#0E0E0E] p-6 sm:p-8 shadow-[3px_3px_0px_rgba(0,0,0,0.8)]">
        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3 font-display uppercase">
              Admin Control Center
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xl leading-relaxed font-primary">
              Manage series, upload episodes, monitor episode views, and view system health.
            </p>
          </div>

          {/* Clean 4-Item Admin Navigation Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-2 rounded-2xl bg-[#000000] border border-white/15 shadow-inner w-full xl:w-auto font-mono">
            {/* 1. Series Tab */}
            <button
              onClick={() => setTab("series")}
              className={`px-4 py-3 rounded-xl text-xs font-black transition-all duration-200 flex items-center justify-center gap-2 ${
                tab === "series"
                  ? "bg-white text-black shadow-[2px_2px_0px_rgba(255,255,255,0.25)] border border-white scale-[1.02]"
                  : "bg-[#0E0E0E] border border-white/15 text-zinc-400 hover:text-white hover:border-white"
              }`}
            >
              <Film size={15} />
              <span>Series</span>
              <span className="px-1.5 py-0.5 rounded-full bg-black/20 text-[10px]">{seriesList.length}</span>
            </button>

            {/* 2. Episodes Tab */}
            <button
              onClick={() => setTab("episodes")}
              className={`px-4 py-3 rounded-xl text-xs font-black transition-all duration-200 flex items-center justify-center gap-2 ${
                tab === "episodes"
                  ? "bg-white text-black shadow-[2px_2px_0px_rgba(255,255,255,0.25)] border border-white scale-[1.02]"
                  : "bg-[#0E0E0E] border border-white/15 text-zinc-400 hover:text-white hover:border-white"
              }`}
            >
              <Video size={15} />
              <span>Episodes</span>
              <span className="px-1.5 py-0.5 rounded-full bg-black/20 text-[10px]">{episodesList.length}</span>
            </button>

            {/* 3. Episode Views Tab */}
            <button
              onClick={() => setTab("episode-views")}
              className={`px-4 py-3 rounded-xl text-xs font-black transition-all duration-200 flex items-center justify-center gap-2 ${
                tab === "episode-views"
                  ? "bg-white text-black shadow-[2px_2px_0px_rgba(255,255,255,0.25)] border border-white scale-[1.02]"
                  : "bg-[#0E0E0E] border border-white/15 text-zinc-400 hover:text-white hover:border-white"
              }`}
            >
              <Eye size={15} />
              <span>Episode Views</span>
            </button>

            {/* 4. Security & System Health Link */}
            <Link
              href="/admin/health"
              className="px-4 py-3 rounded-xl text-xs font-black transition-all duration-200 bg-[#0E0E0E] border border-white/15 text-zinc-300 hover:bg-white hover:text-black hover:border-white flex items-center justify-center gap-2"
            >
              <ShieldCheck size={15} />
              <span>Security & Health</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 1. SERIES MANAGEMENT TAB */}
      {tab === "series" && (
        <div className="mt-8 flex flex-col gap-8">
          {/* Create Series Form */}
          <form onSubmit={createSeries} className="w-full max-w-4xl mx-auto space-y-6 sm:space-y-8 rounded-3xl border-[1.5px] border-white/15 bg-[#0E0E0E] p-6 sm:p-8 shadow-[3px_3px_0px_rgba(0,0,0,0.8)]">
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-3 border-b border-white/10 pb-4 font-display uppercase">
              <Plus size={20} className="text-white" /> Create New Series
            </h2>

            {sNotice && (
              <div className="p-4 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-bold font-mono">
                {sNotice}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-extrabold text-zinc-300 uppercase tracking-wider block font-mono">Series Title *</label>
              <input
                type="text"
                value={sTitle}
                onChange={(e) => setSTitle(e.target.value)}
                required
                placeholder="e.g. God Card Master"
                className="w-full rounded-xl bg-[#000000] border border-white/15 px-4 py-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-all shadow-inner font-primary"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-extrabold text-zinc-300 uppercase tracking-wider block font-mono">Description *</label>
              <textarea
                value={sDesc}
                onChange={(e) => setSDesc(e.target.value)}
                required
                placeholder="Detailed series description..."
                className="w-full rounded-xl bg-[#000000] border border-white/15 p-4 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-all shadow-inner min-h-[90px] font-primary"
              />
            </div>

            {/* Series Logo Image */}
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-extrabold text-zinc-300 uppercase tracking-wider block font-mono">Series Logo Image (Optional)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={sLogo}
                  onChange={(e) => setSLogo(e.target.value)}
                  placeholder="URL or Upload Logo"
                  className="w-full rounded-xl bg-[#000000] border border-white/15 px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white font-primary"
                />
                <label className="cursor-pointer px-4 py-2.5 rounded-xl bg-[#141414] border border-white/15 hover:border-white text-xs font-bold text-white shrink-0 flex items-center gap-1.5 transition-all font-mono">
                  <Upload size={14} /> Upload
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], setSLogo)} />
                </label>
              </div>
            </div>

            {/* Poster Thumbnail */}
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-extrabold text-zinc-300 uppercase tracking-wider block font-mono">Poster Thumbnail Image</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={sThumbnail}
                  onChange={(e) => setSThumbnail(e.target.value)}
                  placeholder="URL or Upload Thumbnail"
                  className="w-full rounded-xl bg-[#000000] border border-white/15 px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white font-primary"
                />
                <label className="cursor-pointer px-4 py-2.5 rounded-xl bg-[#141414] border border-white/15 hover:border-white text-xs font-bold text-white shrink-0 flex items-center gap-1.5 transition-all font-mono">
                  <Upload size={14} /> Upload
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], setSThumbnail)} />
                </label>
              </div>
            </div>

            {/* Hero Banner Background */}
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-extrabold text-zinc-300 uppercase tracking-wider block font-mono">Hero Banner Background Image</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={sBanner}
                  onChange={(e) => setSBanner(e.target.value)}
                  placeholder="URL or Upload Banner"
                  className="w-full rounded-xl bg-[#000000] border border-white/15 px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white font-primary"
                />
                <label className="cursor-pointer px-4 py-2.5 rounded-xl bg-[#141414] border border-white/15 hover:border-white text-xs font-bold text-white shrink-0 flex items-center gap-1.5 transition-all font-mono">
                  <Upload size={14} /> Upload
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], setSBanner)} />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 font-primary">
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-extrabold text-zinc-300 uppercase tracking-wider block font-mono">Series Type / Category</label>
                <input
                  type="text"
                  value={sType}
                  onChange={(e) => setSType(e.target.value)}
                  placeholder="Enter category (e.g. Anime)"
                  className="w-full rounded-xl bg-[#000000] border border-white/15 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-extrabold text-zinc-300 uppercase tracking-wider block font-mono">Creator / Uploader *</label>
                <input
                  type="text"
                  required
                  value={sCreator}
                  onChange={(e) => setSCreator(e.target.value)}
                  placeholder="Creator name"
                  className="w-full rounded-xl bg-[#000000] border border-white/15 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-extrabold text-zinc-300 uppercase tracking-wider block font-mono">Access Type *</label>
                <select
                  value={sVisibility === "subscription" ? "subscription" : "public"}
                  onChange={(e) => setSVisibility(e.target.value as "public" | "subscription")}
                  className="w-full rounded-xl bg-[#000000] border border-white/15 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white"
                >
                  <option value="public">Free</option>
                  <option value="subscription">Subscription</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-extrabold text-zinc-300 uppercase tracking-wider block font-mono">Series Status *</label>
                <select
                  value={sStatus}
                  onChange={(e) => setSStatus(e.target.value)}
                  className="w-full rounded-xl bg-[#000000] border border-white/15 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white"
                >
                  <option value="Ongoing">Ongoing</option>
                  <option value="Completed">Completed</option>
                  <option value="Upcoming">Upcoming</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-extrabold text-zinc-300 uppercase tracking-wider block font-mono">Release Year</label>
                <input
                  type="number"
                  value={sYear}
                  onChange={(e) => setSYear(Number(e.target.value))}
                  className="w-full rounded-xl bg-[#000000] border border-white/15 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-extrabold text-zinc-300 uppercase tracking-wider block font-mono">Language</label>
                <input
                  type="text"
                  value={sLanguage}
                  onChange={(e) => setSLanguage(e.target.value)}
                  className="w-full rounded-xl bg-[#000000] border border-white/15 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 rounded-full bg-white text-black hover:bg-zinc-200 font-black text-xs sm:text-sm shadow-[3px_3px_0px_rgba(255,255,255,0.25)] hover:scale-[1.01] transition-all flex items-center justify-center gap-2 font-display uppercase tracking-wider"
            >
              <Plus size={16} /> Create Series
            </button>
          </form>

          {/* Series List & Management Table */}
          <div className="rounded-3xl border-[1.5px] border-white/15 bg-[#0E0E0E] p-6 sm:p-8 space-y-6 shadow-[3px_3px_0px_rgba(0,0,0,0.8)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h3 className="text-xl font-black text-white flex items-center gap-2 font-display uppercase">
                  <Film size={20} className="text-white" /> Active Series Library ({seriesList.length})
                </h3>
                <p className="text-xs text-zinc-400 mt-1 font-primary">Manage and edit your existing series collection.</p>
              </div>
            </div>

            <div className="grid gap-4">
              {seriesList.map((series: any) => (
                <div
                  key={series._id || series.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#000000] border border-white/15 hover:border-white transition-all shadow-md"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-16 rounded-xl overflow-hidden bg-[#141414] border border-white/15 shrink-0 flex items-center justify-center">
                      {series.thumbnail ? (
                        <img src={image(series.thumbnail)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Film size={20} className="text-white" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-black text-white text-sm sm:text-base truncate font-display">{series.title}</h4>
                      <p className="text-xs text-zinc-400 mt-0.5 font-mono">
                        {series.status || "Ongoing"} · {series.type || "Anime"} · {series.creator || "Sri Explainer"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => setEditingSeries(series)}
                      className="px-4 py-2 rounded-full bg-[#141414] border border-white/15 hover:border-white text-xs font-bold text-white transition-all shadow-sm flex items-center gap-1.5 font-mono"
                    >
                      <Edit3 size={13} /> Edit
                    </button>
                    <button
                      onClick={() => requestDeleteSeries(series._id || series.id)}
                      className="px-4 py-2 rounded-full bg-rose-500/10 border border-rose-500/30 hover:bg-rose-600 text-rose-300 hover:text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 font-mono"
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Edit Series Modal */}
          {editingSeries && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md p-4 flex items-center justify-center overflow-y-auto">
              <form onSubmit={updateSeries} className="w-full max-w-xl bg-[#0E0E0E] border-[1.5px] border-white/20 rounded-3xl p-6 sm:p-8 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
                <h3 className="text-xl font-black text-white flex items-center gap-2 border-b border-white/15 pb-3 font-display uppercase">
                  <Edit3 size={18} className="text-white" /> Edit Series: {editingSeries.title}
                </h3>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300 font-mono">Series Title</label>
                  <input
                    type="text"
                    required
                    value={editingSeries.title || ""}
                    onChange={(e) => setEditingSeries({ ...editingSeries, title: e.target.value })}
                    className="w-full rounded-xl bg-[#000000] border border-white/15 px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white font-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300 font-mono">Description</label>
                  <textarea
                    required
                    value={editingSeries.description || ""}
                    onChange={(e) => setEditingSeries({ ...editingSeries, description: e.target.value })}
                    className="w-full rounded-xl bg-[#000000] border border-white/15 p-3 text-xs text-white min-h-[80px] focus:outline-none focus:border-white font-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300 font-mono">Poster Thumbnail URL</label>
                  <input
                    type="text"
                    value={editingSeries.thumbnail || ""}
                    onChange={(e) => setEditingSeries({ ...editingSeries, thumbnail: e.target.value })}
                    className="w-full rounded-xl bg-[#000000] border border-white/15 px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white font-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-300 font-mono">Status</label>
                    <select
                      value={editingSeries.status || "Ongoing"}
                      onChange={(e) => setEditingSeries({ ...editingSeries, status: e.target.value })}
                      className="w-full rounded-xl bg-[#000000] border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-white"
                    >
                      <option value="Ongoing">Ongoing</option>
                      <option value="Completed">Completed</option>
                      <option value="Upcoming">Upcoming</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-300 font-mono">Creator</label>
                    <input
                      type="text"
                      value={editingSeries.creator || "Sri Explainer"}
                      onChange={(e) => setEditingSeries({ ...editingSeries, creator: e.target.value })}
                      className="w-full rounded-xl bg-[#000000] border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-white"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/15">
                  <button
                    type="button"
                    onClick={() => setEditingSeries(null)}
                    className="px-5 py-2.5 rounded-full bg-[#141414] border border-white/15 text-xs font-bold text-zinc-300 hover:text-white hover:border-white font-mono"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-black shadow-[2px_2px_0px_rgba(255,255,255,0.25)] font-display uppercase tracking-wider"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* 2. EPISODES MANAGEMENT TAB */}
      {tab === "episodes" && (
        <div className="mt-8 flex flex-col gap-8">
          {/* Create Episode Form */}
          <form onSubmit={createEpisode} className="w-full max-w-4xl mx-auto space-y-6 sm:space-y-8 rounded-3xl border-[1.5px] border-white/15 bg-[#0E0E0E] p-6 sm:p-8 shadow-[3px_3px_0px_rgba(0,0,0,0.8)]">
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-3 border-b border-white/15 pb-4 font-display uppercase">
              <Plus size={20} className="text-white" /> Upload New Episode
            </h2>

            {epNotice && (
              <div className="p-4 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-bold font-mono">
                {epNotice}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-extrabold text-zinc-300 uppercase tracking-wider block font-mono">Series *</label>
              <select
                value={epSeriesId}
                onChange={(e) => setEpSeriesId(e.target.value)}
                required
                className="w-full rounded-xl bg-[#000000] border border-white/15 px-4 py-3 text-xs text-white focus:outline-none focus:border-white font-primary"
              >
                <option value="">Select a series...</option>
                {seriesList.map((s: any) => (
                  <option key={s._id || s.id} value={s._id || s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3 font-primary">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block font-mono">Ep #</label>
                <input
                  type="number"
                  value={epNumber}
                  onChange={(e) => setEpNumber(Number(e.target.value))}
                  required
                  min={1}
                  className="w-full rounded-xl bg-[#000000] border border-white/15 px-3.5 py-3 text-xs text-white focus:outline-none focus:border-white font-mono"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block font-mono">Episode Title *</label>
                <input
                  type="text"
                  value={epTitle}
                  onChange={(e) => setEpTitle(e.target.value)}
                  required
                  placeholder="Episode title..."
                  className="w-full rounded-xl bg-[#000000] border border-white/15 px-4 py-3 text-xs text-white focus:outline-none focus:border-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block font-mono">Rumble Embed URL *</label>
              <input
                type="url"
                value={epUrl}
                onChange={(e) => setEpUrl(e.target.value)}
                required
                placeholder="https://rumble.com/embed/v3xyz/"
                className="w-full rounded-xl bg-[#000000] border border-white/15 px-4 py-3 text-xs text-white focus:outline-none focus:border-white font-mono"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-primary">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block font-mono">Video Quality *</label>
                <select
                  value={epQuality}
                  onChange={(e) => setEpQuality(e.target.value)}
                  required
                  className="w-full rounded-xl bg-[#000000] border border-white/15 px-4 py-3 text-xs text-white focus:outline-none focus:border-white font-mono"
                >
                  <option value="360P">360P</option>
                  <option value="480P">480P</option>
                  <option value="720P">720P (HD)</option>
                  <option value="1080P">1080P (Full HD)</option>
                  <option value="1440P">1440P (2K)</option>
                  <option value="2160P">2160P (4K)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block font-mono">Episode Access *</label>
                <select
                  value={epAccess}
                  onChange={(e) => setEpAccess(e.target.value as any)}
                  required
                  className="w-full rounded-xl bg-[#000000] border border-white/15 px-4 py-3 text-xs text-white focus:outline-none focus:border-white font-bold font-mono"
                >
                  <option value="free">FREE</option>
                  <option value="xp_coins">XP COINS</option>
                </select>
              </div>
            </div>

            {epAccess === "xp_coins" && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block font-mono">XP Coin Cost *</label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  required
                  value={epXpCost}
                  onChange={(e) => setEpXpCost(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  placeholder="5"
                  className="w-full rounded-xl bg-[#000000] border border-white/15 px-4 py-3 text-xs text-white focus:outline-none focus:border-white font-bold font-mono"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block font-mono">Episode Visibility *</label>
              <select
                value={epVisibility}
                onChange={(e) => setEpVisibility(e.target.value as any)}
                required
                className="w-full rounded-xl bg-[#000000] border border-white/15 px-4 py-3 text-xs text-white focus:outline-none focus:border-white font-mono"
              >
                <option value="public">🌍 Public (Anyone can watch)</option>
                <option value="private">🔒 Private (Only Admins can watch)</option>
              </select>
            </div>

            {/* Schedule Release Section */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#000000] border border-white/15 space-y-4">
              <label className="flex items-center gap-3 cursor-pointer text-xs sm:text-sm font-bold text-zinc-200 select-none font-mono">
                <input
                  type="checkbox"
                  checked={Boolean(epScheduledReleaseAt)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      const tomorrow = new Date(Date.now() + 86400000);
                      const yyyy = tomorrow.getFullYear();
                      const mm = String(tomorrow.getMonth() + 1).padStart(2, "0");
                      const dd = String(tomorrow.getDate()).padStart(2, "0");
                      const dateStr = `${yyyy}-${mm}-${dd}`;
                      const iso = new Date(`${dateStr}T20:30:00+05:30`).toISOString();
                      setEpScheduledReleaseAt(iso);
                    } else {
                      setEpScheduledReleaseAt(null);
                    }
                  }}
                  className="w-4 h-4 rounded bg-black border-white/20 text-white"
                />
                <span>📅 Schedule Release Date & Time</span>
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-4 rounded-full bg-white text-black hover:bg-zinc-200 font-black text-xs sm:text-sm shadow-[3px_3px_0px_rgba(255,255,255,0.25)] hover:scale-[1.01] transition-all flex items-center justify-center gap-2 font-display uppercase tracking-wider"
            >
              <Plus size={16} /> Publish Episode
            </button>
          </form>

          {/* Episodes List & Management */}
          <div className="rounded-3xl border-[1.5px] border-white/15 bg-[#0E0E0E] p-6 sm:p-8 space-y-6 shadow-[3px_3px_0px_rgba(0,0,0,0.8)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/15 pb-4">
              <div>
                <h3 className="text-xl font-black text-white flex items-center gap-2 font-display uppercase">
                  <Video size={20} className="text-white" /> Uploaded Episodes ({filteredEpisodes.length})
                </h3>
                <p className="text-xs text-zinc-400 mt-1 font-primary">Manage and edit your video library.</p>
              </div>

              <select
                value={epVisibilityFilter}
                onChange={(e) => setEpVisibilityFilter(e.target.value)}
                className="rounded-full bg-[#000000] border border-white/15 px-4 py-2 text-xs text-white focus:outline-none font-mono"
              >
                <option value="all">All Episodes</option>
                <option value="public">Public Only</option>
                <option value="private">Private Only</option>
              </select>
            </div>

            <div className="grid gap-3">
              {filteredEpisodes.map((ep: any) => (
                <div
                  key={ep._id || ep.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#000000] border border-white/15 hover:border-white transition-all shadow-md"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-white text-sm font-display">
                        Ep {ep.number}: {ep.title}
                      </span>
                      <span className="rounded-full bg-white/10 text-white border border-white/20 px-2.5 py-0.5 text-[10px] font-bold font-mono uppercase">
                        {ep.quality || "1080P"}
                      </span>
                      <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold font-mono uppercase bg-white/10 text-white border border-white/20">
                        {(ep.access || "free").toLowerCase() === "xp_coins" ? `💎 ${ep.xpCost || 5} XP` : "FREE"}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 truncate max-w-md mt-1 font-mono">{ep.rumbleEmbedUrl}</p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => setEditingEpisode(ep)}
                      className="px-4 py-2 rounded-full bg-[#141414] border border-white/15 hover:border-white text-xs font-bold text-white transition-all shadow-sm flex items-center gap-1.5 font-mono"
                    >
                      <Edit3 size={13} /> Edit
                    </button>
                    <button
                      onClick={() => requestDeleteEpisode(ep._id || ep.id)}
                      className="px-4 py-2 rounded-full bg-rose-500/10 border border-rose-500/30 hover:bg-rose-600 text-rose-300 hover:text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 font-mono"
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Edit Episode Modal */}
          {editingEpisode && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md p-4 flex items-center justify-center overflow-y-auto">
              <form onSubmit={updateEpisode} className="w-full max-w-xl bg-[#0E0E0E] border-[1.5px] border-white/20 rounded-3xl p-6 sm:p-8 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
                <h3 className="text-xl font-black text-white flex items-center gap-2 border-b border-white/15 pb-3 font-display uppercase">
                  <Edit3 size={18} className="text-white" /> Edit Episode #{editingEpisode.number}
                </h3>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300 font-mono">Episode Title</label>
                  <input
                    type="text"
                    required
                    value={editingEpisode.title || ""}
                    onChange={(e) => setEditingEpisode({ ...editingEpisode, title: e.target.value })}
                    className="w-full rounded-xl bg-[#000000] border border-white/15 px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white font-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300 font-mono">Rumble Embed URL</label>
                  <input
                    type="url"
                    required
                    value={editingEpisode.rumbleEmbedUrl || ""}
                    onChange={(e) => setEditingEpisode({ ...editingEpisode, rumbleEmbedUrl: e.target.value })}
                    className="w-full rounded-xl bg-[#000000] border border-white/15 px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 font-primary">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-300 font-mono">Quality</label>
                    <select
                      value={editingEpisode.quality || "1080P"}
                      onChange={(e) => setEditingEpisode({ ...editingEpisode, quality: e.target.value })}
                      className="w-full rounded-xl bg-[#000000] border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-white font-mono"
                    >
                      <option value="360P">360P</option>
                      <option value="480P">480P</option>
                      <option value="720P">720P</option>
                      <option value="1080P">1080P</option>
                      <option value="1440P">1440P</option>
                      <option value="2160P">2160P</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-300 font-mono">Access</label>
                    <select
                      value={(editingEpisode.access === "xp_coins" || editingEpisode.access === "premium") ? "xp_coins" : "free"}
                      onChange={(e) => setEditingEpisode({ ...editingEpisode, access: e.target.value })}
                      className="w-full rounded-xl bg-[#000000] border border-white/15 px-3 py-2 text-xs text-white font-bold font-mono"
                    >
                      <option value="free">FREE</option>
                      <option value="xp_coins">XP COINS</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/15">
                  <button
                    type="button"
                    onClick={() => setEditingEpisode(null)}
                    className="px-5 py-2.5 rounded-full bg-[#141414] border border-white/15 text-xs font-bold text-zinc-300 hover:text-white hover:border-white font-mono"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-black shadow-[2px_2px_0px_rgba(255,255,255,0.25)] font-display uppercase tracking-wider"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* 3. EPISODE VIEWS TAB */}
      {tab === "episode-views" && (
        <div className="mt-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0E0E0E] p-6 rounded-3xl border-[1.5px] border-white/15 shadow-[3px_3px_0px_rgba(0,0,0,0.8)]">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5 font-display uppercase">
                <span>👁</span> EPISODE VIEWS
              </h2>
              <p className="text-xs text-zinc-400 mt-1 font-primary">
                Live view statistics for individual episodes recorded from user playback starts.
              </p>
            </div>
            <div className="flex items-center gap-2 bg-[#000000] border border-white/15 px-4 py-2 rounded-full text-xs font-black text-white shrink-0 font-mono">
              <span>Total Episodes: {episodesList.length}</span>
            </div>
          </div>

          {episodesList.length > 0 ? (
            <div className="grid gap-3">
              {episodesList.map((ep: any) => (
                <div
                  key={ep._id || ep.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#000000] border border-white/15 hover:border-white transition-all shadow-md"
                >
                  <div className="space-y-1 min-w-0">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono">
                      {ep.seriesTitle || "Series"}
                    </p>
                    <h3 className="text-sm sm:text-base font-black text-white truncate font-display">
                      Episode {ep.number} — {ep.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                    <div className="px-4 py-2 rounded-full bg-[#0E0E0E] border border-white/20 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-inner font-mono">
                      <span>👁</span>
                      <span>{Number(ep.views || 0).toLocaleString()} Views</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-white/15 bg-[#000000] p-8 text-center text-zinc-400 text-xs font-semibold font-mono">
              No episode views data available yet.
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalState.isOpen}
        title={deleteModalState.title}
        message={deleteModalState.message}
        isDeleting={deleteModalState.isDeleting}
        onClose={() => setDeleteModalState({ isOpen: false, type: null, id: null, title: "", message: "", isDeleting: false })}
        onConfirm={handleConfirmDelete}
      />
    </main>
  );
}
