import React, { useState, useMemo } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Eye,
  Edit,
  Trash2,
  BookOpen,
  Tag,
  Layers,
  TrendingUp,
  HelpCircle,
  Clock,
  Sparkles,
  ArrowUpDown,
  FileText,
  BarChart3,
  RefreshCw,
  Globe,
  Lock,
  ChevronDown,
  X,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

import {
  useAdminSupportFaqs,
  useAdminSupportFaqAnalytics,
  useAdminCreateSupportFaq,
  useAdminUpdateSupportFaq,
  useAdminToggleSupportFaqPublish,
  useAdminDeleteSupportFaq,
} from "@/admin/adminApi";
import {
  EasyXCard,
  EasyXButton,
  EasyXLoader,
  EasyXModal,
} from "@/design/EasyX";
import { SupportCategoryBadge } from "@/user/components/SupportStatusBadge";

dayjs.extend(relativeTime);

const FAQ_CATEGORIES = [
  { id: "ALL", label: "All Categories" },
  { id: "ACCOUNT", label: "Account" },
  { id: "LOGIN", label: "Login & Access" },
  { id: "DEPOSIT", label: "Deposit" },
  { id: "INVESTMENT", label: "Investment" },
  { id: "KYC", label: "KYC Verification" },
  { id: "WITHDRAWAL", label: "Withdrawal" },
  { id: "WALLET", label: "Wallet & Funds" },
  { id: "REFERRAL", label: "Referrals" },
  { id: "TECHNICAL", label: "Technical" },
  { id: "SUPPORT", label: "Support" },
];

