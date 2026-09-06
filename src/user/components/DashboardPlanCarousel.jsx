import React, { useRef, useState, useEffect, useCallback } from "react";
import Autoplay from "embla-carousel-autoplay";
import { Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/shared/ui/carousel";
import { InvestmentCard } from "@/components/landing/DiamondInvestmentCard";
import { EasyXButton, EasyXStatusBadge } from "@/design/EasyX";
import BuyPlanDialog from "./BuyPlanDialog";
import { money } from "@/user/api";

const ORDER = ["silver", "gold", "platinum", "diamond"];

export default function DashboardPlanCarousel({ plans, walletBalance, userName }) {
  const navigate = useNavigate();
  const [buyPlan, setBuyPlan] = useState(null);
  const [api, setApi] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const isInteracting = useRef(false);
  const resumeTimer = useRef(null);

  const autoplay = useRef(null);
  if (!autoplay.current) {
    autoplay.current = Autoplay({
      delay: 5500,
      stopOnInteraction: false,
      stopOnMouseEnter: false,
    });
  }
  const plugins = useRef([autoplay.current]);

  const pauseAutoplay = useCallback(() => {
    if (resumeTimer.current) {
      clearTimeout(resumeTimer.current);
      resumeTimer.current = null;
    }
    const ap = api?.plugins()?.autoplay || autoplay.current;
    if (ap && typeof ap.stop === "function") {
      ap.stop();
    }
  }, [api]);

  const resumeAutoplayAfterDelay = useCallback((delayMs = 2000) => {
    if (resumeTimer.current) {
      clearTimeout(resumeTimer.current);
    }
    resumeTimer.current = setTimeout(() => {
      if (!isInteracting.current && !buyPlan) {
        const ap = api?.plugins()?.autoplay || autoplay.current;
        if (ap && typeof ap.play === "function") {
          ap.play();
        }
      }
    }, delayMs);
  }, [api, buyPlan]);

  const handleInteractionStart = useCallback(() => {
    isInteracting.current = true;
    pauseAutoplay();
  }, [pauseAutoplay]);

  const handleInteractionEnd = useCallback(() => {
    isInteracting.current = false;
    resumeAutoplayAfterDelay(2000);
  }, [resumeAutoplayAfterDelay]);

  // Sync with Embla API events
  useEffect(() => {
    if (!api) return;

    const onSelect = () => {
      try {
        if (typeof api?.selectedScrollSnap === "function") {
          setSelectedIndex(api.selectedScrollSnap());
        }
      } catch {
        // ignore
      }
    };

    const onPointerDown = () => {
      isInteracting.current = true;
      pauseAutoplay();
    };

    const onPointerUp = () => {
      isInteracting.current = false;
      resumeAutoplayAfterDelay(2000);
    };

    const onScroll = () => {
      if (isInteracting.current) {
        pauseAutoplay();
      }
    };

    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    api.on("pointerDown", onPointerDown);
    api.on("pointerUp", onPointerUp);
    api.on("scroll", onScroll);

    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
      api.off("pointerDown", onPointerDown);
      api.off("pointerUp", onPointerUp);
      api.off("scroll", onScroll);
      if (resumeTimer.current) {
        clearTimeout(resumeTimer.current);
      }
    };
  }, [api, pauseAutoplay, resumeAutoplayAfterDelay]);

  // Pause when buy dialog is open
  useEffect(() => {
    if (buyPlan) {
      pauseAutoplay();
    } else {
      resumeAutoplayAfterDelay(2000);
    }
  }, [buyPlan, pauseAutoplay, resumeAutoplayAfterDelay]);

  const byKey = Object.fromEntries((plans || []).map((p) => [p.key, p]));

  return (
    <div
      data-testid="dashboard-plan-carousel"
      className="relative select-none group"
      onMouseEnter={handleInteractionStart}
      onMouseLeave={handleInteractionEnd}
      onTouchStart={handleInteractionStart}
      onTouchEnd={handleInteractionEnd}
      onTouchCancel={handleInteractionEnd}
      onPointerDown={handleInteractionStart}
      onPointerUp={handleInteractionEnd}
      onPointerCancel={handleInteractionEnd}
    >
      <Carousel
        setApi={setApi}
        opts={{ align: "center", loop: true, skipSnaps: false, duration: 40 }}
        plugins={plugins.current}
      >
        <CarouselContent className="py-8">
          {ORDER.map((key, idx) => {
            const plan = byKey[key];
            if (!plan) return null;
            return (
              <CarouselItem
                key={key}
                data-testid={`dash-carousel-${key}`}
                data-unlocked={plan.unlocked ? "true" : "false"}
                className="basis-auto shrink-0 grow-0 flex flex-col items-center px-4"
              >
                {/* Subtle entrance animation wrapper with staggered delay */}
                <div
                  className={`flex flex-col items-center w-full transition-all duration-700 ease-out transform ${
                    mounted
                      ? "opacity-100 translate-y-0 scale-100"
                      : "opacity-0 translate-y-6 scale-[0.97]"
                  }`}
                  style={{
                    transitionDelay: `${idx * 100 + 80}ms`,
                  }}
                >
                  {/* 3D certificate card with Framer Motion hover scale and smooth spring transition */}
                  <motion.div
                    whileHover={{ scale: 1.028, y: -6 }}
                    whileTap={{ scale: 0.985 }}
                    transition={{ type: "spring", stiffness: 380, damping: 24 }}
                    className="relative w-[420px] max-w-[82vw] cursor-pointer"
                  >
                    <InvestmentCard
                      variant={key}
                      plan={plan}
                      investment={plan.latest_investment}
                      userName={userName}
                      className="mx-auto"
                    />

                    {!plan.unlocked && (
                      <motion.button
                        onClick={() => setBuyPlan(plan)}
                        data-testid={`dash-plan-unlock-${key}`}
                        whileHover={{
                          backgroundColor: "rgba(0, 0, 0, 0.42)",
                          backdropFilter: "blur(2px)",
                        }}
                        whileTap={{ scale: 0.97 }}
                        transition={{ duration: 0.2 }}
                        className="group/lock absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-[28px] bg-black/30 backdrop-blur-[3px] transition-colors"
                      >
                        <motion.div
                          whileHover={{ scale: 1.15, rotate: -6 }}
                          transition={{ type: "spring", stiffness: 450, damping: 18 }}
                        >
                          <Lock className="h-12 w-12 text-yellow-400 transition-transform duration-300 group-hover/lock:scale-110 group-hover/lock:rotate-[-6deg]" strokeWidth={2.25} />
                        </motion.div>
                        <span className="ex-display text-base font-semibold text-white transition-transform duration-300 group-hover/lock:translate-y-[-2px]">Tap to unlock</span>
                        <span className="text-xs text-white/70">Invest to reveal this plan</span>
                      </motion.button>
                    )}
                  </motion.div>

                  {/* Real plan action bar with smooth hover lift */}
                  <motion.div
                    whileHover={{
                      scale: 1.018,
                      y: -2,
                      boxShadow: "0 12px 30px -10px rgba(0,0,0,0.5)",
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="mt-4 w-[420px] max-w-[82vw] ex-surface-sm p-3 flex items-center justify-between gap-3 border border-white/10 transition-colors duration-300 hover:border-white/25"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="ex-eyebrow truncate">{plan.name}</span>
                      <EasyXStatusBadge status={plan.unlocked ? "unlocked" : "locked"} />
                      {plan.unlocked && (
                        <span className="text-xs text-ex-muted whitespace-nowrap">· {plan.cards} card{plan.cards === 1 ? "" : "s"}</span>
                      )}
                    </div>
                    {plan.unlocked ? (
                      <div className="flex gap-2 shrink-0">
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <EasyXButton variant="ghost" className="h-9 px-3" onClick={() => setBuyPlan(plan)} data-testid={`dash-buymore-${key}`}>
                            BUY
                          </EasyXButton>
                        </motion.div>
                      </div>
                    ) : (
                      <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}>
                        <EasyXButton className="h-9 px-4 shrink-0" onClick={() => setBuyPlan(plan)} data-testid={`dash-buy-${key}`}>
                          Buy {money(plan.price)}
                        </EasyXButton>
                      </motion.div>
                    )}
                  </motion.div>
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>

      {/* Slide dots indicator */}
      <div className="flex items-center justify-center gap-2 mt-1 pb-2">
        {ORDER.map((key, idx) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              pauseAutoplay();
              api?.scrollTo(idx);
              resumeAutoplayAfterDelay(2000);
            }}
            aria-label={`Go to ${key} plan`}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              selectedIndex === idx
                ? "w-6 bg-gradient-to-r from-violet-400 to-indigo-400 shadow-sm shadow-violet-500/50"
                : "w-1.5 bg-white/20 hover:bg-white/40"
            }`}
          />
        ))}
      </div>

      {buyPlan && (
        <BuyPlanDialog
          plan={buyPlan}
          open={!!buyPlan}
          onOpenChange={(o) => !o && setBuyPlan(null)}
          walletBalance={walletBalance}
        />
      )}
    </div>
  );
}
