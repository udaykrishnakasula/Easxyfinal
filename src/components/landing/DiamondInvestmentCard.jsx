import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import React, {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import dayjs from "dayjs";
import { CARD_DATA, CARD_THEMES } from "./investment-card-themes";

// -----------------------------------------------------------------------------
// InvestmentCard
// One physical 3D luxury card model, four materials: silver, gold, diamond,
// platinum. Supports dynamic per-investment lock period, progress, and certificates.
// -----------------------------------------------------------------------------

let globalServerOffsetMs = 0;
export function syncServerTime(serverIsoString) {
  if (!serverIsoString) return;
  const serverMs = new Date(serverIsoString).getTime();
  if (!isNaN(serverMs)) {
    globalServerOffsetMs = serverMs - Date.now();
  }
}

// Resting tilt — a premium, off-axis viewing angle.
const REST_X = -8;
const REST_Y = -14;

// Tiny inline noise texture for a subtle grain overlay.
const NOISE_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'>
      <filter id='n'>
        <feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/>
        <feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.5 0'/>
      </filter>
      <rect width='100%' height='100%' filter='url(#n)' opacity='0.55'/>
    </svg>`,
  );

function CardFace({ children, back = false, theme }) {
  return (
    <div
      className="absolute inset-0 overflow-hidden rounded-[24px]"
      style={{
        transform: back ? "rotateY(180deg)" : undefined,
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        // Faceted material finish: conic facets + tints + base.
        backgroundImage: theme.faceBackground,
        boxShadow: theme.faceShadow,
      }}
    >
      {/* Prismatic fire — slow drifting reflections */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: theme.prismatic,
          backgroundSize: "220% 100%",
          mixBlendMode: theme.prismaticBlend,
          opacity: theme.prismaticOpacity,
          filter: "blur(4px)",
        }}
        animate={{ backgroundPositionX: ["0%", "100%", "0%"] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Sparkle points — rendered only on front face to conserve GPU memory */}
      {!back &&
        [
          { top: "14%", left: "22%", d: 0 },
          { top: "32%", left: "78%", d: 1.1 },
          { top: "58%", left: "18%", d: 2.2 },
          { top: "72%", left: "62%", d: 0.6 },
          { top: "22%", left: "54%", d: 1.7 },
          { top: "82%", left: "88%", d: 2.8 },
        ].map((s, i) => (
          <motion.span
            key={i}
            aria-hidden
            className="pointer-events-none absolute rounded-full"
            style={{
              top: s.top,
              left: s.left,
              width: 3,
              height: 3,
              background: theme.sparkleBackground,
              boxShadow: theme.sparkleShadow,
              mixBlendMode: "screen",
              willChange: "opacity, transform",
            }}
            animate={{ opacity: [0.2, 0.9, 0.2], scale: [0.8, 1.2, 0.8] }}
            transition={{
              duration: 3 + (i % 3) * 0.8,
              repeat: Infinity,
              delay: s.d,
              ease: "easeInOut",
            }}
          />
        ))}

      {/* Noise grain */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-overlay"
        style={{ backgroundImage: `url("${NOISE_SVG}")` }}
      />
      {children}
    </div>
  );
}

function ProgressRing({ value, theme }) {
  const size = 56;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const rawId = useId();
  const gradientId = `ring-${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const clamped = Math.max(0, Math.min(100, Number(value) || 0));
  const offset = c - (clamped / 100) * c;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={theme.ringTrack}
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(.22,.61,.36,1)" }}
        />
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={theme.ringFrom} />
            <stop offset="100%" stopColor={theme.ringTo} />
          </linearGradient>
        </defs>
      </svg>
      <div
        className="absolute inset-0 grid place-items-center text-[11px] font-semibold tracking-wide"
        style={{ color: theme.value }}
      >
        {Math.round(value)}%
      </div>
    </div>
  );
}

