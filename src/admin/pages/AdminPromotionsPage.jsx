import React, { useState } from "react";
import {
  Sparkles,
  Film,
  Image as ImageIcon,
  Plus,
  Trash2,
  Edit3,
  Eye,
  EyeOff,
  CheckCircle2,
  ExternalLink,
  RotateCcw,
  ArrowRight,
  ChevronUp,
  ChevronDown,
  Layers,
  Info,
  Play,
  Volume2,
  Sliders,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  useAdminPromotions,
  useCreateAdminPromotion,
  useUpdateAdminPromotion,
  useSetAdminPromotionStatus,
  useDeleteAdminPromotion,
  useReorderAdminPromotions,
  useResetAdminPromotions,
} from "@/admin/adminApi";
import {
  PageHeading,
  EasyXCard,
  EasyXButton,
  EasyXLoader,
  EasyXEmptyState,
} from "@/design/EasyX";

const BADGE_COLORS = [
  { value: "violet", label: "Violet (Default)", class: "bg-violet-500/20 text-violet-300 border-violet-500/30" },
  { value: "amber", label: "Amber (Gold / High Yield)", class: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  { value: "emerald", label: "Emerald (Bonus / Commission)", class: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  { value: "sky", label: "Sky (Info / Protocol)", class: "bg-sky-500/20 text-sky-300 border-sky-500/30" },
  { value: "rose", label: "Rose (Hot / Limited)", class: "bg-rose-500/20 text-rose-300 border-rose-500/30" },
];

const PRESET_MEDIA = [
  { label: "EasyX 3D Gold Coin (Video)", type: "video", url: "/gemini_generated_video_78da6d75.mp4" },
  { label: "EasyX Vault & Matrix (Video)", type: "video", url: "/gemini_generated_video_ce8e299d.mp4" },
  { label: "Classic Coin Loop (Video)", type: "video", url: "/coin.mp4" },
  { label: "EasyX 3D Emblem (Image)", type: "image", url: "/Easyx3dcoin.png" },
  { label: "EasyX Gold Coin Token (Image)", type: "image", url: "/coin.png" },
  { label: "Hero Graphic Asset (Image)", type: "image", url: "/1787643065508.png" },
];

export default function AdminPromotionsPage() {
  const { data: promotions, isLoading, refetch } = useAdminPromotions();
  const createMutation = useCreateAdminPromotion();
  const updateMutation = useUpdateAdminPromotion();
  const statusMutation = useSetAdminPromotionStatus();
  const deleteMutation = useDeleteAdminPromotion();
  const reorderMutation = useReorderAdminPromotions();
  const resetMutation = useResetAdminPromotions();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [previewMedia, setPreviewMedia] = useState(null);

  // Form State
  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    media_type: "video",
    media_url: "/gemini_generated_video_78da6d75.mp4",
    thumbnail_url: "",
    badge_text: "Special Event",
    badge_color: "violet",
    cta_text: "Explore Now",
    cta_link: "/investments",
    status: "PUBLISHED",
  });

  const openCreateModal = () => {
    setEditingItem(null);
    setForm({
      title: "",
      subtitle: "",
      media_type: "video",
      media_url: "/gemini_generated_video_78da6d75.mp4",
      thumbnail_url: "",
      badge_text: "Special Event",
      badge_color: "amber",
      cta_text: "Explore Now",
      cta_link: "/investments",
      status: "PUBLISHED",
    });
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setForm({
      title: item.title || "",
      subtitle: item.subtitle || "",
      media_type: item.media_type || "image",
      media_url: item.media_url || "",
      thumbnail_url: item.thumbnail_url || "",
      badge_text: item.badge_text || "Featured",
      badge_color: item.badge_color || "violet",
      cta_text: item.cta_text || "Learn More",
      cta_link: item.cta_link || "/dashboard",
      status: item.status || "PUBLISHED",
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Please enter a promotion title.");
      return;
    }
    if (!form.media_url.trim()) {
      toast.error("Please enter a media URL.");
      return;
    }

    try {
      if (editingItem) {
        await updateMutation.mutateAsync({
          id: editingItem.id,
          ...form,
        });
        toast.success("Promotional media updated successfully!");
      } else {
        await createMutation.mutateAsync(form);
        toast.success("Promotional media created successfully!");
      }
      setModalOpen(false);
      setEditingItem(null);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to save promotional media.");
    }
  };

  const handleToggleStatus = async (item) => {
    const nextStatus = item.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    try {
      await statusMutation.mutateAsync({
        id: item.id,
        status: nextStatus,
      });
      toast.success(
        nextStatus === "PUBLISHED"
          ? `"${item.title}" is now LIVE on the user dashboard.`
          : `"${item.title}" unpublished and hidden from user dashboard.`
      );
    } catch (err) {
      toast.error("Failed to toggle promotion status.");
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Promotion deleted.");
    } catch (err) {
      toast.error("Failed to delete promotion.");
    }
  };

  const handleMove = async (index, direction) => {
    if (!promotions) return;
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= promotions.length) return;

    const newOrder = [...promotions];
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIdx];
    newOrder[targetIdx] = temp;

    try {
      await reorderMutation.mutateAsync(newOrder.map((i) => i.id));
      toast.success("Display order updated.");
    } catch (err) {
      toast.error("Failed to reorder promotions.");
    }
  };

  const handleResetDefaults = async () => {
    if (!window.confirm("Reset all promotional media items to system default samples?")) return;
    try {
      await resetMutation.mutateAsync();
      toast.success("Promotions reset to defaults.");
    } catch (err) {
      toast.error("Failed to reset promotions.");
    }
  };

  const publishedCount = (promotions || []).filter((p) => p.status === "PUBLISHED").length;

  return (
    <div data-testid="admin-promotions-page" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <PageHeading
            eyebrow="Marketing & Engagement"
            title="Promotional Media Carousel"
            description="Manage video and image banners displayed on the User Dashboard between Investment Plans and Live Activity."
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <EasyXButton
            variant="ghost"
            size="sm"
            onClick={handleResetDefaults}
            disabled={resetMutation.isPending}
            className="text-xs text-ex-muted hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Reset Defaults
          </EasyXButton>
          <EasyXButton
            size="sm"
            onClick={openCreateModal}
            data-testid="btn-create-promotion"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            New Promotion
          </EasyXButton>
        </div>
      </div>

      {/* Status Summary Banner */}
      <div className="rounded-2xl border border-white/8 bg-[#15141d]/80 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">Dashboard Carousel Status</span>
              {publishedCount > 0 ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active ({publishedCount} live)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Hidden (0 published items)
                </span>
              )}
            </div>
            <p className="text-xs text-ex-muted mt-0.5">
              {publishedCount > 0
                ? "The carousel is active and cycling published media on user dashboards."
                : "The carousel automatically remains completely hidden on the user dashboard when no items are published."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-ex-muted">
          <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/8">
            Total Items: <strong className="text-white font-semibold">{promotions?.length || 0}</strong>
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/8">
            Published: <strong className="text-emerald-400 font-semibold">{publishedCount}</strong>
          </span>
        </div>
      </div>

      {/* Main Content / List */}
      {isLoading ? (
        <EasyXLoader className="py-20" />
      ) : !promotions || promotions.length === 0 ? (
        <EasyXCard className="p-8 sm:p-12 text-center">
          <EasyXEmptyState
            icon={Film}
            title="No promotional media created"
            note="Create your first image or video promotion to display in the user dashboard carousel."
          />
          <div className="mt-4 flex justify-center">
            <EasyXButton onClick={openCreateModal}>
              <Plus className="h-4 w-4 mr-1.5" />
              Create First Promotion
            </EasyXButton>
          </div>
        </EasyXCard>
      ) : (
        <div className="space-y-3">
          {promotions.map((item, index) => {
            const isPublished = item.status === "PUBLISHED";
            return (
              <div
                key={item.id}
                data-testid={`admin-promotion-row-${item.id}`}
                className={`rounded-2xl border transition-all duration-200 p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                  isPublished
                    ? "bg-[#161520] border-white/10 shadow-lg"
                    : "bg-[#111016]/80 border-white/5 opacity-75"
                }`}
              >
                {/* Left: Media Thumbnail + Details */}
                <div className="flex items-start sm:items-center gap-4 min-w-0 flex-1">
                  {/* Reorder buttons */}
                  <div className="flex flex-col gap-1 shrink-0 text-ex-muted">
                    <button
                      type="button"
                      disabled={index === 0 || reorderMutation.isPending}
                      onClick={() => handleMove(index, -1)}
                      className="p-1 rounded hover:bg-white/10 hover:text-white disabled:opacity-20 transition-all"
                      title="Move up"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={index === promotions.length - 1 || reorderMutation.isPending}
                      onClick={() => handleMove(index, 1)}
                      className="p-1 rounded hover:bg-white/10 hover:text-white disabled:opacity-20 transition-all"
                      title="Move down"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Thumbnail / Video badge */}
                  <div className="relative h-18 w-28 sm:h-20 sm:w-32 rounded-xl overflow-hidden bg-black/60 border border-white/10 shrink-0 group/thumb">
                    {item.media_type === "video" ? (
                      <video
                        src={item.media_url}
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src={item.media_url}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      {item.media_type === "video" ? (
                        <span className="p-1 rounded-full bg-black/60 border border-white/20 text-white/90">
                          <Play className="h-3.5 w-3.5 fill-white" />
                        </span>
                      ) : (
                        <span className="p-1 rounded-full bg-black/60 border border-white/20 text-white/90">
                          <ImageIcon className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Text Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-white text-sm sm:text-base truncate">
                        {item.title}
                      </h4>
                      {item.badge_text && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-500/15 text-violet-300 border border-violet-500/30">
                          {item.badge_text}
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                          isPublished
                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                            : "bg-white/5 text-white/50 border border-white/10"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    {item.subtitle && (
                      <p className="text-xs text-ex-muted mt-1 line-clamp-1">
                        {item.subtitle}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-ex-muted">
                      <span className="flex items-center gap-1">
                        <span className="font-medium text-white/70">Type:</span>{" "}
                        <span className="capitalize">{item.media_type}</span>
                      </span>
                      {item.cta_text && (
                        <span className="flex items-center gap-1">
                          <span className="font-medium text-white/70">CTA:</span>{" "}
                          <code className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/80">
                            {item.cta_text} → {item.cta_link}
                          </code>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(item)}
                    disabled={statusMutation.isPending}
                    data-testid={`btn-toggle-status-${item.id}`}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      isPublished
                        ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/25 hover:bg-emerald-500/20"
                        : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
                    }`}
                  >
                    {isPublished ? (
                      <>
                        <Eye className="h-3.5 w-3.5" />
                        <span>Published</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-3.5 w-3.5" />
                        <span>Draft</span>
                      </>
                    )}
                  </button>

                  <EasyXButton
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditModal(item)}
                    data-testid={`btn-edit-promotion-${item.id}`}
                    className="h-8 px-2.5 text-xs text-white/80 hover:text-white"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </EasyXButton>

                  <EasyXButton
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(item.id, item.title)}
                    disabled={deleteMutation.isPending}
                    data-testid={`btn-delete-promotion-${item.id}`}
                    className="h-8 px-2.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </EasyXButton>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal Dialog */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div
            data-testid="promotion-editor-modal"
            className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#161522] p-6 shadow-2xl space-y-5 my-8"
          >
            <div className="flex items-center justify-between border-b border-white/8 pb-3.5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-400" />
                <h3 className="font-bold text-lg text-white">
                  {editingItem ? "Edit Promotional Media" : "Create New Promotional Media"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-ex-muted hover:text-white hover:bg-white/10 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-white/90 mb-1">
                  Promotion Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Diamond Staking Boost — 20% Extra Yield"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500"
                />
              </div>

              {/* Subtitle / Description */}
              <div>
                <label className="block text-xs font-semibold text-white/90 mb-1">
                  Description / Subtitle
                </label>
                <textarea
                  rows={2}
                  value={form.subtitle}
                  onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                  placeholder="e.g. Exclusive limited-time yield epoch. Earn instant daily rewards streamed directly to your wallet balance."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500"
                />
              </div>

              {/* Media Type & URL */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-white/90 mb-1">
                    Media Format
                  </label>
                  <select
                    value={form.media_type}
                    onChange={(e) => setForm({ ...form, media_type: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500"
                  >
                    <option value="video">Video (MP4 / WebM)</option>
                    <option value="image">Image (PNG / JPG / WebP)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-white/90 mb-1">
                    Media URL / Asset <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.media_url}
                    onChange={(e) => setForm({ ...form, media_url: e.target.value })}
                    placeholder="/gemini_generated_video_78da6d75.mp4 or https://..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500 font-mono text-xs"
                  />
                </div>
              </div>

              {/* Quick Preset Selector */}
              <div>
                <label className="block text-[11px] font-medium text-ex-muted mb-1.5">
                  Quick Select Workspace Assets:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_MEDIA.map((preset) => (
                    <button
                      key={preset.url}
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          media_type: preset.type,
                          media_url: preset.url,
                        })
                      }
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 hover:text-white transition-all flex items-center gap-1"
                    >
                      {preset.type === "video" ? (
                        <Film className="h-3 w-3 text-violet-400" />
                      ) : (
                        <ImageIcon className="h-3 w-3 text-emerald-400" />
                      )}
                      <span>{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Badge Text & Color */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-white/90 mb-1">
                    Top Badge Text
                  </label>
                  <input
                    type="text"
                    value={form.badge_text}
                    onChange={(e) => setForm({ ...form, badge_text: e.target.value })}
                    placeholder="e.g. Special Staking Event"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/90 mb-1">
                    Badge Color Theme
                  </label>
                  <select
                    value={form.badge_color}
                    onChange={(e) => setForm({ ...form, badge_color: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500"
                  >
                    {BADGE_COLORS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* CTA Button Text & Link */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-white/90 mb-1">
                    Action Button Label
                  </label>
                  <input
                    type="text"
                    value={form.cta_text}
                    onChange={(e) => setForm({ ...form, cta_text: e.target.value })}
                    placeholder="e.g. Explore Plans"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/90 mb-1">
                    Action Target Route / URL
                  </label>
                  <input
                    type="text"
                    value={form.cta_link}
                    onChange={(e) => setForm({ ...form, cta_link: e.target.value })}
                    placeholder="e.g. /investments or /wallet"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500 font-mono text-xs"
                  />
                </div>
              </div>

              {/* Publication Status */}
              <div>
                <label className="block text-xs font-semibold text-white/90 mb-1">
                  Publication Status
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-white">
                    <input
                      type="radio"
                      name="status"
                      value="PUBLISHED"
                      checked={form.status === "PUBLISHED"}
                      onChange={() => setForm({ ...form, status: "PUBLISHED" })}
                      className="accent-violet-500"
                    />
                    <span>Published (Active on Dashboard)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-ex-muted">
                    <input
                      type="radio"
                      name="status"
                      value="DRAFT"
                      checked={form.status === "DRAFT"}
                      onChange={() => setForm({ ...form, status: "DRAFT" })}
                      className="accent-violet-500"
                    />
                    <span>Draft (Hidden from Dashboard)</span>
                  </label>
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="rounded-xl border border-white/10 bg-black/40 p-3 space-y-2">
                <div className="flex items-center justify-between text-xs text-ex-muted">
                  <span className="font-semibold text-white/90">Card Live Preview:</span>
                  <span className="capitalize">{form.media_type} Preview</span>
                </div>
                <div className="h-36 w-full rounded-lg overflow-hidden bg-black/60 relative flex items-center justify-center">
                  {form.media_type === "video" ? (
                    <video
                      src={form.media_url}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={form.media_url}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/30 text-violet-200 border border-violet-500/40 backdrop-blur-md">
                    {form.badge_text || "Badge"}
                  </div>
                  <div className="absolute bottom-2 left-2 right-2 text-left bg-black/70 p-2 rounded backdrop-blur-md">
                    <div className="text-xs font-bold text-white truncate">
                      {form.title || "Promotion Title"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/8">
                <EasyXButton
                  type="button"
                  variant="ghost"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </EasyXButton>
                <EasyXButton
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  <Check className="h-4 w-4 mr-1.5" />
                  {editingItem ? "Save Changes" : "Publish Promotion"}
                </EasyXButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
