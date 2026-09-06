import { toast } from "sonner";

/**
 * Toast Notification Helpers for user actions and feedback
 */

export const notifySuccess = (title, description, options = {}) => {
  return toast.success(title, {
    description,
    duration: 3500,
    ...options,
  });
};

export const notifyError = (title, description, options = {}) => {
  return toast.error(title, {
    description: typeof description === "string" ? description : "An unexpected issue occurred. Please try again.",
    duration: 4000,
    ...options,
  });
};

export const notifyInfo = (title, description, options = {}) => {
  return toast.info(title, {
    description,
    duration: 3500,
    ...options,
  });
};

/**
 * Copy to clipboard with instant visual toast feedback
 */
export const copyWithToast = async (text, label = "Item") => {
  if (!text) return false;
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback for non-secure contexts
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    toast.success(`${label} copied to clipboard!`, {
      description: "Ready to paste and share.",
      duration: 3000,
    });
    return true;
  } catch (err) {
    toast.error(`Could not copy ${label.toLowerCase()}`, {
      description: "Please copy the text manually.",
    });
    return false;
  }
};

/**
 * Account settings update feedback helper
 */
export const notifySettingsUpdated = (sectionName = "Account settings") => {
  toast.success(`${sectionName} updated successfully`, {
    description: "Your changes have been saved to your profile.",
    duration: 3500,
  });
};