function StatusPill({ label, theme }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] backdrop-blur-md"
      style={{
        borderColor: theme.pillBorder,
        background: theme.pillBg,
        color: theme.pillInk,
      }}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-70" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
      </span>
      {label}
    </span>
  );
}

// Highlight layer that tracks rotation for realistic lighting shift.
function DynamicHighlight({ rx, ry, theme }) {
  const stops =
    theme?.highlightStops ||
    "rgba(255,255,255,0.6) 0%, rgba(210,240,255,0.14) 40%, rgba(255,255,255,0) 70%";

  const background = useTransform(rx, (currRx) => {
    let currRy = 0;
    try {
      if (ry && typeof ry.get === "function") {
        currRy = Number(ry.get()) || 0;
      }
    } catch {
      currRy = 0;
    }
    const valRx = Number(currRx) || 0;
    const x = Math.max(0, Math.min(100, 50 - currRy * 0.25));
    const y = Math.max(0, Math.min(100, 50 + valRx * 0.25));
    return `radial-gradient(60% 45% at ${x}% ${y}%, ${stops})`;
  });

  return (
    <motion.div
      className="pointer-events-none absolute inset-0 rounded-[24px] mix-blend-screen"
      style={{ background }}
    />
  );
}

function gradientText(image) {
  return {
    background: image,
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
  };
}

const floatVariants = {
  idle: {
    y: [0, -6, 0],
    transition: { duration: 6, repeat: Infinity, ease: "easeInOut" },
  },
  dragging: {
    y: 0,
    transition: { duration: 0.2 },
  },
};

