import React, { useState, useEffect, useRef } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { toast } from "sonner";
import {
  ArrowLeft,
  Send,
  CheckCheck,
  Check,
  Clock,
  User,
  ShieldAlert,
  HelpCircle,
  AlertCircle,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Lock,
  MessageSquare,
  Bot,
  Sparkles,
  Info,
  Star,
} from "lucide-react";
import { EasyXCard, EasyXButton, EasyXLoader } from "@/design/EasyX";
import {
  SupportStatusBadge,
  SupportPriorityBadge,
  SupportCategoryBadge,
} from "@/user/components/SupportStatusBadge";
import {
  useSupportTicket,
  useSendSupportMessage,
  useMarkSupportTicketRead,
  useCloseSupportTicket,
  useReopenSupportTicket,
  useRateSupportTicket,
} from "@/user/api";
import SupportAttachmentViewer from "@/shared/components/SupportAttachmentViewer";
import SupportAttachmentUploader, { uploadSupportFiles } from "@/shared/components/SupportAttachmentUploader";
import { apiError } from "@/shared/lib/api";

dayjs.extend(relativeTime);

export default function TicketConversationView({ ticketId, onBack, onOpenCreateModal }) {
  const { data, isLoading, isError, refetch } = useSupportTicket(ticketId);
  const sendMessage = useSendSupportMessage();
  const markRead = useMarkSupportTicketRead();
  const closeTicket = useCloseSupportTicket();
  const reopenTicket = useReopenSupportTicket();
  const rateTicket = useRateSupportTicket();

  const [messageInput, setMessageInput] = useState("");
  const [replyAttachments, setReplyAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [reopenReason, setReopenReason] = useState("");
  const [showReopenPrompt, setShowReopenPrompt] = useState(false);
  const [selectedRating, setSelectedRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [hasRatedLocally, setHasRatedLocally] = useState(false);
  const messagesEndRef = useRef(null);

  const ticket = data?.ticket;
  const messages = data?.messages || [];

  const handleRateSubmit = async () => {
    if (!ticketId || !selectedRating || rateTicket.isPending) return;
    try {
      await rateTicket.mutateAsync({
        ticketId,
        rating: selectedRating,
        comment: ratingComment.trim(),
      });
      setHasRatedLocally(true);
      toast.success("Thank you for your rating and feedback!");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to submit rating.");
    }
  };

  // Scroll to bottom whenever messages update
  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
    }
  };

  useEffect(() => {
    scrollToBottom(false);
  }, [messages?.length]);

  // Mark messages as read when viewing
  useEffect(() => {
    if (ticketId) {
      markRead.mutate(ticketId);
    }
  }, [ticketId, messages?.length]);

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if ((!messageInput.trim() && replyAttachments.length === 0) || sendMessage.isPending || isUploading) return;

    const text = messageInput.trim();
    const pendingAttachments = [...replyAttachments];

    setMessageInput("");
    setReplyAttachments([]);

    try {
      setIsUploading(true);
      let uploadedAttachmentIds = [];

      if (pendingAttachments.length > 0) {
        const rawFiles = pendingAttachments.map((a) => a.rawFile).filter(Boolean);
        if (rawFiles.length > 0) {
          const uploaded = await uploadSupportFiles(rawFiles, false);
          uploadedAttachmentIds = uploaded.map((u) => u.id);
        }
      }

      await sendMessage.mutateAsync({
        ticketId,
        message: text,
        attachments: uploadedAttachmentIds,
      });

      // Revoke preview URLs
      pendingAttachments.forEach((a) => {
        if (a.previewUrl) {
          try {
            URL.revokeObjectURL(a.previewUrl);
          } catch (err) {}
        }
      });

      scrollToBottom(true);
    } catch (err) {
      toast.error(apiError(err, "Failed to send message."));
      setMessageInput(text); // restore on error
      setReplyAttachments(pendingAttachments);
    } finally {
      setIsUploading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleConfirmClose = async () => {
    try {
      await closeTicket.mutateAsync({
        ticketId,
        feedback: "User confirmed issue resolved.",
      });
      toast.success("Thank you! Ticket has been closed.");
      refetch();
    } catch (err) {
      toast.error(apiError(err, "Failed to close ticket."));
    }
  };

  const handleReopen = async () => {
    try {
      await reopenTicket.mutateAsync({
        ticketId,
        reason: reopenReason.trim() || "User requested further assistance.",
      });
      setShowReopenPrompt(false);
      setReopenReason("");
      toast.success("Ticket has been reopened. A support specialist will review it promptly.");
      refetch();
    } catch (err) {
      toast.error(apiError(err, "Failed to reopen ticket."));
    }
  };

  if (isLoading) {
    return (
      <EasyXCard className="p-8">
        <EasyXLoader />
      </EasyXCard>
    );
  }

  if (isError || !ticket) {
    return (
      <EasyXCard className="p-8 text-center" data-testid="ticket-error-view">
        <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-ex-text">Ticket Not Found</h2>
        <p className="text-sm text-ex-muted mt-1">
          This support ticket could not be loaded or you do not have permission to view it.
        </p>
        <div className="mt-5 flex justify-center gap-3">
          {onBack && (
            <button onClick={onBack} className="ex-btn ex-btn-ghost h-10 px-4 text-xs">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to My Tickets
            </button>
          )}
        </div>
      </EasyXCard>
    );
  }

  const isResolved = ticket.status === "RESOLVED";
  const isClosed = ticket.status === "CLOSED";
  const isActive = !isClosed;

  return (
    <div className="flex flex-col space-y-4" data-testid="ticket-conversation-view">
      {/* Top Header Card */}
      <EasyXCard className="p-4 sm:p-5">
        <div className="flex flex-col gap-3">
          {/* Action Row */}
          <div className="flex items-center justify-between gap-2">
            {onBack && (
              <button
                onClick={onBack}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-ex-lav-300 hover:text-white transition px-2.5 py-1.5 rounded-ex-ctrl bg-white/5 border border-white/8 hover:bg-white/10"
                data-testid="back-to-tickets-btn"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Tickets
              </button>
            )}
            <div className="flex items-center gap-2">
              <SupportPriorityBadge priority={ticket.priority} />
              <SupportStatusBadge status={ticket.status} />
            </div>
          </div>

          {/* Ticket Title & Metadata */}
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-ex-muted mb-1">
              <span className="font-mono text-ex-lav-400 font-bold bg-white/5 px-2 py-0.5 rounded-ex-ctrl border border-white/8">
                #{ticket.id.slice(-8).toUpperCase()}
              </span>
              <SupportCategoryBadge category={ticket.category} />
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Created {dayjs(ticket.created_at).format("MMM D, YYYY h:mm A")}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-ex-text tracking-tight mt-1" data-testid="ticket-subject-title">
              {ticket.subject}
            </h2>
          </div>

          {/* Staff Assigned Notification (if any) */}
          {ticket.assigned_admin_name && (
            <div className="flex items-center gap-2 rounded-ex-ctrl bg-white/[0.03] border border-white/6 px-3 py-1.5 text-xs text-ex-muted">
              <User className="h-3.5 w-3.5 text-ex-lav-400" />
              <span>
                Assigned Specialist: <strong className="text-ex-text">{ticket.assigned_admin_name}</strong>
              </span>
            </div>
          )}
        </div>
      </EasyXCard>

      {/* RESOLVED TICKET PROMPT: "Was your issue resolved?" */}
      {isResolved && (
        <div
          className="rounded-ex border border-emerald-500/30 bg-emerald-500/10 p-4 sm:p-5 backdrop-blur-sm"
          data-testid="resolved-ticket-prompt"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-emerald-200">
                  Was your issue resolved?
                </h3>
                <p className="text-xs text-emerald-300/80 mt-0.5">
                  Our support team has marked this ticket as resolved. Please let us know if your inquiry is complete or if you require additional help.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
              <EasyXButton
                variant="accent"
                onClick={handleConfirmClose}
                loading={closeTicket.isPending}
                className="flex-1 sm:flex-initial h-9 px-4 text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-black shadow-none border-none"
                data-testid="confirm-resolve-yes-btn"
              >
                <Check className="mr-1.5 h-3.5 w-3.5" /> YES — Close ticket
              </EasyXButton>
              <button
                type="button"
                onClick={() => setShowReopenPrompt(true)}
                disabled={reopenTicket.isPending}
                className="flex-1 sm:flex-initial ex-btn ex-btn-ghost h-9 px-3.5 text-xs text-amber-300 hover:bg-amber-500/10 border-amber-500/30"
                data-testid="confirm-resolve-no-btn"
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> NO — Reopen ticket
              </button>
            </div>
          </div>

          {/* Optional Reopen Input Prompt */}
          {showReopenPrompt && (
            <div className="mt-4 pt-3 border-t border-emerald-500/20">
              <label className="block text-xs font-medium text-emerald-200 mb-1.5">
                Why was the issue not resolved? (Optional note for support specialist)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  placeholder="e.g. Deposit still pending on block explorer, please check..."
                  className="flex-1 h-9 rounded-ex-ctrl bg-black/40 border border-emerald-500/30 px-3 text-xs text-ex-text focus:outline-none focus:border-emerald-400 placeholder:text-ex-muted/60"
                  data-testid="reopen-reason-input"
                />
                <EasyXButton
                  variant="primary"
                  onClick={handleReopen}
                  loading={reopenTicket.isPending}
                  className="h-9 px-4 text-xs"
                  data-testid="submit-reopen-btn"
                >
                  Submit & Reopen
                </EasyXButton>
                <button
                  onClick={() => setShowReopenPrompt(false)}
                  className="ex-btn ex-btn-ghost h-9 px-3 text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Closed Notice Banner */}
      {isClosed && (
        <div
          className="rounded-ex border border-white/10 bg-white/[0.03] p-4 text-center"
          data-testid="closed-ticket-notice"
        >
          <div className="flex items-center justify-center gap-2 text-xs text-ex-muted">
            <Lock className="h-3.5 w-3.5 text-ex-muted" />
            <span>This ticket is closed and archived.</span>
          </div>
          {onOpenCreateModal && (
            <button
              onClick={onOpenCreateModal}
              className="mt-2 text-xs text-ex-lav-300 hover:text-white underline"
            >
              Need more help? Open a new support ticket
            </button>
          )}
        </div>
      )}

      {/* User Satisfaction Rating (CSAT) Section */}
      {(isResolved || isClosed) && (
        <div
          className="rounded-ex border border-amber-500/30 bg-amber-950/20 backdrop-blur-sm p-4 sm:p-5"
          data-testid="support-csat-rating-section"
        >
          {ticket?.rating || hasRatedLocally ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-amber-200">
                      Your Rating:
                    </span>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-3.5 w-3.5 ${
                            star <= (ticket?.rating || selectedRating)
                              ? "fill-amber-400 text-amber-400"
                              : "text-white/20"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-bold text-amber-300">
                      ({ticket?.rating || selectedRating}/5)
                    </span>
                  </div>
                  {(ticket?.rating_comment || (hasRatedLocally && ratingComment)) && (
                    <p className="text-xs text-amber-200/80 italic mt-1">
                      "{ticket?.rating_comment || ratingComment}"
                    </p>
                  )}
                </div>
              </div>
              <div className="text-[11px] text-amber-400/70 font-medium">
                Feedback Recorded • Thank you!
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-400" />
                  <h4 className="text-xs font-bold text-amber-200 uppercase tracking-wider">
                    Rate Your Support Experience
                  </h4>
                </div>
                <span className="text-[11px] text-amber-300/70">
                  How satisfied are you with the assistance provided?
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-full border border-amber-500/30">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = star <= (hoverRating || selectedRating);
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setSelectedRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-0.5 hover:scale-125 transition-transform focus:outline-none"
                        data-testid={`star-rating-btn-${star}`}
                        title={`${star} Star${star > 1 ? "s" : ""}`}
                      >
                        <Star
                          className={`h-5 w-5 transition-colors ${
                            active
                              ? "fill-amber-400 text-amber-400"
                              : "text-white/30 hover:text-amber-200"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
                <span className="text-xs font-semibold text-amber-300">
                  {hoverRating || selectedRating === 5
                    ? "⭐⭐⭐⭐⭐ Excellent"
                    : (hoverRating || selectedRating) === 4
                    ? "⭐⭐⭐⭐ Great"
                    : (hoverRating || selectedRating) === 3
                    ? "⭐⭐⭐ Good"
                    : (hoverRating || selectedRating) === 2
                    ? "⭐⭐ Fair"
                    : "⭐ Poor"}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <input
                  type="text"
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  placeholder="Leave an optional comment or note about our support..."
                  className="flex-1 h-9 rounded-ex-ctrl bg-black/40 border border-amber-500/30 px-3 text-xs text-ex-text focus:outline-none focus:border-amber-400 placeholder:text-amber-200/40"
                  data-testid="csat-rating-comment-input"
                />
                <EasyXButton
                  variant="primary"
                  onClick={handleRateSubmit}
                  loading={rateTicket.isPending}
                  className="h-9 px-4 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-black shadow-none border-none shrink-0"
                  data-testid="submit-csat-rating-btn"
                >
                  <Star className="mr-1.5 h-3.5 w-3.5 fill-black text-black" />
                  Submit Rating
                </EasyXButton>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Messages Thread Container */}
      <EasyXCard className="p-4 sm:p-6 flex flex-col flex-1 min-h-[420px] max-h-[640px] overflow-hidden">
        {/* Scrollable messages container */}
        <div
          className="flex-1 overflow-y-auto space-y-4 pr-1 scroll-smooth"
          data-testid="ticket-messages-thread"
        >
          {messages.length === 0 ? (
            <div className="py-12 text-center text-xs text-ex-muted">
              No messages in this ticket thread yet.
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isUser = msg.sender_type === "USER";
              const isSystem = msg.sender_type === "SYSTEM";

              if (isSystem) {
                return (
                  <div key={msg.id || idx} className="flex justify-center my-3" data-testid="system-message">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] border border-white/8 px-3.5 py-1 text-[11px] text-ex-muted">
                      <Info className="h-3 w-3 text-ex-lav-400" />
                      <span>{msg.message || msg.text}</span>
                      <span className="text-[10px] text-ex-muted/60">• {dayjs(msg.created_at).format("h:mm A")}</span>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id || idx}
                  className={`flex items-end gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}
                  data-testid={`message-${msg.sender_type.toLowerCase()}`}
                >
                  {/* Admin Avatar on Left */}
                  {!isUser && (
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ex-accent text-ex-ink font-bold text-xs ring-1 ring-white/10 shadow-sm">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div className={`max-w-[85%] sm:max-w-[75%] flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                    {/* Sender label */}
                    <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-ex-muted">
                      <span className="font-semibold text-ex-text">
                        {isUser ? "You" : msg.sender_name || "EasyX Support"}
                      </span>
                      {!isUser && (
                        <span className="rounded bg-ex-lav-400/20 px-1.5 py-0.2 text-[9px] font-bold text-ex-lav-300">
                          Staff Specialist
                        </span>
                      )}
                      <span>•</span>
                      <span>{dayjs(msg.created_at).format("h:mm A")}</span>
                    </div>

                    {/* Content Box */}
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                        isUser
                          ? "bg-ex-lav-400/20 text-white border border-ex-lav-400/30 rounded-br-sm"
                          : "bg-white/[0.06] text-ex-text border border-white/10 rounded-bl-sm"
                      }`}
                    >
                      {msg.message || msg.text}

                      {/* Attachments Viewer */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <SupportAttachmentViewer attachments={msg.attachments} />
                      )}
                    </div>

                    {/* Read indicator for user */}
                    {isUser && (
                      <div className="flex items-center gap-1 mt-1 px-1 text-[10px] text-ex-muted/70">
                        {msg.is_read || msg.read_status ? (
                          <>
                            <CheckCheck className="h-3 w-3 text-sky-400" />
                            <span>Read by staff</span>
                          </>
                        ) : (
                          <>
                            <Check className="h-3 w-3 text-ex-muted/50" />
                            <span>Delivered</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* User Avatar on Right */}
                  {isUser && (
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-ex-text font-semibold text-xs ring-1 ring-white/10">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply Box (Active Ticket) */}
        {isActive && (
          <div className="mt-4 pt-3 border-t border-white/8">
            <form onSubmit={handleSendMessage} className="space-y-2.5">
              <div className="relative">
                <textarea
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your reply to support here... (Press Ctrl+Enter to send)"
                  rows={3}
                  className="w-full rounded-ex-ctrl bg-white/5 border border-white/10 p-3 pr-24 text-sm text-ex-text placeholder:text-ex-muted/60 focus:border-ex-lav-400 focus:outline-none transition resize-none"
                  data-testid="reply-message-input"
                  disabled={sendMessage.isPending || isUploading}
                />
                <div className="absolute right-2.5 bottom-3">
                  <EasyXButton
                    type="submit"
                    variant="accent"
                    loading={sendMessage.isPending || isUploading}
                    disabled={!messageInput.trim() && replyAttachments.length === 0}
                    className="h-9 px-3.5 text-xs font-semibold shadow-sm"
                    data-testid="send-reply-btn"
                  >
                    <Send className="mr-1.5 h-3.5 w-3.5" /> Send
                  </EasyXButton>
                </div>
              </div>

              {/* Attachments Uploader */}
              <SupportAttachmentUploader
                files={replyAttachments}
                onChange={setReplyAttachments}
                disabled={sendMessage.isPending || isUploading}
                maxFiles={3}
                maxSizeMb={5}
                compact
              />

              <div className="flex items-center justify-between text-[11px] text-ex-muted px-1">
                <span>
                  Our specialist team actively monitors this thread 24/7.
                </span>
                <span className="hidden sm:inline">Ctrl + Enter to send</span>
              </div>
            </form>
          </div>
        )}
      </EasyXCard>
    </div>
  );
}
