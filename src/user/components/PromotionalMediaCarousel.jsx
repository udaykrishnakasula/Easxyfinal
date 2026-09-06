import React, { useRef, useState, useEffect, useCallback } from "react";
import Autoplay from "embla-carousel-autoplay";
import {
  Sparkles,
  Volume2,
  VolumeX,
  Play,
  Pause,
  ArrowRight,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Flame,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/shared/ui/carousel";
import { Eyebrow, EasyXButton } from "@/design/EasyX";
import { usePromotions } from "@/user/api";

const BADGE_COLOR_CLASSES = {
  amber: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  violet: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  sky: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  rose: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  indigo: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
};

function PromotionalMediaCard({ item, isSelected }) {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const cardRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [userManuallyPaused, setUserManuallyPaused] = useState(false);
  const [inViewport, setInViewport] = useState(true);

  // Viewport intersection observer for lazy-loading and off-screen pause
  useEffect(() => {
    const el = cardRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInViewport(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (Array.isArray(entries) && entries.length > 0 && entries[0]) {
          setInViewport(Boolean(entries[0].isIntersecting));
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Pause videos when slide is inactive or offscreen to maintain peak dashboard performance
  useEffect(() => {
    if (item?.media_type !== "video" || !videoRef.current) return;
    const video = videoRef.current;

    if (isSelected && inViewport && !userManuallyPaused) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(() => {
            if (!video.muted) {
              video.muted = true;
              setIsMuted(true);
              video.play().catch(() => {});
            }
          });
      }
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, [isSelected, inViewport, userManuallyPaused, item?.media_type]);

  // Pause when browser tab is inactive
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && videoRef.current) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else if (!document.hidden && isSelected && inViewport && !userManuallyPaused && videoRef.current) {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [isSelected, inViewport, userManuallyPaused]);

  // Toggle video play/pause
  const togglePlay = (e) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
      setUserManuallyPaused(false);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      setUserManuallyPaused(true);
    }
  };

  // Toggle video mute/unmute
  const toggleMute = (e) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const handleCtaClick = () => {
    if (!item?.cta_link) return;
    if (item.cta_link.startsWith("/") || item.cta_link.startsWith("#")) {
      navigate(item.cta_link);
    } else {
      window.open(item.cta_link, "_blank", "noopener,noreferrer");
    }
  };

  const badgeColorClass =
    BADGE_COLOR_CLASSES[item?.badge_color] || BADGE_COLOR_CLASSES.violet;

  return (
    <div
      ref={cardRef}
      data-testid={`promotional-card-${item?.id || "item"}`}
      className="w-[440px] sm:w-[500px] md:w-[560px] max-w-[86vw] rounded-[24px] sm:rounded-[28px] border border-white/10 bg-gradient-to-b from-[#171622]/90 to-[#0d0c13]/95 backdrop-blur-xl overflow-hidden shadow-2xl transition-all duration-300 hover:border-white/20 group/card flex flex-col"
    >
      {/* Media Viewport Container */}
      <div className="relative w-full aspect-[16/9] bg-black/40 overflow-hidden select-none">
        {item.media_type === "video" ? (
          <div className="relative w-full h-full">
            <video
              ref={videoRef}
              src={item.media_url}
              poster={item.thumbnail_url}
              autoPlay
              loop
              muted={isMuted}
              playsInline
              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover/card:scale-102"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
            {/* Subtle dark gradient overlay on video */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0e0d13] via-black/20 to-black/30 pointer-events-none" />

            {/* Video Controls Bar */}
            <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 opacity-90 transition-opacity group-hover/card:opacity-100">
              <button
                type="button"
                onClick={togglePlay}
                aria-label={isPlaying ? "Pause video" : "Play video"}
                className="h-7 w-7 rounded-full bg-black/60 border border-white/15 text-white/80 hover:text-white hover:bg-black/80 flex items-center justify-center backdrop-blur-md transition-all shadow-md"
              >
                {isPlaying ? (
                  <Pause className="h-3.5 w-3.5" />
                ) : (
                  <Play className="h-3.5 w-3.5 fill-white ml-0.5" />
                )}
              </button>
              <button
                type="button"
                onClick={toggleMute}
                aria-label={isMuted ? "Unmute audio" : "Mute audio"}
                className="h-7 w-7 rounded-full bg-black/60 border border-white/15 text-white/80 hover:text-white hover:bg-black/80 flex items-center justify-center backdrop-blur-md transition-all shadow-md"
              >
                {isMuted ? (
                  <VolumeX className="h-3.5 w-3.5" />
                ) : (
                  <Volume2 className="h-3.5 w-3.5 text-emerald-400" />
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="relative w-full h-full">
            <img
              src={item.media_url}
              alt={item.title}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover/card:scale-105"
            />
            {/* Subtle dark gradient overlay on image */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0e0d13] via-black/15 to-black/20 pointer-events-none" />
          </div>
        )}

        {/* Top Badges & Tag */}
        <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
          {item.badge_text ? (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase border backdrop-blur-md shadow-lg ${badgeColorClass}`}
            >
              <Sparkles className="h-3 w-3 shrink-0" />
              <span>{item.badge_text}</span>
            </span>
          ) : (
            <span />
          )}

          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/50 border border-white/10 text-white/70 backdrop-blur-md uppercase tracking-wider">
            {item.media_type === "video" ? "Video" : "Featured"}
          </span>
        </div>
      </div>

      {/* Card Content & Action Area */}
      <div className="p-5 sm:p-6 flex flex-col justify-between flex-1 gap-4 bg-[#12111a]/80">
        <div>
          <h3 className="ex-display text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
            {item.title}
          </h3>
          {item.subtitle && (
            <p className="mt-1.5 text-xs sm:text-sm text-ex-muted leading-relaxed line-clamp-2">
              {item.subtitle}
            </p>
          )}
        </div>

        {/* Action Button */}
        {item.cta_text && (
          <div className="pt-2 border-t border-white/8 flex items-center justify-between gap-3">
            <span className="text-[11px] text-ex-muted/70">
              Official EasyX Promotion
            </span>
            <EasyXButton
              size="sm"
              onClick={handleCtaClick}
              className="h-8 px-4 text-xs font-semibold shrink-0 group/btn"
              data-testid={`promotional-cta-${item.id}`}
            >
              <span>{item.cta_text}</span>
              {item.cta_link?.startsWith("http") ? (
                <ExternalLink className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-0.5" />
              ) : (
                <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-0.5" />
              )}
            </EasyXButton>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PromotionalMediaCarousel() {
  const { data: promotions, isLoading } = usePromotions();
  const [api, setApi] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const isInteracting = useRef(false);
  const resumeTimer = useRef(null);

  const autoplay = useRef(null);
  if (!autoplay.current) {
    autoplay.current = Autoplay({
      delay: 6000,
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

  const resumeAutoplayAfterDelay = useCallback(
    (delayMs = 2500) => {
      if (resumeTimer.current) {
        clearTimeout(resumeTimer.current);
      }
      resumeTimer.current = setTimeout(() => {
        if (!isInteracting.current) {
          const ap = api?.plugins()?.autoplay || autoplay.current;
          if (ap && typeof ap.play === "function") {
            ap.play();
          }
        }
      }, delayMs);
    },
    [api]
  );

  const handleInteractionStart = useCallback(() => {
    isInteracting.current = true;
    pauseAutoplay();
  }, [pauseAutoplay]);

  const handleInteractionEnd = useCallback(() => {
    isInteracting.current = false;
    resumeAutoplayAfterDelay(2500);
  }, [resumeAutoplayAfterDelay]);

  // Sync Embla API events
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
      resumeAutoplayAfterDelay(2500);
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

  // CRITICAL REQUIREMENT: "remain hidden if no items are published by an admin."
  // If loading or empty or not published, render nothing (null).
  if (isLoading || !promotions || promotions.length === 0) {
    return null;
  }

  const items = promotions;
  const showControls = items.length > 1;

  return (
    <section
      data-testid="promotional-media-carousel-section"
      className="mt-12 sm:mt-14"
    >
      {/* Section Header */}
      <div className="flex items-end justify-between mb-4 sm:mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Eyebrow>Promotions &amp; Updates</Eyebrow>
            <span className="flex h-2 w-2 rounded-full bg-violet-400 animate-pulse" />
          </div>
          <h2 className="mt-1 ex-display text-xl sm:text-2xl font-extrabold flex items-center gap-2 text-white">
            <span>Special Highlights</span>
          </h2>
        </div>

        {showControls && (
          <div className="hidden sm:flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                pauseAutoplay();
                api?.scrollPrev();
                resumeAutoplayAfterDelay(2500);
              }}
              aria-label="Previous promotional slide"
              className="h-8 w-8 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white flex items-center justify-center transition-all"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                pauseAutoplay();
                api?.scrollNext();
                resumeAutoplayAfterDelay(2500);
              }}
              aria-label="Next promotional slide"
              className="h-8 w-8 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white flex items-center justify-center transition-all"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Carousel Container */}
      <div
        data-testid="promotional-media-carousel"
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
          opts={{
            align: "center",
            loop: items.length > 1,
            skipSnaps: false,
            duration: 40,
          }}
          plugins={plugins.current}
        >
          <CarouselContent className="py-3 sm:py-4">
            {items.map((item, idx) => (
              <CarouselItem
                key={item.id}
                data-testid={`promotional-slide-${item.id}`}
                className="basis-auto shrink-0 grow-0 flex flex-col items-center px-3 sm:px-4"
              >
                <div
                  className={`flex flex-col items-center w-full transition-all duration-700 ease-out transform ${
                    mounted
                      ? "opacity-100 translate-y-0 scale-100"
                      : "opacity-0 translate-y-6 scale-[0.97]"
                  }`}
                  style={{
                    transitionDelay: `${idx * 100 + 60}ms`,
                  }}
                >
                  <PromotionalMediaCard
                    item={item}
                    isSelected={selectedIndex === idx}
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        {/* Slide dots indicator (only shown if more than 1 item) */}
        {showControls && (
          <div className="flex items-center justify-center gap-2 mt-2 pb-1">
            {items.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  pauseAutoplay();
                  api?.scrollTo(idx);
                  resumeAutoplayAfterDelay(2500);
                }}
                aria-label={`Go to slide ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  selectedIndex === idx
                    ? "w-6 bg-gradient-to-r from-violet-400 to-indigo-400 shadow-sm shadow-violet-500/50"
                    : "w-1.5 bg-white/20 hover:bg-white/40"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
