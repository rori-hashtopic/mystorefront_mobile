// src/lib/inAppBrowser.ts
//
// Detects whether the current browsing context is an embedded in-app browser
// (a webview hosted inside a native app such as Instagram, Facebook, TikTok,
// the Google app, Snapchat, LinkedIn, etc.) as opposed to a real standalone
// browser (mobile Safari, Chrome/CriOS, Firefox/FxiOS, or any desktop browser).
//
// Why this exists: several native apps' embedded webviews block or break
// third-party OAuth flows (notably Instagram/Meta OAuth). Redirecting into
// them is a dead end, so we detect the host app and guide the user to open
// the page in a real browser instead.
//
// This is a heuristic based on user-agent tokens. It is intentionally
// conservative: it only flags a context as in-app when a KNOWN host-app
// token is present, so it will not false-positive on real Safari/Chrome/
// Firefox or desktop browsers.

export type InAppPlatform = "ios" | "android" | "other";

export interface InAppBrowserResult {
  /** True only when a known in-app webview host token is detected. */
  isInApp: boolean;
  /** Best-effort platform of the current device. */
  platform: InAppPlatform;
  /** Machine-readable id of the detected host app, or null. */
  app:
    | "instagram"
    | "facebook"
    | "tiktok"
    | "google"
    | "snapchat"
    | "linkedin"
    | "line"
    | "pinterest"
    | "twitter"
    | "whatsapp"
    | "reddit"
    | "telegram"
    | "discord"
    | "wechat"
    | "kakaotalk"
    | "generic-webview"
    | null;
  /** Human-friendly label for the detected host app (e.g. "Instagram"). */
  appLabel: string | null;
}

interface HostAppRule {
  app: NonNullable<InAppBrowserResult["app"]>;
  label: string;
  /** Matched case-insensitively against the raw user-agent string. */
  tokens: RegExp;
}

// Order matters: more specific host apps are checked before the generic
// Android "wv" webview fallback.
const HOST_APP_RULES: HostAppRule[] = [
  // Instagram iOS: "Instagram 300.0.0..." ; Android: "... Instagram ..."
  { app: "instagram", label: "Instagram", tokens: /Instagram/i },
  // Facebook / Messenger: FBAN (app name), FBAV (app version), FB_IAB (in-app browser)
  { app: "facebook", label: "Facebook", tokens: /\bFBAN\b|\bFBAV\b|\bFB_IAB\b|\bFBIOS\b|FB4A|FBBV/i },
  // TikTok: BytedanceWebview (iOS/Android IAB), musical_ly / trill (legacy app names), aweme
  { app: "tiktok", label: "TikTok", tokens: /BytedanceWebview|musical_ly|\btrill\b|\bAweme\b|TikTok/i },
  // Google app (in-app browser identifies itself with the GSA token)
  { app: "google", label: "the Google app", tokens: /\bGSA\/[\d.]+/i },
  // Snapchat
  { app: "snapchat", label: "Snapchat", tokens: /Snapchat/i },
  // LinkedIn
  { app: "linkedin", label: "LinkedIn", tokens: /LinkedInApp|\bLinkedIn\b/i },
  // LINE
  { app: "line", label: "LINE", tokens: /\bLine\/[\d.]+|\bLINE\/[\d.]+/i },
  // Pinterest
  { app: "pinterest", label: "Pinterest", tokens: /\bPinterest\b/i },
  // Twitter / X
  { app: "twitter", label: "Twitter", tokens: /Twitter(?:ForiPhone|ForiPad|Android)?/i },
  // Common messaging / social apps whose in-app browsers also break OAuth
  { app: "whatsapp", label: "WhatsApp", tokens: /WhatsApp/i },
  { app: "reddit", label: "Reddit", tokens: /\bReddit\b/i },
  { app: "telegram", label: "Telegram", tokens: /\bTelegram\b/i },
  { app: "discord", label: "Discord", tokens: /\bDiscord\b/i },
  { app: "wechat", label: "WeChat", tokens: /MicroMessenger/i },
  { app: "kakaotalk", label: "KakaoTalk", tokens: /KAKAOTALK/i },
];

// Tokens that positively identify a REAL standalone browser. Their presence
// alone does not clear an in-app flag (some webviews mimic them), but the
// generic-webview fallback below explicitly excludes them so we never treat
// real Chrome/Firefox/Edge/etc. on iOS as an embedded webview.
const REAL_BROWSER_TOKENS =
  /\b(CriOS|FxiOS|EdgiOS|OPiOS|OPR|EdgA|SamsungBrowser|DuckDuckGo|YaBrowser|Brave|Firefox|Edg)\b/i;

function getPlatform(ua: string): InAppPlatform {
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  // iPadOS 13+ Safari reports a Mac UA; disambiguate via touch points.
  if (
    /Macintosh/i.test(ua) &&
    typeof navigator !== "undefined" &&
    typeof navigator.maxTouchPoints === "number" &&
    navigator.maxTouchPoints > 1
  ) {
    return "ios";
  }
  if (/Android/i.test(ua)) return "android";
  return "other";
}

/**
 * Detect whether we are running inside a known native app's embedded webview.
 * SSR-safe and dependency-free.
 */
export function detectInAppBrowser(userAgent?: string): InAppBrowserResult {
  const ua = userAgent ?? (typeof navigator !== "undefined" ? navigator.userAgent || "" : "");

  const platform = getPlatform(ua);
  const notInApp: InAppBrowserResult = {
    isInApp: false,
    platform,
    app: null,
    appLabel: null,
  };

  if (!ua) return notInApp;

  // 1. Known host apps — highest confidence.
  for (const rule of HOST_APP_RULES) {
    if (rule.tokens.test(ua)) {
      return {
        isInApp: true,
        platform,
        app: rule.app,
        appLabel: rule.label,
      };
    }
  }

  // 2. Generic Android WebView fallback: the "wv" token marks an Android
  //    System WebView, which real Chrome for Android never emits. Guard
  //    against real browsers that add their own tokens just in case.
  if (platform === "android" && /;\s*wv\)|\bwv\b/i.test(ua) && !REAL_BROWSER_TOKENS.test(ua)) {
    return {
      isInApp: true,
      platform,
      app: "generic-webview",
      appLabel: "an in-app browser",
    };
  }

  // Everything else — real Safari, Chrome (CriOS), Firefox (FxiOS),
  // desktop browsers — is treated as a normal browser.
  return notInApp;
}

/** Convenience boolean wrapper. */
export function isInAppBrowser(userAgent?: string): boolean {
  return detectInAppBrowser(userAgent).isInApp;
}
