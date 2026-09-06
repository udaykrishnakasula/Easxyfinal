import React, { useState, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  LifeBuoy,
  Plus,
  Search,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  Headphones,
  Lock,
  ArrowRight,
  Inbox,
  Filter,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import {
  PageHeading,
  EasyXCard,
  EasyXButton,
  EasyXLoader,
  EasyXEmptyState,
} from "@/design/EasyX";
import {
  SupportStatusBadge,
  SupportPriorityBadge,
  SupportCategoryBadge,
} from "@/user/components/SupportStatusBadge";
import CreateTicketModal from "@/user/components/CreateTicketModal";
import TicketConversationView from "@/user/components/TicketConversationView";
import SupportFaqSection from "@/user/components/SupportFaqSection";
import SupportAiAssistant from "@/user/components/SupportAiAssistant";
import { useSupportTickets } from "@/user/api";

dayjs.extend(relativeTime);

const FILTER_TABS = [
  { id: "ALL", label: "All Tickets" },
  { id: "OPEN", label: "Open" },
  { id: "IN_PROGRESS", label: "In Progress" },
  { id: "WAITING", label: "Waiting" },
  { id: "RESOLVED", label: "Resolved" },
  { id: "CLOSED", label: "Closed" },
];

export default function SupportPage() {
  const { id: routeTicketId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Active subview or ticket
  const [selectedTicketId, setSelectedTicketId] = useState(routeTicketId || searchParams.get("ticket") || null);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "AI_ASSISTANT"); // "AI_ASSISTANT" | "MY_TICKETS" | "FAQ" | "INFO"
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createModalCategory, setCreateModalCategory] = useState("DEPOSIT");

  const { data: ticketsData, isLoading } = useSupportTickets();
  const tickets = ticketsData?.tickets || [];
  const unreadTotal = ticketsData?.unread_total || 0;

  const handleOpenCreateModal = (cat = "DEPOSIT") => {
    setCreateModalCategory(cat || "DEPOSIT");
    setCreateModalOpen(true);
  };

  // Keep route or query param in sync
  const handleSelectTicket = (ticketId) => {
    setSelectedTicketId(ticketId);
    if (ticketId) {
      setSearchParams({ ticket: ticketId });
    } else {
      setSearchParams({});
    }
  };

  const handleBackToList = () => {
    setSelectedTicketId(null);
    setSearchParams({});
  };

  const handleTicketCreated = (newTicket) => {
    if (newTicket?.id) {
      handleSelectTicket(newTicket.id);
    }
  };

  // Filter user tickets based on tab filter & search query
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      // Status filter
      let matchStatus = true;
      if (statusFilter === "OPEN") matchStatus = t.status === "OPEN";
      else if (statusFilter === "IN_PROGRESS") matchStatus = t.status === "IN_PROGRESS";
      else if (statusFilter === "WAITING") {
        matchStatus = t.status === "WAITING_FOR_USER" || t.status === "WAITING_FOR_ADMIN";
      } else if (statusFilter === "RESOLVED") matchStatus = t.status === "RESOLVED";
      else if (statusFilter === "CLOSED") matchStatus = t.status === "CLOSED";

      // Search filter
      const q = searchQuery.toLowerCase().trim();
      let matchQuery = true;
      if (q) {
        matchQuery =
          t.subject?.toLowerCase().includes(q) ||
          t.category?.toLowerCase().includes(q) ||
          t.id?.toLowerCase().includes(q) ||
          t.last_message_preview?.toLowerCase().includes(q);
      }

      return matchStatus && matchQuery;
    });
  }, [tickets, statusFilter, searchQuery]);

  // Counts for status tabs
  const statusCounts = useMemo(() => {
    const counts = { ALL: tickets.length, OPEN: 0, IN_PROGRESS: 0, WAITING: 0, RESOLVED: 0, CLOSED: 0 };
    tickets.forEach((t) => {
      if (t.status === "OPEN") counts.OPEN++;
      else if (t.status === "IN_PROGRESS") counts.IN_PROGRESS++;
      else if (t.status === "WAITING_FOR_USER" || t.status === "WAITING_FOR_ADMIN") counts.WAITING++;
      else if (t.status === "RESOLVED") counts.RESOLVED++;
      else if (t.status === "CLOSED") counts.CLOSED++;
    });
    return counts;
  }, [tickets]);

  // If a ticket is currently selected, show the conversation view
  if (selectedTicketId) {
    return (
      <div className="space-y-6" data-testid="support-detail-wrapper">
        <TicketConversationView
          ticketId={selectedTicketId}
          onBack={handleBackToList}
          onOpenCreateModal={() => setCreateModalOpen(true)}
        />
        <CreateTicketModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          onTicketCreated={handleTicketCreated}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="support-page">
      {/* Page Heading */}
      <PageHeading
        title="Support & Help Center"
        subtitle="Get direct 24/7 assistance for deposits, investments, KYC verification, and platform queries."
        icon={LifeBuoy}
        actions={
          <EasyXButton
            variant="accent"
            onClick={() => setCreateModalOpen(true)}
            className="h-10 px-4 text-xs font-semibold shadow-ex-btn"
            data-testid="open-create-ticket-modal-btn"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Create Ticket
          </EasyXButton>
        }
      />

      {/* Search Help & Quick Access Bar */}
      <EasyXCard className="p-4 sm:p-5">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ex-muted pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search FAQs, help topics, or your support tickets..."
            className="w-full h-11 rounded-ex-ctrl bg-white/5 border border-white/10 pl-10 pr-4 text-sm text-ex-text placeholder:text-ex-muted/60 focus:border-ex-lav-400 focus:outline-none transition"
            data-testid="support-search-input"
          />
        </div>
      </EasyXCard>

      {/* Main Support View Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab("AI_ASSISTANT")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-ex-ctrl transition ${
              activeTab === "AI_ASSISTANT"
                ? "bg-ex-accent text-ex-ink shadow-sm"
                : "text-ex-muted hover:bg-white/5 hover:text-ex-text"
            }`}
            data-testid="tab-ai-assistant"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI Support Assistant</span>
            <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300">
              24/7 Live
            </span>
          </button>

          <button
            onClick={() => setActiveTab("MY_TICKETS")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-ex-ctrl transition ${
              activeTab === "MY_TICKETS"
                ? "bg-ex-accent text-ex-ink shadow-sm"
                : "text-ex-muted hover:bg-white/5 hover:text-ex-text"
            }`}
            data-testid="tab-my-tickets"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>My Support Tickets</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                activeTab === "MY_TICKETS" ? "bg-black/20 text-ex-ink" : "bg-white/10 text-white/70"
              }`}
            >
              {tickets.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("FAQ")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-ex-ctrl transition ${
              activeTab === "FAQ"
                ? "bg-ex-accent text-ex-ink shadow-sm"
                : "text-ex-muted hover:bg-white/5 hover:text-ex-text"
            }`}
            data-testid="tab-faq"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span>Help Center & FAQ</span>
          </button>

          <button
            onClick={() => setActiveTab("INFO")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-ex-ctrl transition ${
              activeTab === "INFO"
                ? "bg-ex-accent text-ex-ink shadow-sm"
                : "text-ex-muted hover:bg-white/5 hover:text-ex-text"
            }`}
            data-testid="tab-support-info"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Support Info & Security</span>
          </button>
        </div>
      </div>

      {/* TAB CONTENT 0: AI ASSISTANT */}
      {activeTab === "AI_ASSISTANT" && (
        <SupportAiAssistant
          onOpenCreateTicket={(prefill) => {
            if (prefill?.category) setCreateModalCategory(prefill.category);
            setCreateModalOpen(true);
          }}
          onViewFaq={() => setActiveTab("FAQ")}
        />
      )}

      {/* TAB CONTENT 1: MY TICKETS */}
      {activeTab === "MY_TICKETS" && (
        <div className="space-y-4" data-testid="my-tickets-section">
          {/* Status Filter Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {FILTER_TABS.map((f) => {
              const count = statusCounts[f.id] || 0;
              const isSelected = statusFilter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id)}
                  className={`whitespace-nowrap px-3 py-1.5 text-xs font-medium rounded-full transition flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-ex-lav-400 text-ex-ink font-semibold"
                      : "bg-white/5 text-ex-muted hover:bg-white/10 hover:text-ex-text"
                  }`}
                  data-testid={`filter-${f.id.toLowerCase()}`}
                >
                  <span>{f.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected ? "bg-black/20 text-ex-ink font-bold" : "bg-white/10 text-white/60"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Tickets List */}
          {isLoading ? (
            <EasyXCard className="p-8">
              <EasyXLoader />
            </EasyXCard>
          ) : filteredTickets.length === 0 ? (
            <EasyXEmptyState
              icon={Inbox}
              title={
                tickets.length === 0
                  ? "No support tickets yet"
                  : "No tickets match your filter"
              }
              note={
                tickets.length === 0
                  ? "Have a question regarding your account, deposit, or investments? Open your first ticket."
                  : "Try clearing your search query or switching the status filter tab."
              }
              action={
                tickets.length === 0 ? (
                  <EasyXButton
                    variant="accent"
                    onClick={() => setCreateModalOpen(true)}
                    className="h-10 px-4 text-xs font-semibold"
                    data-testid="empty-create-ticket-btn"
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Create Ticket
                  </EasyXButton>
                ) : (
                  <button
                    onClick={() => {
                      setStatusFilter("ALL");
                      setSearchQuery("");
                    }}
                    className="ex-btn ex-btn-ghost h-9 px-3.5 text-xs text-ex-lav-300"
                  >
                    Reset Filters
                  </button>
                )
              }
            />
          ) : (
            <div className="space-y-3" data-testid="tickets-list">
              {filteredTickets.map((ticket) => {
                const hasUnread = ticket.unread_count > 0;
                return (
                  <div
                    key={ticket.id}
                    onClick={() => handleSelectTicket(ticket.id)}
                    className={`group cursor-pointer rounded-ex border p-4 sm:p-5 transition duration-200 ${
                      hasUnread
                        ? "bg-white/[0.05] border-ex-lav-400/50 hover:bg-white/[0.08]"
                        : "bg-white/[0.02] border-white/8 hover:border-white/15 hover:bg-white/[0.04]"
                    }`}
                    data-testid={`ticket-card-${ticket.id}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Left: Info */}
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-mono text-ex-lav-400 font-bold bg-white/5 px-2 py-0.5 rounded-ex-ctrl border border-white/8">
                            #{ticket.id.slice(-8).toUpperCase()}
                          </span>
                          <SupportCategoryBadge category={ticket.category} />
                          <SupportPriorityBadge priority={ticket.priority} />
                          {hasUnread && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-ex-lav-400 px-2 py-0.5 text-[10px] font-bold text-ex-ink animate-pulse">
                              {ticket.unread_count} new message{ticket.unread_count > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-bold text-ex-text group-hover:text-ex-lav-300 transition truncate">
                          {ticket.subject}
                        </h3>

                        {ticket.last_message_preview && (
                          <p className="text-xs text-ex-muted line-clamp-1">
                            <span className="text-ex-text/80 font-medium">Last message:</span>{" "}
                            {ticket.last_message_preview}
                          </p>
                        )}
                      </div>

                      {/* Right: Status & Action */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 border-white/5 pt-2 sm:pt-0">
                        <SupportStatusBadge status={ticket.status} />
                        <span className="text-[11px] text-ex-muted/70 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {dayjs(ticket.last_activity_at || ticket.created_at).fromNow()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 2: FAQ & HELP CENTER */}
      {activeTab === "FAQ" && (
        <SupportFaqSection
          searchQuery={searchQuery}
          onOpenCreateTicket={(cat) => handleOpenCreateModal(cat)}
        />
      )}

      {/* TAB CONTENT 3: IMPORTANT SUPPORT INFORMATION */}
      {activeTab === "INFO" && (
        <div className="space-y-4" data-testid="support-info-section">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Box 1: 24/7 Availability */}
            <EasyXCard className="p-5 flex flex-col justify-between">
              <div>
                <div className="grid h-10 w-10 place-items-center rounded-ex-ctrl bg-sky-500/15 text-sky-300 border border-sky-500/30 mb-3">
                  <Headphones className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-ex-text">24/7 Dedicated Support</h3>
                <p className="text-xs text-ex-muted mt-1 leading-relaxed">
                  Our operations and technical specialists review support tickets around the clock. Urgent priority tickets receive priority routing within minutes.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/8 text-[11px] text-sky-300 font-medium">
                Average First Response: &lt; 45 Mins
              </div>
            </EasyXCard>

            {/* Box 2: Anti-Phishing & Security Notice */}
            <EasyXCard className="p-5 flex flex-col justify-between border-amber-500/20 bg-amber-500/[0.02]">
              <div>
                <div className="grid h-10 w-10 place-items-center rounded-ex-ctrl bg-amber-500/15 text-amber-300 border border-amber-500/30 mb-3">
                  <Lock className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-amber-200">Anti-Phishing & Safety</h3>
                <p className="text-xs text-ex-muted mt-1 leading-relaxed">
                  EasyX staff will <strong>NEVER</strong> ask for your login password, private seed phrases, or 2FA codes. Only communicate through official support tickets on this portal.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/8 text-[11px] text-amber-300 font-medium">
                Zero-Trust Security Protected
              </div>
            </EasyXCard>

            {/* Box 3: Verification & KYC Turnaround */}
            <EasyXCard className="p-5 flex flex-col justify-between">
              <div>
                <div className="grid h-10 w-10 place-items-center rounded-ex-ctrl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 mb-3">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-ex-text">Direct Account Verification</h3>
                <p className="text-xs text-ex-muted mt-1 leading-relaxed">
                  Need expedited review on your KYC submission or deposit confirmation? Submit a ticket under the respective category for instant verification queue escalation.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/8 text-[11px] text-emerald-300 font-medium">
                Real-Time Blockchain Verification
              </div>
            </EasyXCard>
          </div>

          {/* Quick FAQ Box */}
          <EasyXCard className="p-5">
            <h4 className="text-sm font-bold text-ex-text mb-2">Need quick self-service answers?</h4>
            <p className="text-xs text-ex-muted leading-relaxed mb-4">
              Check out our Help Center & FAQ tab for step-by-step guides on deposits, minimum withdrawal requirements, investment tiers, and referral bonuses.
            </p>
            <button
              onClick={() => setActiveTab("FAQ")}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-ex-lav-300 hover:text-white transition"
            >
              Browse Help Center Guides <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </EasyXCard>
        </div>
      )}

      {/* Modal for creating a ticket */}
      <CreateTicketModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onTicketCreated={handleTicketCreated}
        defaultCategory={createModalCategory}
      />
    </div>
  );
}
