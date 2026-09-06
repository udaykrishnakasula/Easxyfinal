import React, { useRef, useCallback, useState, useEffect } from "react";
import Autoplay from "embla-carousel-autoplay";
import { motion } from "framer-motion";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import { InvestmentCard } from "@/components/landing/DiamondInvestmentCard";

const cardVariants = ["silver", "gold", "platinum", "diamond"];

export default function CardCarousel() {
  // Create the autoplay plugin once. Slower cadence (5s between slides) and
  // stopOnInteraction:false so we can pause/resume it manually on touch.
  const autoplay = useRef(null);
  if (!autoplay.current) {
    autoplay.current = Autoplay({
      delay: 5000,
      stopOnInteraction: false,
      stopOnMouseEnter: false,
    });
  }
  // Stable plugins array reference so embla does not re-initialize on every
  // re-render (which would keep resetting the autoplay timer).
  const plugins = useRef([autoplay.current]);

  const [api, setApi] = useState(null);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return undefined;
    const onSelect = () => {
      try {
        if (typeof api.selectedScrollSnap === "function") {
          setCurrent(api.selectedScrollSnap());
        }
      } catch {
        // ignore
      }
    };
    onSelect();
    api.on("select", onSelect);
    return () => api.off("select", onSelect);
  }, [api]);

  // Hold the carousel while a finger/pointer is pressed on a card...
  const holdStart = useCallback(() => {
    autoplay.current?.stop();
  }, []);

  // ...and let it resume scrolling once the pointer is released.
  const holdEnd = useCallback(() => {
    autoplay.current?.play();
  }, []);

  return (
    <div data-testid="card-carousel" data-current-slide={current}>
    <Carousel
      setApi={setApi}
      // duration = scroll animation speed (higher is slower). loop for endless scroll.
      // watchDrag:false keeps the carousel from swiping so each card's own
      // drag-to-rotate 3D interaction stays intact.
      opts={{ align: "center", loop: true, watchDrag: false, duration: 55 }}
      plugins={plugins.current}
    >
      <CarouselContent
        className="py-12"
        onPointerDown={holdStart}
        onPointerUp={holdEnd}
        onPointerLeave={holdEnd}
        onPointerCancel={holdEnd}
      >
        {cardVariants.map((variant) => (
          <CarouselItem
            key={variant}
            data-testid={`carousel-card-${variant}`}
            className="basis-auto shrink-0 grow-0 flex justify-center px-6"
          >
            <motion.div
              whileHover={{ scale: 1.025, y: -6 }}
              whileTap={{ scale: 0.985 }}
              transition={{ type: "spring", stiffness: 380, damping: 24 }}
              className="w-[420px] max-w-[82vw] cursor-pointer"
            >
              <InvestmentCard variant={variant} className="mx-auto" />
            </motion.div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
    </div>
  );
}