export default function AdminFaqManager() {
  // Filters & Search
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL"); // "ALL" | "PUBLISHED" | "DRAFT"
  const [searchQuery, setSearchQuery] = useState("");
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);

  // Modal States
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState(null);
  const [deletingFaq, setDeletingFaq] = useState(null);

  // Form State for Create / Edit
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("DEPOSIT");
  const [formAnswer, setFormAnswer] = useState("");
  const [formKeywords, setFormKeywords] = useState("");
  const [formDisplayOrder, setFormDisplayOrder] = useState(10);
  const [formIsPublished, setFormIsPublished] = useState(true);

  // API Queries & Mutations
  const {
    data: faqsData,
    isLoading,
    isRefetching,
    refetch,
  } = useAdminSupportFaqs({
    category: categoryFilter !== "ALL" ? categoryFilter : undefined,
    status: statusFilter !== "ALL" ? statusFilter : undefined,
    search: searchQuery,
  });

  const { data: analyticsData } = useAdminSupportFaqAnalytics();
  const analytics = analyticsData?.analytics || {};

  const createMutation = useAdminCreateSupportFaq();
  const updateMutation = useAdminUpdateSupportFaq();
  const togglePublishMutation = useAdminToggleSupportFaqPublish();
  const deleteMutation = useAdminDeleteSupportFaq();

  const articles = faqsData?.faqs || [];
  const categoriesList = faqsData?.categories || [];

  // Open Create Modal
  const handleOpenCreate = () => {
    setFormTitle("");
    setFormCategory("DEPOSIT");
    setFormAnswer("");
    setFormKeywords("");
    setFormDisplayOrder(10);
    setFormIsPublished(true);
    setCreateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (faq) => {
    setEditingFaq(faq);
    setFormTitle(faq.title || "");
    setFormCategory(faq.category || "DEPOSIT");
    setFormAnswer(faq.answer || "");
    setFormKeywords((faq.keywords || []).join(", "));
    setFormDisplayOrder(faq.display_order ?? 10);
    setFormIsPublished(Boolean(faq.is_published));
  };

  // Handle Save (Create or Update)
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast.error("Question title is required.");
      return;
    }
    if (!formAnswer.trim()) {
      toast.error("Answer content is required.");
      return;
    }

    const parsedKeywords = String(formKeywords || "")
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    try {
      if (editingFaq) {
        await updateMutation.mutateAsync({
          id: editingFaq.id,
          title: formTitle.trim(),
          category: formCategory,
          answer: formAnswer.trim(),
          keywords: parsedKeywords,
          display_order: Number(formDisplayOrder),
          is_published: formIsPublished,
        });
        toast.success("FAQ article updated successfully.");
        setEditingFaq(null);
      } else {
        await createMutation.mutateAsync({
          title: formTitle.trim(),
          category: formCategory,
          answer: formAnswer.trim(),
          keywords: parsedKeywords,
          display_order: Number(formDisplayOrder),
          is_published: formIsPublished,
        });
        toast.success("FAQ article created successfully.");
        setCreateModalOpen(false);
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to save FAQ article.");
    }
  };

  // Handle Publish / Unpublish toggle
  const handleTogglePublish = async (faq) => {
    try {
      const nextState = !faq.is_published;
      await togglePublishMutation.mutateAsync({
        id: faq.id,
        is_published: nextState,
      });
      toast.success(
        `FAQ "${faq.title}" is now ${nextState ? "Published" : "Draft"}.`
      );
    } catch (err) {
      toast.error("Failed to update publish state.");
    }
  };

  // Handle Delete
  const handleConfirmDelete = async () => {
    if (!deletingFaq) return;
    try {
      await deleteMutation.mutateAsync(deletingFaq.id);
      toast.success("FAQ article deleted.");
      setDeletingFaq(null);
    } catch (err) {
      toast.error("Failed to delete article.");
    }
  };

  return (
    <div className="space-y-6" data-testid="admin-faq-manager">
      {/* Top Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-ex-surface p-3.5 bg-white/[0.03] border border-white/8">
          <div className="flex items-center justify-between text-xs text-ex-lav-400 font-medium mb-1">
            <span>Total Knowledge Articles</span>
            <BookOpen className="h-4 w-4" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {analytics.total_articles || articles.length}
          </div>
          <div className="text-[11px] text-white/50 mt-0.5">Across all categories</div>
        </div>

        <div className="rounded-ex-surface p-3.5 bg-white/[0.03] border border-white/8">
          <div className="flex items-center justify-between text-xs text-emerald-400 font-medium mb-1">
            <span>Published / Live</span>
            <Globe className="h-4 w-4" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-300 tracking-tight">
            {analytics.published_count ?? articles.filter((a) => a.is_published).length}
          </div>
          <div className="text-[11px] text-white/50 mt-0.5">Accessible to users</div>
        </div>

        <div className="rounded-ex-surface p-3.5 bg-white/[0.03] border border-white/8">
          <div className="flex items-center justify-between text-xs text-amber-400 font-medium mb-1">
            <span>Drafts / Internal</span>
            <Lock className="h-4 w-4" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-amber-300 tracking-tight">
            {analytics.draft_count ?? articles.filter((a) => !a.is_published).length}
          </div>
          <div className="text-[11px] text-white/50 mt-0.5">Hidden from user portal</div>
        </div>

        <div className="rounded-ex-surface p-3.5 bg-white/[0.03] border border-white/8">
          <div className="flex items-center justify-between text-xs text-sky-400 font-medium mb-1">
            <span>Total Article Views</span>
            <Eye className="h-4 w-4" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-sky-300 tracking-tight">
            {analytics.total_views || 0}
          </div>
          <div className="text-[11px] text-white/50 mt-0.5">Self-service engagements</div>
        </div>
      </div>

      {/* Control Bar: Search, Category, Status, Actions */}
      <EasyXCard className="p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ex-muted pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search FAQ questions, content, keywords..."
                className="w-full h-9 rounded-ex-ctrl bg-white/5 border border-white/10 pl-9 pr-3 text-xs text-white placeholder:text-ex-muted/60 focus:border-ex-lav-400 focus:outline-none transition"
                data-testid="admin-faq-search-input"
              />
            </div>

            {/* Category Select */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-9 rounded-ex-ctrl bg-white/5 border border-white/10 px-3 text-xs text-white focus:border-ex-lav-400 focus:outline-none transition"
              data-testid="admin-faq-category-select"
            >
              {FAQ_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id} className="bg-ex-surface text-white">
                  {cat.label}
                </option>
              ))}
            </select>

            {/* Status Select */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-ex-ctrl bg-white/5 border border-white/10 px-3 text-xs text-white focus:border-ex-lav-400 focus:outline-none transition"
              data-testid="admin-faq-status-select"
            >
              <option value="ALL" className="bg-ex-surface text-white">All Statuses</option>
              <option value="PUBLISHED" className="bg-ex-surface text-white">Published Only</option>
              <option value="DRAFT" className="bg-ex-surface text-white">Drafts Only</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAnalyticsModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-ex-ctrl bg-white/5 hover:bg-white/10 text-xs font-semibold text-ex-text border border-white/10 transition"
              data-testid="btn-open-faq-analytics"
            >
              <BarChart3 className="h-3.5 w-3.5 text-ex-lav-400" />
              <span>Search Insights</span>
            </button>

            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="p-2 rounded-ex-ctrl bg-white/5 hover:bg-white/10 text-ex-text border border-white/10 transition disabled:opacity-50"
              title="Refresh Articles"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin text-ex-lav-400" : ""}`} />
            </button>

            <EasyXButton
              variant="accent"
              size="sm"
              onClick={handleOpenCreate}
              className="h-9 font-semibold text-xs shadow-sm"
              data-testid="btn-create-faq-article"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" /> New Article
            </EasyXButton>
          </div>
        </div>
      </EasyXCard>

      {/* Articles Table / List */}
      {isLoading ? (
        <EasyXCard className="p-12 text-center">
          <EasyXLoader text="Loading FAQ knowledge base..." />
        </EasyXCard>
      ) : articles.length === 0 ? (
        <EasyXCard className="p-10 text-center">
          <BookOpen className="h-10 w-10 text-ex-muted mx-auto mb-3 opacity-40" />
          <h3 className="text-sm font-bold text-white">No FAQ articles found</h3>
          <p className="text-xs text-ex-muted mt-1 max-w-sm mx-auto">
            {searchQuery || categoryFilter !== "ALL" || statusFilter !== "ALL"
              ? "No articles matched your active search or filters."
              : "No knowledge base articles have been created yet."}
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            {(searchQuery || categoryFilter !== "ALL" || statusFilter !== "ALL") && (
              <EasyXButton
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setCategoryFilter("ALL");
                  setStatusFilter("ALL");
                }}
              >
                Reset Filters
              </EasyXButton>
            )}
            <EasyXButton variant="accent" size="sm" onClick={handleOpenCreate}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Create First Article
            </EasyXButton>
          </div>
        </EasyXCard>
      ) : (
        <div className="space-y-3">
          {articles.map((faq) => (
            <div
              key={faq.id}
              className={`rounded-ex-surface border p-4 sm:p-5 transition ${
                faq.is_published
                  ? "bg-white/[0.02] border-white/8 hover:border-white/15"
                  : "bg-amber-500/[0.02] border-amber-500/20"
              }`}
              data-testid={`admin-faq-card-${faq.id}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                {/* Left: Info */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <SupportCategoryBadge category={faq.category} size="xs" />
                    
                    {faq.is_published ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        <Globe className="h-2.5 w-2.5" /> Published
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        <Lock className="h-2.5 w-2.5" /> Draft (Hidden)
                      </span>
                    )}

                    <span className="text-[11px] text-ex-muted flex items-center gap-1">
                      <Eye className="h-3 w-3" /> {faq.views_count || 0} views
                    </span>

                    <span className="text-[11px] text-ex-muted">
                      Order: <strong className="text-white">{faq.display_order ?? 10}</strong>
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-semibold text-white tracking-tight">
                    {faq.title}
                  </h3>

                  <p className="text-xs text-ex-muted line-clamp-2 leading-relaxed">
                    {faq.answer}
                  </p>

                  {faq.keywords && faq.keywords.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap pt-1">
                      {faq.keywords.map((kw, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-ex-muted font-medium"
                        >
                          #{kw}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="text-[11px] text-ex-muted/70 flex items-center gap-3 pt-1">
                    <span>Updated {dayjs(faq.updated_at).fromNow()}</span>
                    <span>Created by {faq.created_by_name || "Admin"}</span>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1.5 shrink-0 border-t sm:border-t-0 border-white/5 pt-2 sm:pt-0">
                  <button
                    onClick={() => handleTogglePublish(faq)}
                    className={`px-2.5 py-1.5 rounded-ex-ctrl text-xs font-semibold border transition ${
                      faq.is_published
                        ? "bg-white/5 text-amber-300 border-amber-500/30 hover:bg-amber-500/10"
                        : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25"
                    }`}
                    title={faq.is_published ? "Unpublish to draft" : "Publish to live portal"}
                  >
                    {faq.is_published ? "Unpublish" : "Publish"}
                  </button>

                  <button
                    onClick={() => handleOpenEdit(faq)}
                    className="p-1.5 rounded-ex-ctrl bg-white/5 hover:bg-white/10 text-ex-text border border-white/10 transition"
                    title="Edit article"
                    data-testid={`btn-edit-faq-${faq.id}`}
                  >
                    <Edit className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => setDeletingFaq(faq)}
                    className="p-1.5 rounded-ex-ctrl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition"
                    title="Delete article"
                    data-testid={`btn-delete-faq-${faq.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      <EasyXModal
        open={createModalOpen || Boolean(editingFaq)}
        onOpenChange={(open) => {
          if (!open) {
            setCreateModalOpen(false);
            setEditingFaq(null);
          }
        }}
        title={editingFaq ? "Edit FAQ Article" : "Create New FAQ Article"}
      >
        <form onSubmit={handleSubmitForm} className="space-y-4" data-testid="faq-form">
          {/* Question Title */}
          <div>
            <label className="block text-xs font-semibold text-ex-text mb-1">
              Question Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="e.g. How long do USDT deposits take to be credited?"
              required
              className="w-full h-10 rounded-ex-ctrl bg-black/40 border border-white/15 px-3 text-xs text-white placeholder:text-ex-muted/60 focus:border-ex-lav-400 focus:outline-none transition"
              data-testid="input-faq-title"
            />
          </div>

          {/* Category & Order Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ex-text mb-1">
                Category <span className="text-red-400">*</span>
              </label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full h-10 rounded-ex-ctrl bg-black/40 border border-white/15 px-3 text-xs text-white focus:border-ex-lav-400 focus:outline-none transition"
                data-testid="select-faq-category"
              >
                {FAQ_CATEGORIES.filter((c) => c.id !== "ALL").map((cat) => (
                  <option key={cat.id} value={cat.id} className="bg-ex-surface text-white">
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ex-text mb-1">
                Display Order
              </label>
              <input
                type="number"
                value={formDisplayOrder}
                onChange={(e) => setFormDisplayOrder(e.target.value)}
                min="0"
                max="1000"
                className="w-full h-10 rounded-ex-ctrl bg-black/40 border border-white/15 px-3 text-xs text-white focus:border-ex-lav-400 focus:outline-none transition"
                data-testid="input-faq-display-order"
              />
            </div>
          </div>

          {/* Answer Content */}
          <div>
            <label className="block text-xs font-semibold text-ex-text mb-1">
              Answer Content <span className="text-red-400">*</span>
            </label>
            <textarea
              value={formAnswer}
              onChange={(e) => setFormAnswer(e.target.value)}
              rows={6}
              placeholder="Provide a clear, accurate, step-by-step answer for the user..."
              required
              className="w-full rounded-ex-ctrl bg-black/40 border border-white/15 p-3 text-xs text-white placeholder:text-ex-muted/60 focus:border-ex-lav-400 focus:outline-none transition leading-relaxed resize-y"
              data-testid="textarea-faq-answer"
            />
          </div>

          {/* Keywords / Tags */}
          <div>
            <label className="block text-xs font-semibold text-ex-text mb-1">
              Search Keywords & Synonyms (comma separated)
            </label>
            <input
              type="text"
              value={formKeywords}
              onChange={(e) => setFormKeywords(e.target.value)}
              placeholder="e.g. TRC20, BEP20, TxID, deposit delayed, confirmation"
              className="w-full h-10 rounded-ex-ctrl bg-black/40 border border-white/15 px-3 text-xs text-white placeholder:text-ex-muted/60 focus:border-ex-lav-400 focus:outline-none transition"
              data-testid="input-faq-keywords"
            />
            <p className="text-[11px] text-ex-muted mt-1">
              These terms help matching user queries in the instant Help Center search bar.
            </p>
          </div>

          {/* Publish Toggle */}
          <div className="flex items-center justify-between p-3 rounded-ex bg-white/5 border border-white/10">
            <div>
              <div className="text-xs font-semibold text-white">Publish Immediately</div>
              <div className="text-[11px] text-ex-muted">
                When enabled, article will appear live in the User Help Center.
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formIsPublished}
                onChange={(e) => setFormIsPublished(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-ex-lav-400"></div>
            </label>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/8">
            <EasyXButton
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setCreateModalOpen(false);
                setEditingFaq(null);
              }}
            >
              Cancel
            </EasyXButton>
            <EasyXButton
              type="submit"
              variant="accent"
              size="sm"
              loading={createMutation.isPending || updateMutation.isPending}
              data-testid="btn-submit-faq"
            >
              {editingFaq ? "Save Changes" : "Create Article"}
            </EasyXButton>
          </div>
        </form>
      </EasyXModal>

      {/* DELETE CONFIRMATION MODAL */}
      <EasyXModal
        open={Boolean(deletingFaq)}
        onOpenChange={(open) => !open && setDeletingFaq(null)}
        title="Delete FAQ Article"
      >
        <div className="space-y-4">
          <p className="text-xs text-ex-muted leading-relaxed">
            Are you sure you want to permanently delete the FAQ article:
            <strong className="text-white block mt-1">"{deletingFaq?.title}"</strong>?
          </p>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/8">
            <EasyXButton
              variant="outline"
              size="sm"
              onClick={() => setDeletingFaq(null)}
            >
              Cancel
            </EasyXButton>
            <EasyXButton
              variant="destructive"
              size="sm"
              loading={deleteMutation.isPending}
              onClick={handleConfirmDelete}
              data-testid="btn-confirm-delete-faq"
            >
              Delete Article
            </EasyXButton>
          </div>
        </div>
      </EasyXModal>

      {/* FAQ SEARCH INSIGHTS & ANALYTICS MODAL */}
      <EasyXModal
        open={showAnalyticsModal}
        onOpenChange={setShowAnalyticsModal}
        title="Help Center Search Insights & Analytics"
      >
        <div className="space-y-5">
          {/* Top Searches */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-ex-lav-400 mb-2 flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" /> Popular User Search Queries
            </h4>
            {analytics.top_searches && analytics.top_searches.length > 0 ? (
              <div className="space-y-1.5">
                {analytics.top_searches.map((s, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-ex bg-white/[0.03] border border-white/5 text-xs"
                  >
                    <span className="text-white font-medium">"{s.query}"</span>
                    <span className="text-ex-muted flex items-center gap-2">
                      <span>{s.count} searches</span>
                      <span className="text-emerald-400 text-[11px]">({s.results_count} results)</span>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-ex bg-white/[0.02] text-xs text-ex-muted text-center">
                No search queries logged yet.
              </div>
            )}
          </div>

          {/* Unmatched Searches (Knowledge Gaps) */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2 flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" /> Unmatched Searches (Knowledge Gaps)
            </h4>
            <p className="text-[11px] text-ex-muted mb-2">
              Queries where users received 0 results. Create articles for these topics to reduce ticket volume.
            </p>
            {analytics.unmatched_searches && analytics.unmatched_searches.length > 0 ? (
              <div className="space-y-1.5">
                {analytics.unmatched_searches.map((s, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-ex bg-amber-500/[0.04] border border-amber-500/20 text-xs"
                  >
                    <span className="text-amber-200 font-medium">"{s.query}"</span>
                    <span className="text-amber-400/80 font-bold">{s.count} times (0 results)</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-ex bg-white/[0.02] text-xs text-ex-muted text-center">
                No zero-result searches reported. Great coverage!
              </div>
            )}
          </div>

          {/* Most Viewed Articles */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-sky-400 mb-2 flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" /> Most Viewed Knowledge Articles
            </h4>
            {analytics.most_viewed_articles && analytics.most_viewed_articles.length > 0 ? (
              <div className="space-y-1.5">
                {analytics.most_viewed_articles.map((art) => (
                  <div
                    key={art.id}
                    className="flex items-center justify-between p-2.5 rounded-ex bg-white/[0.03] border border-white/5 text-xs"
                  >
                    <span className="text-white font-medium truncate max-w-[240px] sm:max-w-xs">
                      {art.title}
                    </span>
                    <span className="text-sky-300 font-bold flex items-center gap-1 shrink-0 ml-2">
                      <Eye className="h-3 w-3" /> {art.views_count} views
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-ex bg-white/[0.02] text-xs text-ex-muted text-center">
                No view metrics available.
              </div>
            )}
          </div>
        </div>
      </EasyXModal>
    </div>
  );
}
