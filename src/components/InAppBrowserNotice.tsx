import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Copy, Check, ExternalLink } from "lucide-react";
import { detectInAppBrowser } from "@/lib/inAppBrowser";

/**
 * Warns when the page is inside a native app's in-app browser (Instagram,
 * Facebook, TikTok, the Google app, etc.), where Instagram/Meta OAuth cannot
 * complete. The only reliable fix is to open the page in the real browser:
 *   • Android → a one-tap `intent://` link force-opens the real browser.
 *   • iOS     → no programmatic escape exists; guide to "Open in Safari".
 * Renders nothing in a normal browser.
 */

/** Current https:// URL → Android `intent://` URL that opens the DEFAULT browser. */
function buildAndroidIntentUrl(url: string): string {
  try {
    const u = new URL(url);
    const hostPath = `${u.host}${u.pathname}${u.search}`; // scheme goes in the fragment
    return `intent://${hostPath}#Intent;scheme=https;end`;
  } catch {
    return url;
  }
}

export function InAppBrowserNotice({ className }: { className?: string }) {
  const [copied, setCopied] = useState(false);
  const inApp = detectInAppBrowser();

  if (!inApp.isInApp) return null;

  const host = inApp.appLabel ?? "this app";
  const currentUrl = typeof window !== "undefined" ? window.location.href : "";

  const copyLink = async () => {
    try {
      await navigator.clipboard?.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable in some webviews — safe to ignore.
    }
  };

  const copyButton = (
    <button
      type="button"
      onClick={copyLink}
      className="inline-flex items-center gap-1.5 font-medium text-foreground hover:text-primary transition-colors"
    >
      {copied ? (
        <>
          <Check className="h-3 w-3" /> Link copied
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" /> Copy link
        </>
      )}
    </button>
  );

  return (
    <Alert className={`text-left border-yellow-500/30 bg-yellow-500/5 ${className ?? ""}`}>
      <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
      <AlertDescription className="text-xs text-muted-foreground leading-relaxed">
        {inApp.platform === "android" ? (
          <>
            <p className="mb-2">
              Instagram sign-in doesn't work inside <strong className="text-foreground">{host}</strong>. Open this page
              in your browser to connect.
            </p>
            {/* Native anchor = the reliable trigger; the tap IS the required user gesture. */}
            <a
              href={buildAndroidIntentUrl(currentUrl)}
              className="inline-flex items-center gap-1.5 font-medium text-foreground hover:text-primary transition-colors"
            >
              <ExternalLink className="h-3 w-3" /> Open in browser
            </a>
            <p className="mt-2">
              If nothing happens, tap the <strong className="text-foreground">•••</strong> menu at the top and choose
              "Open in browser" — or {copyButton}.
            </p>
          </>
        ) : inApp.platform === "ios" ? (
          <>
            <p className="mb-2">
              Instagram sign-in doesn't work inside <strong className="text-foreground">{host}</strong>. Tap the{" "}
              <strong className="text-foreground">•••</strong> (or share) icon in the browser bar and choose{" "}
              <strong className="text-foreground">"Open in Safari"</strong> to connect.
            </p>
            {copyButton}
          </>
        ) : (
          <>
            <p className="mb-2">
              Instagram sign-in doesn't work inside <strong className="text-foreground">{host}</strong>. Open this page
              in your device's main browser to connect.
            </p>
            {copyButton}
          </>
        )}
      </AlertDescription>
    </Alert>
  );
}
