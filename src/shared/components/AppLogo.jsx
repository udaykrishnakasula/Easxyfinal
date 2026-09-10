import React, { useState } from "react";
import {
  ShieldCheck,
  Sparkles,
  Rocket,
  Landmark,
  Hexagon,
  Crown,
  Layers,
} from "lucide-react";
import { useAppBranding } from "@/admin/adminApi";

export const ICON_PRESETS = [
  {
    id: "default",
    name: "EasyX Shield",
    description: "Classic secure wealth shield",
    icon: ShieldCheck,
    bgGradient: "from-purple-600 to-indigo-600",
    ringColor: "ring-purple-400/40",
  },
  {
    id: "gem",
    name: "Crypto Diamond",
    description: "Multi-faceted radiant crystal",
    icon: Sparkles,
    bgGradient: "from-cyan-500 to-blue-600",
    ringColor: "ring-cyan-400/40",
  },
  {
    id: "rocket",
    name: "Growth Rocket",
    description: "High-yield upward trajectory",
    icon: Rocket,
    bgGradient: "from-amber-500 to-rose-600",
    ringColor: "ring-amber-400/40",
  },
  {
    id: "vault",
    name: "Golden Vault",
    description: "Fortified asset repository",
    icon: Landmark,
    bgGradient: "from-amber-400 to-yellow-600",
    ringColor: "ring-amber-300/40",
  },
  {
    id: "hexagon",
    name: "Cyber Node",
    description: "Decentralized crypto protocol",
    icon: Hexagon,
    bgGradient: "from-emerald-500 to-teal-700",
    ringColor: "ring-emerald-400/40",
  },
  {
    id: "crown",
    name: "Wealth Crown",
    description: "VIP Tier Private Equity",
    icon: Crown,
    bgGradient: "from-fuchsia-600 to-purple-800",
    ringColor: "ring-fuchsia-400/40",
  },
];

const SIZE_MAP = {
  xs: { box: "h-6 w-6", icon: "h-3.5 w-3.5", text: "text-sm", font: "text-xs font-bold" },
  sm: { box: "h-8 w-8", icon: "h-4 w-4", text: "text-base", font: "text-sm font-extrabold" },
  md: { box: "h-9 w-9", icon: "h-5 w-5", text: "text-lg", font: "text-base font-extrabold" },
  lg: { box: "h-12 w-12", icon: "h-6 w-6", text: "text-xl", font: "text-lg font-black" },
  xl: { box: "h-16 w-16", icon: "h-8 w-8", text: "text-2xl", font: "text-2xl font-black" },
  "2xl": { box: "h-24 w-24", icon: "h-12 w-12", text: "text-3xl", font: "text-3xl font-black" },
};

const SHAPE_MAP = {
  rounded: "rounded-xl",
  circle: "rounded-full",
  square: "rounded-md",
  glass: "rounded-2xl ring-2 ring-white/20 shadow-xl",
};

export default function AppLogo({
  size = "md",
  shape,
  showName = false,
  subtitle,
  className = "",
  iconClassName = "",
  textClassName = "",
  customIconUrl,
  customName,
  customPreset,
  onClick,
}) {
  const { data: branding } = useAppBranding();
  const [imgError, setImgError] = useState(false);

  const activeName = customName || branding?.app_name || "EasyX";
  const activeIconUrl =
    customIconUrl !== undefined
      ? customIconUrl
      : branding?.app_icon_url || "/uploads/branding/brand_1788453379866_40p372p.png";
  const activeShape = shape || branding?.icon_shape || "rounded";
  const activePresetId = customPreset || branding?.icon_preset || "default";

  const sizeStyle = SIZE_MAP[size] || SIZE_MAP.md;
  const shapeClass = SHAPE_MAP[activeShape] || SHAPE_MAP.rounded;

  const presetConfig =
    (Array.isArray(ICON_PRESETS) && ICON_PRESETS.find((p) => p?.id === activePresetId)) ||
    (Array.isArray(ICON_PRESETS) && ICON_PRESETS[0]) ||
    { id: "default", icon: ShieldCheck, label: "Shield Default", bgGradient: "from-purple-500 to-indigo-600" };
  const PresetIcon = presetConfig?.icon || ShieldCheck;

  const hasValidCustomImage = Boolean(activeIconUrl && !imgError);

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 select-none ${onClick ? "cursor-pointer" : ""} ${className}`}
      data-testid="app-brand-logo"
    >
      {/* Icon Emblem */}
      <div
        className={`relative shrink-0 ${sizeStyle.box} ${shapeClass} overflow-hidden grid place-items-center bg-gradient-to-br ${
          hasValidCustomImage
            ? "bg-black/60 border border-white/15 ring-1 ring-white/10"
            : `${presetConfig.bgGradient} shadow-md ring-1 ring-white/20`
        } ${iconClassName}`}
      >
        {hasValidCustomImage ? (
          <img
            src={activeIconUrl}
            alt={`${activeName} icon`}
            onError={() => setImgError(true)}
            className="h-full w-full object-cover p-0.5 transition-transform duration-200 hover:scale-105"
            crossOrigin="anonymous"
          />
        ) : (
          <PresetIcon className={`${sizeStyle.icon} text-white drop-shadow-sm`} />
        )}
      </div>

      {/* Brand Text Header */}
      {showName && (
        <div className="flex flex-col leading-tight min-w-0">
          <span
            className={`font-extrabold tracking-tight text-white ex-display ${sizeStyle.text} ${textClassName}`}
          >
            {activeName}
          </span>
          {subtitle && (
            <span className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
