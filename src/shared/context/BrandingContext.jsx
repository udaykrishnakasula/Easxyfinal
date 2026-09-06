import React, { createContext, useContext, useEffect } from "react";
import { useAppBranding } from "@/admin/adminApi";

const DEFAULT_APP_ICON = "/uploads/branding/brand_1788453379866_40p372p.png";

const BrandingContext = createContext({
  branding: null,
  appName: "EasyX",
  appTagline: "High-Yield Wealth Management",
  appIconUrl: DEFAULT_APP_ICON,
  faviconUrl: DEFAULT_APP_ICON,
  iconShape: "rounded",
  iconPreset: "default",
});

export function BrandingProvider({ children }) {
  const { data: branding } = useAppBranding();

  const appName = branding?.app_name || "EasyX";
  const appTagline = branding?.app_tagline || "High-Yield Wealth Management";
  const appIconUrl = branding?.app_icon_url || DEFAULT_APP_ICON;
  const faviconUrl = branding?.favicon_url || branding?.app_icon_url || DEFAULT_APP_ICON;
  const iconShape = branding?.icon_shape || "rounded";
  const iconPreset = branding?.icon_preset || "default";

  // Dynamic Favicon & WebApp Icon Sync in DOM
  useEffect(() => {
    try {
      if (faviconUrl) {
        // Update or insert standard favicon link
        let iconLink = document.querySelector("link[rel='icon']");
        if (!iconLink) {
          iconLink = document.createElement("link");
          iconLink.setAttribute("rel", "icon");
          document.head.appendChild(iconLink);
        }
        iconLink.setAttribute("href", faviconUrl);

        // Update shortcut icon
        let shortcutLink = document.querySelector("link[rel='shortcut icon']");
        if (!shortcutLink) {
          shortcutLink = document.createElement("link");
          shortcutLink.setAttribute("rel", "shortcut icon");
          document.head.appendChild(shortcutLink);
        }
        shortcutLink.setAttribute("href", faviconUrl);

        // Update Apple touch icon for mobile webapp home screen
        let appleLink = document.querySelector("link[rel='apple-touch-icon']");
        if (!appleLink) {
          appleLink = document.createElement("link");
          appleLink.setAttribute("rel", "apple-touch-icon");
          document.head.appendChild(appleLink);
        }
        appleLink.setAttribute("href", appIconUrl || faviconUrl);
      }
    } catch {
      // ignore in environments without DOM
    }
  }, [faviconUrl, appIconUrl]);

  return (
    <BrandingContext.Provider
      value={{
        branding,
        appName,
        appTagline,
        appIconUrl,
        faviconUrl,
        iconShape,
        iconPreset,
      }}
    >
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}
