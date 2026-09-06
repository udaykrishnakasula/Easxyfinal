import React, { useState, useMemo, useEffect } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  HelpCircle,
  Search,
  ChevronDown,
  ArrowDownToLine,
  ArrowUpFromLine,
  TrendingUp,
  ShieldCheck,
  KeyRound,
  LifeBuoy,
  MessageSquare,
  Sparkles,
  Eye,
  Clock,
  Tag,
  ThumbsUp,
  CheckCircle2,
  ExternalLink,
  Layers,
  Wallet,
  Share2,
  AlertTriangle,
  RotateCcw,
  BookOpen,
} from "lucide-react";
import { EasyXCard, EasyXButton, EasyXLoader } from "@/design/EasyX";
import { SupportCategoryBadge } from "@/user/components/SupportStatusBadge";
import { useSupportFaqs, useSupportFaqCategories, useRecordFaqView } from "@/user/api";

dayjs.extend(relativeTime);

const CATEGORY_ICONS = {
  ALL: Layers,
  ACCOUNT: KeyRound,
  LOGIN: KeyRound,
  DEPOSIT: ArrowDownToLine,
  INVESTMENT: TrendingUp,
  KYC: ShieldCheck,
  WITHDRAWAL: ArrowUpFromLine,
  WALLET: Wallet,
  REFERRAL: Share2,
  TECHNICAL: AlertTriangle,
  SUPPORT: LifeBuoy,
};

