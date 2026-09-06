import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Upload,
  Image as ImageIcon,
  Check,
  RefreshCw,
  Globe,
  Smartphone,
  Layout,
  Layers,
  Trash2,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Info,
  Sliders,
  Eye,
} from "lucide-react";
import { EasyXCard, EasyXButton } from "@/design/EasyX";
import AppLogo, { ICON_PRESETS } from "@/shared/components/AppLogo";
import { useAppBranding, useSaveBranding, useUploadAppIcon } from "@/admin/adminApi";
import { compressImageFile } from "@/shared/utils/imageCompressor";
import { toast } from "sonner";

const ICON_SHAPES = [
  { id: "rounded", name: "Squircle", desc: "iOS / Android standard (12px)", radius: "rounded-xl" },
  { id: "circle", name: "Circular", desc: "Clean round badge", radius: "rounded-full" },
  { id: "square", name: "Sharp Square", desc: "Crisp geometry", radius: "rounded-sm" },
  { id: "glass", name: "Glass Glow", desc: "Translucent glow border", radius: "rounded-2xl" },
];

export default function AdminBrandingSection() {
  const { data: branding, isLoading, refetch } = useAppBranding();
  const saveBranding = useSaveBranding();
  const uploadIcon = useUploadAppIcon();

  const fileInputRef = useRef(null);
  const faviconInputRef = useRef(null);

  const [appName, setAppName] = useState("EasyX");
  const [appTagline, setAppTagline] = useState("High-Yield Wealth Management");
  const [appIconUrl, setAppIconUrl] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [syncFavicon, setSyncFavicon] = useState(true);
  const [iconShape, setIconShape] = useState("rounded");
  const [iconPreset, setIconPreset] = useState("default");
  const [previewTab, setPreviewTab] = useState("mobile"); // "mobile" | "browser" | "navbar" | "pwa"

  // Sync state when branding query updates
  useEffect(() => {
    if (branding) {
      setAppName(branding.app_name || "EasyX");
      setAppTagline(branding.app_tagline || "High-Yield Wealth Management");
      setAppIconUrl(branding.app_icon_url || "");
      setFaviconUrl(branding.favicon_url || "");
      setSyncFavicon(!branding.favicon_url || branding.favicon_url === branding.app_icon_url);
      setIconShape(branding.icon_shape || "rounded");
      setIconPreset(branding.icon_preset || "default");
    }
  }, [branding]);

  // Handle image upload
  const handleFileUpload = async (e, target = "app_icon") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file (PNG, SVG, JPG, WebP, ICO).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file size must be less than 5MB.");
      return;
    }

    const toastId = toast.loading("Uploading and optimizing icon image...");
    try {
      const optimizedFile = await compressImageFile(file, 512, 0.85);
      const res = await uploadIcon.mutateAsync(optimizedFile);
      if (res?.url) {
        if (target === "app_icon") {
          setAppIconUrl(res.url);
          if (syncFavicon) {
            setFaviconUrl(res.url);
          }
          toast.success("App icon uploaded successfully!", { id: toastId });
        } else {
          setFaviconUrl(res.url);
          toast.success("Favicon uploaded successfully!", { id: toastId });
        }
      }
    } catch (err) {
      // Fallback to client-side FileReader if network upload encounters issues
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        const dataUrl = loadEvt.target?.result;
        if (target === "app_icon") {
          setAppIconUrl(dataUrl);
          if (syncFavicon) setFaviconUrl(dataUrl);
        } else {
          setFaviconUrl(dataUrl);
        }
        toast.success("Icon loaded locally!", { id: toastId });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    const payload = {
      app_name: appName.trim() || "EasyX",
      app_tagline: appTagline.trim(),
      app_icon_url: appIconUrl.trim(),
      favicon_url: syncFavicon ? appIconUrl.trim() : faviconUrl.trim(),
      icon_shape: iconShape,
      icon_preset: iconPreset,
      reason: "Admin updated platform branding and application icon",
    };

    const tid = toast.loading("Saving app icon and branding configuration...");
    try {
      await saveBranding.mutateAsync(payload);
      toast.success("Branding updated successfully! Browser tabs & logos refreshed.", { id: tid });
    } catch (err) {
      toast.error("Failed to save branding: " + (err?.response?.data?.detail || err.message), { id: tid });
    }
  };

  const handleResetToDefault = () => {
    setAppName("EasyX");
    setAppTagline("High-Yield Wealth Management");
    setAppIconUrl("");
    setFaviconUrl("");
    setSyncFavicon(true);
    setIconShape("rounded");
    setIconPreset("default");
    toast.success("Reset branding form to EasyX defaults.");
  };

  const hasCustomIcon = Boolean(appIconUrl);

  return (
    <EasyXCard className="p-6 bg-ex-surface/90 border-white/10 space-y-6" data-testid="admin-branding-section">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/30">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-base">
                App Icon & Webapp Branding
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30 px-2.5 py-0.5 text-[11px] font-semibold">
                Live Brand Sync
              </span>
            </div>
            <p className="text-xs text-white/60 mt-1">
              Customize the application emblem, webapp favicon, mobile PWA home screen icon, and platform identity across all user interfaces.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <EasyXButton
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-xs text-white/70"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </EasyXButton>
          <EasyXButton
            onClick={handleSave}
            loading={saveBranding.isPending}
            disabled={saveBranding.isPending}
            data-testid="save-branding-button"
            className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-4"
          >
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            Save Branding
          </EasyXButton>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* 1. App Identity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/90">
                Application Name
              </label>
              <input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="EasyX"
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white placeholder:text-white/30 focus:border-purple-500 focus:outline-none"
                data-testid="branding-app-name-input"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/90">
                Platform Tagline
              </label>
              <input
                type="text"
                value={appTagline}
                onChange={(e) => setAppTagline(e.target.value)}
                placeholder="High-Yield Wealth Management"
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white placeholder:text-white/30 focus:border-purple-500 focus:outline-none"
                data-testid="branding-tagline-input"
              />
            </div>
          </div>

          {/* 2. App Icon Mode Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-white/90 flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5 text-purple-400" />
                Custom Icon Image (Upload or URL)
              </label>
              {hasCustomIcon && (
                <button
                  type="button"
                  onClick={() => setAppIconUrl("")}
                  className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 font-medium transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                  Remove Custom Image
                </button>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-black/30 p-4 space-y-3">
              {/* Drag/Drop & File Input */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => handleFileUpload(e, "app_icon")}
                  accept="image/png,image/jpeg,image/svg+xml,image/webp,image/x-icon,image/vnd.microsoft.icon"
                  className="hidden"
                />
                <EasyXButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  loading={uploadIcon.isPending}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 border-dashed border-purple-500/40 hover:border-purple-400 bg-purple-500/5 text-purple-300 hover:bg-purple-500/10 text-xs py-2 px-4 shrink-0"
                  data-testid="upload-icon-button"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload Image File
                </EasyXButton>

                <div className="text-[11px] text-white/50 text-center sm:text-left">
                  Supports PNG, SVG, JPG, WebP or ICO (recommended 512x512px).
                </div>
              </div>

              {/* URL Input */}
              <div className="space-y-1">
                <div className="text-[11px] text-white/70 font-medium">
                  Or enter direct Image URL:
                </div>
                <input
                  type="url"
                  value={appIconUrl}
                  onChange={(e) => {
                    setAppIconUrl(e.target.value);
                    if (syncFavicon) setFaviconUrl(e.target.value);
                  }}
                  placeholder="https://example.com/logo.png"
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs font-mono text-white placeholder:text-white/30 focus:border-purple-500 focus:outline-none"
                  data-testid="branding-icon-url-input"
                />
              </div>
            </div>
          </div>

          {/* 3. Icon Presets (When no custom image or for quick styling) */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold text-white/90 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                Handcrafted Vector Presets (Fallback & Default Styles)
              </span>
              <span className="text-[11px] text-white/40">Select to activate</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {ICON_PRESETS.map((preset) => {
                const isSelected = iconPreset === preset.id;
                const PresetIcon = preset.icon;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setIconPreset(preset.id);
                    }}
                    className={`relative flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "border-purple-500 bg-purple-500/15 ring-1 ring-purple-500/50 shadow-md"
                        : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/5"
                    }`}
                    data-testid={`preset-button-${preset.id}`}
                  >
                    <div
                      className={`h-8 w-8 rounded-lg shrink-0 grid place-items-center bg-gradient-to-br ${preset.bgGradient} text-white shadow-sm`}
                    >
                      <PresetIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate">
                        {preset.name}
                      </div>
                      <div className="text-[10px] text-white/50 truncate">
                        {preset.description}
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Icon Shape & Styling */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold text-white/90 flex items-center gap-1.5">
              <Sliders className="h-3.5 w-3.5 text-purple-400" />
              Icon Geometry & Corner Radius
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ICON_SHAPES.map((shape) => {
                const isSelected = iconShape === shape.id;
                return (
                  <button
                    key={shape.id}
                    type="button"
                    onClick={() => setIconShape(shape.id)}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      isSelected
                        ? "border-purple-500 bg-purple-500/15 text-white ring-1 ring-purple-500/40 font-bold"
                        : "border-white/10 bg-black/20 text-white/70 hover:border-white/20 hover:bg-white/5"
                    }`}
                  >
                    <div className="text-xs font-semibold">{shape.name}</div>
                    <div className="text-[10px] text-white/40 mt-0.5">{shape.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. Favicon Sync Controls */}
          <div className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-cyan-400" />
                <span className="text-xs font-semibold text-white">
                  Browser Tab Favicon Configuration
                </span>
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={syncFavicon}
                  onChange={(e) => {
                    setSyncFavicon(e.target.checked);
                    if (e.target.checked) setFaviconUrl(appIconUrl);
                  }}
                  className="rounded border-white/20 bg-black/40 text-purple-600 focus:ring-purple-500 h-4 w-4"
                />
                <span className="text-xs text-white/80">Sync with App Icon</span>
              </label>
            </div>

            {!syncFavicon && (
              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={faviconInputRef}
                    onChange={(e) => handleFileUpload(e, "favicon")}
                    accept="image/x-icon,image/vnd.microsoft.icon,image/png,image/svg+xml"
                    className="hidden"
                  />
                  <EasyXButton
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => faviconInputRef.current?.click()}
                    className="text-xs shrink-0"
                  >
                    <Upload className="h-3 w-3 mr-1.5" />
                    Upload .ico / .png
                  </EasyXButton>
                  <input
                    type="url"
                    value={faviconUrl}
                    onChange={(e) => setFaviconUrl(e.target.value)}
                    placeholder="Separate Favicon URL (e.g. /favicon.ico)"
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Live Previews (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <Eye className="h-4 w-4 text-purple-400" />
              Real-Time Platform Previews
            </div>
            {/* Tab Selector */}
            <div className="flex items-center rounded-lg bg-black/40 p-0.5 border border-white/10 text-[11px]">
              <button
                type="button"
                onClick={() => setPreviewTab("mobile")}
                className={`px-2 py-1 rounded-md font-medium transition-all ${
                  previewTab === "mobile"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-white/60 hover:text-white"
                }`}
              >
                Mobile
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab("browser")}
                className={`px-2 py-1 rounded-md font-medium transition-all ${
                  previewTab === "browser"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-white/60 hover:text-white"
                }`}
              >
                Tab
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab("navbar")}
                className={`px-2 py-1 rounded-md font-medium transition-all ${
                  previewTab === "navbar"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-white/60 hover:text-white"
                }`}
              >
                Header
              </button>
            </div>
          </div>

          {/* Preview Canvas Container */}
          <div className="rounded-2xl border border-white/12 bg-gradient-to-b from-black/60 to-black/90 p-5 min-h-[300px] flex flex-col justify-center items-center relative overflow-hidden">
            {/* Background decorative glow */}
            <div className="absolute -top-12 -right-12 h-36 w-36 rounded-full bg-purple-600/15 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-indigo-600/15 blur-3xl pointer-events-none" />

            {previewTab === "mobile" && (
              <div className="flex flex-col items-center text-center space-y-3 z-10 animate-fade-in">
                <div className="text-[11px] font-semibold text-white/50 uppercase tracking-widest">
                  iOS / Android Home Screen Tile
                </div>
                {/* Simulated Phone Home Screen Icon Tile */}
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 shadow-2xl backdrop-blur-md">
                  <AppLogo
                    size="2xl"
                    shape={iconShape}
                    customIconUrl={appIconUrl}
                    customName={appName}
                    customPreset={iconPreset}
                    className="shadow-2xl hover:scale-105 transition-transform"
                  />
                </div>
                <div className="font-bold text-sm text-white drop-shadow">
                  {appName || "EasyX"}
                </div>
                <div className="text-[10px] text-white/40 max-w-[200px]">
                  {appTagline || "High-Yield Wealth Management"}
                </div>
              </div>
            )}

            {previewTab === "browser" && (
              <div className="w-full space-y-3 z-10 animate-fade-in">
                <div className="text-[11px] font-semibold text-white/50 text-center uppercase tracking-widest">
                  Browser Tab Live Simulation
                </div>
                {/* Simulated Chrome Browser Window Header */}
                <div className="rounded-xl border border-white/15 bg-[#1e1e24] overflow-hidden shadow-2xl">
                  {/* Window Controls */}
                  <div className="flex items-center gap-1.5 px-3 py-2 bg-[#16161a] border-b border-white/5">
                    <div className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
                    <div className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                    <div className="ml-3 flex-1">
                      {/* Active Tab */}
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-t-lg bg-[#1e1e24] text-[11px] text-white border-t border-x border-white/10 font-medium">
                        <AppLogo
                          size="xs"
                          shape="circle"
                          customIconUrl={syncFavicon ? appIconUrl : faviconUrl || appIconUrl}
                          customPreset={iconPreset}
                        />
                        <span className="truncate max-w-[120px]">
                          {appName} | Wealth
                        </span>
                        <span className="text-white/40 ml-1 hover:text-white cursor-pointer">×</span>
                      </div>
                    </div>
                  </div>
                  {/* Address Bar */}
                  <div className="p-2.5 bg-[#1e1e24] flex items-center gap-2">
                    <div className="flex-1 rounded-md bg-black/40 border border-white/10 px-2.5 py-1 text-[11px] text-white/70 flex items-center gap-1.5 font-mono">
                      <ShieldCheck className="h-3 w-3 text-emerald-400" />
                      <span>https://app.{appName.toLowerCase().replace(/\s+/g, "")}.io/dashboard</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {previewTab === "navbar" && (
              <div className="w-full space-y-3 z-10 animate-fade-in">
                <div className="text-[11px] font-semibold text-white/50 text-center uppercase tracking-widest">
                  App Top Navigation Bar Preview
                </div>
                {/* Simulated Header */}
                <div className="rounded-xl border border-white/15 bg-black/60 backdrop-blur-md p-3 flex items-center justify-between shadow-2xl">
                  <AppLogo
                    size="md"
                    shape={iconShape}
                    showName
                    subtitle="OFFICIAL"
                    customIconUrl={appIconUrl}
                    customName={appName}
                    customPreset={iconPreset}
                  />
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[11px] font-semibold text-emerald-300">Live</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleResetToDefault}
              className="text-xs text-white/50 hover:text-white transition-colors"
            >
              Reset to Factory Defaults
            </button>
            <EasyXButton
              type="button"
              size="sm"
              onClick={handleSave}
              loading={saveBranding.isPending}
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
            >
              Save Branding & Icon
            </EasyXButton>
          </div>
        </div>
      </div>
    </EasyXCard>
  );
}
