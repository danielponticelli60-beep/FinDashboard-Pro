import { useCallback, useEffect, useState } from 'react';

// Root-level query param (see VOICE_INPUT_SPEC.md for why: no client-side
// router exists in this app, GitHub Pages has no server-side rewrite for a
// /voice sub-path, and Electron loads via file:// where sub-paths don't
// resolve at all). 'command' is also accepted for tolerance with the
// alternate /voice?command= form some documentation may reference.
const QUERY_PARAM_NAMES = ['voiceCommand', 'command'];
const MAX_COMMAND_LENGTH = 500;

/**
 * Detects a dictated command arriving via deep link
 * (https://[app]/?voiceCommand=...). Only ever reads and clears a URL query
 * param - never saves anything, never calls any API. The text is handed to
 * VoiceCommandReviewModal, which is the only place a transaction can
 * actually be created, and only after an explicit user tap.
 */
export function useVoiceCommandDeepLink() {
  const [pendingCommandText, setPendingCommandText] = useState<string | null>(null);

  const checkForDeepLink = useCallback(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      let raw: string | null = null;
      for (const name of QUERY_PARAM_NAMES) {
        const val = params.get(name);
        if (val) {
          raw = val;
          break;
        }
      }
      if (raw && raw.trim()) {
        setPendingCommandText(raw.slice(0, MAX_COMMAND_LENGTH));
        // Strip the param immediately so a refresh, or returning to the app
        // later, never re-triggers the same dictated command, and the text
        // doesn't linger in browser history.
        const url = new URL(window.location.href);
        QUERY_PARAM_NAMES.forEach((n) => url.searchParams.delete(n));
        window.history.replaceState({}, '', url.toString());
      }
    } catch (e) {
      console.error('Failed to read voice command deep link', e);
    }
  }, []);

  useEffect(() => {
    checkForDeepLink();
    // Covers the app already being open when the Shortcut fires again - on
    // most platforms the OS re-focuses the existing PWA window/tab with the
    // new URL rather than reloading it.
    document.addEventListener('visibilitychange', checkForDeepLink);
    window.addEventListener('focus', checkForDeepLink);
    return () => {
      document.removeEventListener('visibilitychange', checkForDeepLink);
      window.removeEventListener('focus', checkForDeepLink);
    };
  }, [checkForDeepLink]);

  const clearPendingCommand = useCallback(() => setPendingCommandText(null), []);

  return { pendingCommandText, clearPendingCommand };
}