export default function SupportFaqSection({
  initialCategory = "ALL",
  initialSearch = "",
  onOpenCreateTicket,
}) {
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [openArticleId, setOpenArticleId] = useState(null);
  const [helpfulFeedback, setHelpfulFeedback] = useState({}); // { [faqId]: 'yes' | 'no' }

  // Sync if initial props change
  useEffect(() => {
    if (initialCategory) setSelectedCategory(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    if (initialSearch !== undefined) setSearchQuery(initialSearch);
  }, [initialSearch]);

  // Fetch FAQ articles from API
  const {
    data: faqData,
    isLoading,
    isError,
    refetch,
  } = useSupportFaqs({
    category: selectedCategory !== "ALL" ? selectedCategory : undefined,
    search: searchQuery,
  });

  const recordViewMutation = useRecordFaqView();

  const articles = faqData?.faqs || [];
  const popularArticles = faqData?.popular || [];
  const apiCategories = faqData?.categories || [];

  // Toggle accordion and record view
  const toggleAccordion = (id) => {
    if (openArticleId === id) {
      setOpenArticleId(null);
    } else {
      setOpenArticleId(id);
      recordViewMutation.mutate(id);
    }
  };

  const handleFeedback = (faqId, type) => {
    setHelpfulFeedback((prev) => ({ ...prev, [faqId]: type }));
  };

  const handleOpenRelated = (relatedId) => {
    // If related article is currently filtered out by category, switch to ALL
    setSelectedCategory("ALL");
    setOpenArticleId(relatedId);
    recordViewMutation.mutate(relatedId);
  };

  return (
    <div className="space-y-6" data-testid="support-faq-section">
      {/* Search Header Banner */}
      <EasyXCard className="p-5 sm:p-6 bg-gradient-to-br from-white/[0.04] to-ex-lav-400/[0.03] border-white/10">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-ex-lav-400 text-xs font-bold uppercase tracking-wider mb-1">
            <BookOpen className="h-4 w-4" />
            <span>Help Center & Knowledge Base</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            How can we help you today?
          </h2>
          <p className="text-xs sm:text-sm text-ex-muted mt-1 leading-relaxed">
            Search our comprehensive guides for instant answers to deposits, investment tiers, KYC verification, and wallet withdrawals.
          </p>

          {/* Search Input Box */}
          <div className="mt-4 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ex-muted pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by keywords (e.g. deposit confirmation, 2FA, plan unlock, minimum withdrawal)..."
              className="w-full h-11 rounded-ex-ctrl bg-black/40 border border-white/15 pl-10 pr-10 text-sm text-white placeholder:text-ex-muted/70 focus:border-ex-lav-400 focus:outline-none focus:ring-1 focus:ring-ex-lav-400/50 transition shadow-inner"
              data-testid="faq-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ex-muted hover:text-white px-1.5 py-0.5 rounded bg-white/10 transition"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Popular / Frequently Asked Quick Tags */}
        {popularArticles.length > 0 && !searchQuery && (
          <div className="mt-4 pt-3 border-t border-white/8">
            <div className="text-[11px] font-semibold text-ex-muted uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-ex-lav-400" />
              <span>Popular Questions</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {popularArticles.map((pop) => (
                <button
                  key={pop.id}
                  onClick={() => {
                    setSelectedCategory("ALL");
                    setOpenArticleId(pop.id);
                    recordViewMutation.mutate(pop.id);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-white/5 hover:bg-ex-lav-400/20 text-ex-text hover:text-white border border-white/10 hover:border-ex-lav-400/40 transition font-medium text-left"
                >
                  <span>{pop.title}</span>
                  <span className="text-[10px] text-ex-muted flex items-center gap-0.5">
                    <Eye className="h-2.5 w-2.5" />
                    {pop.views_count || 0}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </EasyXCard>

      {/* Category Pills Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setSelectedCategory("ALL")}
          className={`whitespace-nowrap px-3.5 py-2 text-xs font-semibold rounded-full transition flex items-center gap-1.5 ${
            selectedCategory === "ALL"
              ? "bg-ex-lav-400 text-ex-ink shadow-sm font-bold"
              : "bg-white/5 text-ex-muted hover:bg-white/10 hover:text-ex-text"
          }`}
          data-testid="category-filter-all"
        >
          <Layers className="h-3.5 w-3.5" />
          <span>All Topics</span>
        </button>

        {apiCategories.map((cat) => {
          const IconComp = CATEGORY_ICONS[cat.id] || LifeBuoy;
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`whitespace-nowrap px-3 py-2 text-xs font-semibold rounded-full transition flex items-center gap-1.5 ${
                isSelected
                  ? "bg-ex-lav-400 text-ex-ink shadow-sm font-bold"
                  : "bg-white/5 text-ex-muted hover:bg-white/10 hover:text-ex-text"
              }`}
              data-testid={`category-filter-${cat.id.toLowerCase()}`}
            >
              <IconComp className="h-3.5 w-3.5" />
              <span>{cat.label}</span>
              {cat.count > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    isSelected ? "bg-black/20 text-ex-ink" : "bg-white/10 text-white/70"
                  }`}
                >
                  {cat.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* FAQ Article List / Accordion */}
      {isLoading ? (
        <EasyXCard className="p-12 text-center">
          <EasyXLoader text="Loading Help Center articles..." />
        </EasyXCard>
      ) : isError ? (
        <EasyXCard className="p-8 text-center border-red-500/30 bg-red-500/5">
          <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-2" />
          <p className="text-sm font-bold text-white">Failed to load articles</p>
          <p className="text-xs text-ex-muted mt-1 mb-4">
            An error occurred while communicating with the support knowledge base.
          </p>
          <EasyXButton variant="outline" size="sm" onClick={() => refetch()}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Retry
          </EasyXButton>
        </EasyXCard>
      ) : articles.length === 0 ? (
        <EasyXCard className="p-8 sm:p-10 text-center">
          <HelpCircle className="h-10 w-10 text-ex-muted mx-auto mb-3 opacity-50" />
          <h3 className="text-sm font-bold text-white">No matching articles found</h3>
          <p className="text-xs text-ex-muted mt-1 max-w-md mx-auto leading-relaxed">
            {searchQuery
              ? `We couldn't find any guides matching "${searchQuery}". Try different keywords or contact our 24/7 support team.`
              : "No published articles are available in this category yet."}
          </p>

          <div className="mt-5 flex items-center justify-center gap-3">
            {searchQuery && (
              <EasyXButton
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("ALL");
                }}
              >
                Clear Search
              </EasyXButton>
            )}
            {onOpenCreateTicket && (
              <EasyXButton
                variant="accent"
                size="sm"
                onClick={() =>
                  onOpenCreateTicket(
                    selectedCategory !== "ALL" ? selectedCategory : "OTHER"
                  )
                }
              >
                <LifeBuoy className="mr-1.5 h-3.5 w-3.5" /> Open Support Ticket
              </EasyXButton>
            )}
          </div>
        </EasyXCard>
      ) : (
        <div className="space-y-3">
          {articles.map((faq) => {
            const isOpen = openArticleId === faq.id;
            const CatIcon = CATEGORY_ICONS[faq.category] || LifeBuoy;
            const feedback = helpfulFeedback[faq.id];

            return (
              <div
                key={faq.id}
                id={`faq-article-${faq.id}`}
                className={`rounded-ex-surface border transition-all duration-200 overflow-hidden ${
                  isOpen
                    ? "bg-white/[0.04] border-ex-lav-400/40 shadow-sm"
                    : "bg-white/[0.02] border-white/8 hover:border-white/15"
                }`}
              >
                {/* Accordion Toggle Header */}
                <button
                  type="button"
                  onClick={() => toggleAccordion(faq.id)}
                  className="w-full flex items-start sm:items-center justify-between gap-3 p-4 sm:p-5 text-left focus:outline-none"
                  data-testid={`faq-item-${faq.id}`}
                >
                  <div className="flex items-start gap-3 sm:gap-3.5 flex-1 min-w-0">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ex-lav-400/10 text-ex-lav-300 text-xs font-bold border border-ex-lav-400/20 mt-0.5 sm:mt-0">
                      <CatIcon className="h-3.5 w-3.5" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <SupportCategoryBadge category={faq.category} size="xs" />
                        <span className="text-[11px] text-ex-muted flex items-center gap-1">
                          <Eye className="h-3 w-3" /> {faq.views_count || 0} views
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-semibold text-white tracking-tight leading-snug">
                        {faq.title}
                      </h3>
                    </div>
                  </div>

                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-ex-muted transition-transform duration-200 mt-1 sm:mt-0 ${
                      isOpen ? "rotate-180 text-ex-lav-400" : ""
                    }`}
                  />
                </button>

                {/* Expanded Article Body */}
                {isOpen && (
                  <div className="px-4 sm:px-5 pb-5 pt-1 text-xs sm:text-sm text-ex-text/90 leading-relaxed border-t border-white/5 bg-white/[0.01]">
                    {/* Render Formatted Markdown / Plaintext Answer */}
                    <div className="prose prose-invert max-w-none text-xs sm:text-sm text-ex-muted/90 space-y-2.5 whitespace-pre-line">
                      {faq.answer}
                    </div>

                    {/* Keywords / Tags if present */}
                    {faq.keywords && faq.keywords.length > 0 && (
                      <div className="mt-4 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] uppercase font-bold text-ex-muted flex items-center gap-1 mr-1">
                          <Tag className="h-2.5 w-2.5" /> Tags:
                        </span>
                        {faq.keywords.map((kw, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSearchQuery(kw)}
                            className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[11px] text-ex-muted hover:text-white transition"
                          >
                            #{kw}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Related Articles Linking */}
                    {faq.related_articles && faq.related_articles.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-white/8">
                        <div className="text-xs font-semibold text-ex-lav-300 flex items-center gap-1.5 mb-2">
                          <BookOpen className="h-3.5 w-3.5" /> Related Articles:
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {faq.related_articles.map((rel) => (
                            <button
                              key={rel.id}
                              onClick={() => handleOpenRelated(rel.id)}
                              className="flex items-center justify-between p-2.5 rounded-ex bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-white/15 text-left transition group"
                            >
                              <span className="text-xs text-ex-text group-hover:text-white font-medium truncate">
                                {rel.title}
                              </span>
                              <ChevronDown className="h-3.5 w-3.5 -rotate-90 text-ex-muted group-hover:text-white shrink-0 ml-1.5" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Article Feedback & Direct Contact CTA */}
                    <div className="mt-5 pt-3.5 border-t border-white/8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-ex-muted">Was this article helpful?</span>
                        {feedback ? (
                          <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Thank you for your feedback!
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleFeedback(faq.id, "yes")}
                              className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-xs text-ex-text hover:text-emerald-300 border border-white/10 transition flex items-center gap-1"
                            >
                              <ThumbsUp className="h-3 w-3" /> Yes
                            </button>
                            <button
                              onClick={() => handleFeedback(faq.id, "no")}
                              className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-xs text-ex-muted hover:text-white border border-white/10 transition"
                            >
                              No
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-ex-muted flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Updated {dayjs(faq.updated_at).fromNow()}
                        </span>
                        {onOpenCreateTicket && (
                          <button
                            onClick={() => onOpenCreateTicket(faq.category)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-ex-lav-300 hover:text-white hover:underline transition"
                          >
                            <MessageSquare className="h-3.5 w-3.5" /> Still need help? Contact Support
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom 24/7 Support Escalation Banner */}
      <div className="rounded-ex-surface border border-white/10 bg-gradient-to-r from-ex-lav-400/10 via-white/[0.03] to-transparent p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <LifeBuoy className="h-4 w-4 text-ex-lav-400" /> Cannot find the answer you need?
          </h4>
          <p className="text-xs text-ex-muted mt-1 leading-relaxed max-w-xl">
            Our specialized human support desk operates 24/7 for deposit reconciliation, KYC priority handling, and investment inquiries.
          </p>
        </div>
        {onOpenCreateTicket && (
          <EasyXButton
            variant="accent"
            size="sm"
            onClick={() => onOpenCreateTicket(selectedCategory !== "ALL" ? selectedCategory : "OTHER")}
            className="shrink-0"
            data-testid="faq-footer-create-ticket-btn"
          >
            <LifeBuoy className="mr-1.5 h-3.5 w-3.5" /> Contact Support
          </EasyXButton>
        )}
      </div>
    </div>
  );
}
