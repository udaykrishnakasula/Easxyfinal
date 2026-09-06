import React from "react";

export default function AnimatedOwl({
  style = {
    objectFit: "contain",
    display: "inline-block",
    background: "transparent",
    mixBlendMode: "screen",
    borderRadius: "0px",
  },
  className = "w-12 h-12 md:w-14 md:h-14",
}) {
  return (
    <video
      src="/gemini_generated_video_ce8e299d.mp4"
      autoPlay
      loop
      muted
      playsInline
      style={style}
      className={className}
    />
  );
}