function InvestmentCardBase({
  variant = "diamond",
  plan,
  investment,
  userName,
  className,
}) {
  if (investment?.server_time) {
    syncServerTime(investment.server_time);
  }

  const cardVariant = investment?.plan_key || plan?.key || variant || "diamond";
  const theme = CARD_THEMES[cardVariant] || CARD_THEMES.diamond;
  const defaultData = CARD_DATA[cardVariant] || CARD_DATA.diamond;

  // Live timer tick every 30 seconds for countdowns & progress updates
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const effectiveNow = Date.now() + globalServerOffsetMs;

  const hasInvestment = Boolean(investment && (investment.id || investment.start_at));
  const startDate = investment?.start_at || investment?.created_at;
  const lockDays = Number(
    investment?.lock_days ||
      plan?.lock_days ||
      defaultData.front.lockPeriod.replace(/\D/g, "") ||
      60,
  );
  const maturityDate =
    investment?.maturity_at ||
    (startDate
      ? new Date(new Date(startDate).getTime() + lockDays * 86400000).toISOString()
      : null);

  const startTime = startDate ? new Date(startDate).getTime() : 0;
  const endTime = maturityDate
    ? new Date(maturityDate).getTime()
    : startTime + lockDays * 86400000;
  const totalDurationMs = Math.max(1000, endTime - startTime);
  const elapsedMs = startTime > 0 ? Math.max(0, effectiveNow - startTime) : 0;
  const remainingMs = maturityDate
    ? Math.max(0, endTime - effectiveNow)
    : lockDays * 86400000;
  const remainingDays = Math.max(0, Math.ceil(remainingMs / 86400000));
  const elapsedDays = Math.max(0, Math.floor(elapsedMs / 86400000));

  const isMatured =
    (investment && investment.status === "matured") ||
    (hasInvestment && (effectiveNow >= endTime || (remainingMs <= 0 && elapsedMs >= totalDurationMs)));

  // Dynamic progress percentage: elapsed time ÷ total lock-period time × 100
  let progressPercent = 0;
  if (isMatured) {
    progressPercent = 100;
  } else if (hasInvestment && totalDurationMs > 0) {
    progressPercent = Math.min(
      100,
      Math.max(0, (elapsedMs / totalDurationMs) * 100),
    );
  } else {
    progressPercent = 0;
  }

  // Display progress: 0% right after purchase, 100% when matured
  const displayProgress = isMatured
    ? 100
    : Math.min(100, Math.floor(progressPercent));

  // Front lock period label:
  // e.g. "59 DAYS LEFT", "58 DAYS LEFT", ... "0 DAYS LEFT"
  let displayLockPeriod = `${lockDays} Days`;
  if (hasInvestment) {
    if (isMatured || remainingDays <= 0) {
      displayLockPeriod = "0 DAYS LEFT";
    } else {
      displayLockPeriod = `${remainingDays} DAYS LEFT`;
    }
  }

  // Status label
  let displayStatus = defaultData.front.status;
  if (hasInvestment) {
    displayStatus = isMatured
      ? "MATURED"
      : investment.status
        ? investment.status.toUpperCase()
        : "ACTIVE";
  } else if (plan) {
    displayStatus = plan.unlocked ? "ACTIVE" : "LOCKED";
  }

  // Investment amount
  let displayAmount = defaultData.front.investment;
  if (investment?.principal) {
    displayAmount = `$${Number(investment.principal).toLocaleString()}`;
  } else if (plan?.price) {
    displayAmount = `$${Number(plan.price).toLocaleString()}`;
  }

  const displayBrand =
    investment?.plan_name || plan?.name || defaultData.brand;
  const displayCertificateBrand = `${displayBrand} Reserve`;
  const displayPlanName = displayBrand.toUpperCase();

  // Return percentage
  let displayReturnPct = defaultData.front.returnPct;
  if (investment?.profit_percentage) {
    displayReturnPct = `${investment.profit_percentage}%`;
  } else if (plan?.profit_percentage) {
    displayReturnPct = `${plan.profit_percentage}%`;
  }

  // Expected return / maturity amount
  let displayExpectedReturn = defaultData.back.expectedReturn;
  if (investment?.maturity_amount) {
    displayExpectedReturn = `$${Number(investment.maturity_amount).toLocaleString()}`;
  } else if (plan?.maturity_amount) {
    displayExpectedReturn = `$${Number(plan.maturity_amount).toLocaleString()}`;
  }

  // Serial & Dates
  const displayHolder = userName || defaultData.back.investorName;
  const displayInvestmentId = investment?.id
    ? `INV-${dayjs(startDate).format("YYYY")}-${investment.id.replace(/-/g, "").slice(0, 4).toUpperCase()}`
    : defaultData.back.investmentId;
  const microSerial = investment?.id
    ? `··· ${investment.id.replace(/-/g, "").slice(-4).toUpperCase()}`
    : `··· ${defaultData.back.investmentId.slice(-4)}`;

  const displayStartDate = startDate
    ? dayjs(startDate).format("DD MMM YYYY")
    : defaultData.back.startDate;
  const displayMaturityDate = maturityDate
    ? dayjs(maturityDate).format("DD MMM YYYY")
    : defaultData.back.maturityDate;

  const rotX = useMotionValue(REST_X);
  const rotY = useMotionValue(REST_Y);
  const springX = useSpring(rotX, { stiffness: 120, damping: 18, mass: 0.6 });
  const springY = useSpring(rotY, { stiffness: 120, damping: 18, mass: 0.6 });

  const draggingRef = useRef(false);
  const lastRef = useRef({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  const onPointerDown = useCallback((e) => {
    draggingRef.current = true;
    setDragging(true);
    lastRef.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (e) => {
      if (!draggingRef.current) return;
      const dx = e.clientX - lastRef.current.x;
      const dy = e.clientY - lastRef.current.y;
      lastRef.current = { x: e.clientX, y: e.clientY };
      // Full 360° freedom on both axes.
      rotY.set(rotY.get() + dx * 0.6);
      rotX.set(rotX.get() - dy * 0.6);
    },
    [rotX, rotY],
  );

  const endDrag = useCallback((e) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    // Hold position — do NOT snap back. Card stays wherever the user left it.
  }, []);

  const onPointerLeave = useCallback((_e) => {
    // Do not reset when the pointer leaves — keep current rotation.
  }, []);

  return (
    <div
      className={"relative select-none " + "w-full max-w-[420px] " + (className ?? "")}
      style={{ perspective: 1200, containerType: "inline-size" }}
    >
      {/* Floating wrapper: idle float + hover lift. */}
      <motion.div
        className="relative"
        style={{ transformStyle: "preserve-3d" }}
        variants={floatVariants}
        animate={dragging ? "dragging" : "idle"}
        whileHover={{
          scale: 1.025,
          y: -4,
          transition: { type: "spring", stiffness: 380, damping: 22 },
        }}
        whileTap={{
          scale: 0.985,
          transition: { type: "spring", stiffness: 450, damping: 25 },
        }}
      >
        {/* Soft breathing outer glow */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -inset-6 rounded-[36px]"
          style={{ background: theme.glow, filter: "blur(24px)", willChange: "opacity" }}
          animate={{ opacity: [0.45, 0.75, 0.45] }}
          whileHover={{ opacity: 0.85 }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Interactive 3D card body */}
        <motion.div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onPointerLeave={onPointerLeave}
          className="relative aspect-[42/26] w-full cursor-grab touch-none rounded-[24px] active:cursor-grabbing"
          style={{
            transformStyle: "preserve-3d",
            rotateX: springX,
            rotateY: springY,
            willChange: "transform",
            boxShadow: theme.bodyShadow,
          }}
        >
          {/* FRONT */}
          <CardFace theme={theme}>
            <div className="relative flex h-full w-full flex-col justify-between p-5">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="text-[15px] leading-none"
                    style={gradientText(theme.gradGlyph)}
                  >
                    ◆
                  </span>
                  <span
                    className="text-[11px] font-semibold uppercase tracking-[0.32em]"
                    style={{ color: theme.brandInk }}
                  >
                    {displayBrand}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {/* Chip glyph */}
                  <div
                    aria-hidden
                    className="h-[18px] w-[24px] rounded-[4px]"
                    style={{
                      backgroundImage: theme.chipBackground,
                      boxShadow: theme.chipShadow,
                    }}
                  />
                  <StatusPill label={displayStatus} theme={theme} />
                </div>
              </div>

              {/* Middle */}
              <div className="flex items-end justify-between">
                <div>
                  <div
                    className="text-[10px] uppercase tracking-[0.2em]"
                    style={{ color: theme.label }}
                  >
                    Investment
                  </div>
                  <div
                    className="mt-1 text-[34px] font-semibold leading-none tracking-tight"
                    style={gradientText(theme.gradAmount)}
                  >
                    {displayAmount}
                  </div>
                  <div
                    className="mt-2 text-[11px] uppercase tracking-[0.18em]"
                    style={{ color: theme.sublabel }}
                  >
                    Plan · {displayPlanName}
                  </div>
                </div>
                <ProgressRing value={displayProgress} theme={theme} />
              </div>

              {/* Footer */}
              <div
                className="flex items-end justify-between border-t pt-3"
                style={{ borderColor: theme.hairlineSoft }}
              >
                <div>
                  <div
                    className="text-[9px] uppercase tracking-[0.2em]"
                    style={{ color: theme.label }}
                  >
                    Lock Period
                  </div>
                  <div
                    className="text-[13px] font-medium"
                    style={{ color: theme.value }}
                  >
                    {displayLockPeriod}
                  </div>
                  <div
                    className="mt-1 font-mono text-[9px] tracking-[0.2em]"
                    style={{ color: theme.label }}
                  >
                    {microSerial}
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className="text-[9px] uppercase tracking-[0.2em]"
                    style={{ color: theme.label }}
                  >
                    Return
                  </div>
                  <div
                    className="text-[15px] font-semibold"
                    style={gradientText(theme.gradReturn)}
                  >
                    {displayReturnPct}
                  </div>
                </div>
              </div>

              {/* Shine sweep (front) */}
              <motion.div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/2"
                style={{
                  background: theme.shineFront,
                  filter: "blur(2px)",
                  mixBlendMode: "screen",
                }}
                animate={{ x: ["-40%", "260%"] }}
                transition={{
                  duration: 3.6,
                  repeat: Infinity,
                  repeatDelay: 2.6,
                  ease: "easeInOut",
                }}
              />
            </div>
          </CardFace>

          {/* BACK */}
          <CardFace back theme={theme}>
            <div
              data-testid="card-back-content"
              className="relative flex h-full w-full flex-col justify-between p-[2.85cqw]"
            >
              {/* Header band */}
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-[1.9cqw]">
                    <span
                      className="text-[3.1cqw] leading-none"
                      style={gradientText(theme.gradGlyph)}
                    >
                      ◆
                    </span>
                    <span
                      className="text-[2.4cqw] font-semibold uppercase tracking-[0.32em]"
                      style={gradientText(theme.gradTitle)}
                    >
                      {displayCertificateBrand}
                    </span>
                  </div>
                  <StatusPill label={displayStatus} theme={theme} />
                </div>
                {/* Notched hairline divider */}
                <div className="relative mt-[0.95cqw] flex items-center">
                  <span
                    className="h-px flex-1"
                    style={{ background: theme.hairline }}
                  />
                  <span
                    className="mx-[1.43cqw] text-[1.9cqw]"
                    style={{ color: theme.label }}
                  >
                    ◆
                  </span>
                  <span
                    className="h-px flex-1"
                    style={{ background: theme.hairline }}
                  />
                </div>
              </div>

              {/* Investor hero */}
              <div>
                <div
                  className="text-[2.15cqw] uppercase tracking-[0.24em]"
                  style={{ color: theme.label }}
                >
                  Certificate Holder
                </div>
                <div
                  className="mt-[0.5cqw] text-[4.3cqw] font-semibold leading-none tracking-tight"
                  style={gradientText(theme.gradTitle)}
                >
                  {displayHolder}
                </div>
                <div
                  className="mt-[1.43cqw] inline-flex rounded-md border px-[1.9cqw] py-[0.5cqw] backdrop-blur-[2px]"
                  style={{
                    borderColor: theme.serialBorder,
                    background: theme.serialBg,
                  }}
                >
                  <span
                    className="font-mono text-[2.4cqw] tracking-[0.24em]"
                    style={{ color: theme.serialInk }}
                  >
                    {displayInvestmentId}
                  </span>
                </div>
              </div>

              {/* Timeline strip */}
              <div className="relative">
                <div
                  className="mb-[0.95cqw] flex items-center justify-between text-[1.9cqw] uppercase tracking-[0.24em]"
                  style={{ color: theme.label }}
                >
                  <span>Start</span>
                  <span>Maturity</span>
                </div>
                <div className="relative h-[2.4cqw]">
                  <span
                    className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full"
                    style={{ background: theme.timelineLine, opacity: 0.55 }}
                  />
                  <span
                    className="absolute left-0 top-1/2 h-[1.9cqw] w-[1.9cqw] -translate-x-1/2 -translate-y-1/2 rounded-full"
                    style={{
                      background: theme.timelineNode,
                      boxShadow: `0 0 0 2px ${theme.timelineNodeRing}`,
                    }}
                  />
                  <span
                    className="absolute right-0 top-1/2 h-[1.9cqw] w-[1.9cqw] translate-x-1/2 -translate-y-1/2 rounded-full"
                    style={{
                      background: theme.timelineNode,
                      boxShadow: `0 0 0 2px ${theme.timelineNodeRing}`,
                    }}
                  />
                  <motion.span
                    className="absolute top-1/2 h-[2.4cqw] w-[2.4cqw] -translate-y-1/2 rounded-full"
                    style={{
                      left: `${progressPercent}%`,
                      background: theme.timelineDot,
                      boxShadow: theme.timelineDotShadow,
                    }}
                    animate={
                      isMatured
                        ? { opacity: 1, scale: 1 }
                        : { opacity: [0.7, 1, 0.7], scale: [0.9, 1.1, 0.9] }
                    }
                    transition={
                      isMatured
                        ? { duration: 0 }
                        : { duration: 2.2, repeat: Infinity, ease: "easeInOut" }
                    }
                  />
                </div>
                <div
                  className="mt-[0.95cqw] flex items-center justify-between text-[2.4cqw] font-medium"
                  style={{ color: theme.value }}
                >
                  <span>{displayStartDate}</span>
                  <span>{displayMaturityDate}</span>
                </div>
              </div>

              {/* Expected return highlight */}
              <div className="flex items-end justify-between">
                <div>
                  <div
                    className="text-[2.15cqw] uppercase tracking-[0.24em]"
                    style={{ color: theme.label }}
                  >
                    Issued
                  </div>
                  <div className="text-[2.4cqw]" style={{ color: theme.issued }}>
                    {displayStartDate} · Non-transferable
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className="text-[2.15cqw] uppercase tracking-[0.2em]"
                    style={{ color: theme.label }}
                  >
                    Expected Return
                  </div>
                  <div className="flex items-center justify-end gap-[0.95cqw]">
                    <span className="text-[2.6cqw]" style={{ color: theme.accent }}>
                      ▲
                    </span>
                    <span
                      className="text-[3.8cqw] font-semibold leading-none"
                      style={gradientText(theme.gradReturn)}
                    >
                      {displayExpectedReturn}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer: signature + seal */}
              <div
                className="flex items-end justify-between border-t pt-[1.43cqw]"
                style={{ borderColor: theme.hairlineSoft }}
              >
                <div>
                  <div
                    className="border-b pb-[0.5cqw] font-serif text-[3.35cqw] italic leading-none"
                    style={{
                      letterSpacing: "0.02em",
                      color: theme.signatureInk,
                      borderColor: theme.signatureRule,
                    }}
                  >
                    {displayHolder}
                  </div>
                  <div
                    className="mt-[0.95cqw] text-[1.9cqw] uppercase tracking-[0.24em]"
                    style={{ color: theme.label }}
                  >
                    Authorized Signature
                  </div>
                </div>
                <div className="relative h-[7.15cqw] w-[7.15cqw]">
                  <motion.div
                    aria-hidden
                    className="absolute inset-0 rounded-full"
                    style={{
                      backgroundImage: theme.sealRing,
                      padding: 1,
                      WebkitMask:
                        "radial-gradient(circle, transparent 55%, black 56%)",
                      mask: "radial-gradient(circle, transparent 55%, black 56%)",
                    }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  />
                  <div
                    className="absolute inset-[0.7cqw] grid place-items-center rounded-full text-[2.4cqw]"
                    style={{
                      background: theme.sealFace,
                      boxShadow: theme.sealShadow,
                      color: theme.sealInk,
                    }}
                  >
                    ◆
                  </div>
                </div>
              </div>

              {/* Shine sweep (back — slower) */}
              <motion.div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/2"
                style={{
                  background: theme.shineBack,
                  filter: "blur(2px)",
                  mixBlendMode: "screen",
                }}
                animate={{ x: ["-40%", "260%"] }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  repeatDelay: 4,
                  ease: "easeInOut",
                }}
              />
            </div>
          </CardFace>

          {/* Dynamic lighting overlay (front-facing highlight) */}
          <DynamicHighlight rx={springX} ry={springY} theme={theme} />
        </motion.div>
      </motion.div>
    </div>
  );
}

export const InvestmentCard = React.memo(InvestmentCardBase);

export function DiamondInvestmentCard({ className }) {
  return <InvestmentCard variant="diamond" className={className} />;
}

export default InvestmentCard;
