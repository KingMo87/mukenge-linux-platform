/* ── Reliable "fire GA4 event, then navigate" helper ─────────────────────
   Fixes the beacon-drop bug: firing gtag() immediately before
   window.location.href = url (or a native link navigation) can cut the
   request off before it leaves the browser. We block navigation for at
   most 600ms, using GA4's event_callback if it fires sooner, so the hit
   has a guaranteed chance to send. Safe to call from onclick="return ..." */
window.trackAndGo = function (eventName, params, url) {
  try {
    if (typeof gtag !== 'function') return true; // gtag missing, let link work normally

    let navigated = false;
    const go = function () {
      if (navigated) return;
      navigated = true;
      window.location.href = url;
    };

    gtag('event', eventName, Object.assign({}, params, {
      event_callback: go,
      event_timeout: 600,
    }));
    setTimeout(go, 600); // fallback in case event_callback never fires (adblock, etc.)
  } catch (e) {
    console.error('[moshell-analytics] trackAndGo failed', e);
    window.location.href = url;
  }
  return false; // caller's onclick should `return trackAndGo(...)` to cancel default nav
};

/* Fire-and-forget click tracking for CTAs that don't need nav-blocking
   (e.g. same-page anchors, or target="_blank" links where the current
   page never unloads). */
window.trackCta = function (label, params) {
  try {
    if (typeof gtag !== 'function') return;
    gtag('event', 'select_content', Object.assign({ content_type: 'cta', item_id: label }, params));
  } catch (e) {
    console.error('[moshell-analytics] trackCta failed', e);
  }
};

/* Fires once per session on the first terminal command a user types.
   This is the actual core interaction of the product, and previously had
   zero GA4 instrumentation — sessions could involve real, sustained use
   of the sandbox and still register as "unengaged" if the user didn't
   also trigger a CTA click or finish a full lesson. engagement_time_msec
   tells GA4 directly to count this session as engaged, rather than
   relying purely on the default dwell-time heuristic. */
window.trackTerminalUse = function () {
  try {
    if (typeof gtag !== 'function') return;

    const sessionKey = 'ms_ga_first_cmd_session';
    if (sessionStorage.getItem(sessionKey)) return;

    gtag('event', 'terminal_first_command', {
      engagement_time_msec: 1,
    });

    sessionStorage.setItem(sessionKey, '1');
    console.log('[moshell-analytics] terminal_first_command event fired');
  } catch (e) {
    console.error('[moshell-analytics] trackTerminalUse failed', e);
  }
};

/* Fires once per session at the 10th distinct command, as a signal of
   real depth-of-use rather than a single curious command before leaving.
   Useful as a GA4 Key Event separate from purchases — "used the product
   seriously" is a conversion worth tracking on its own. */
window.trackTerminalPowerUser = function (commandCount) {
  try {
    if (typeof gtag !== 'function') return;
    if (commandCount !== 10) return;

    const sessionKey = 'ms_ga_power_user_session';
    if (sessionStorage.getItem(sessionKey)) return;

    gtag('event', 'terminal_power_user', {
      engagement_time_msec: 1,
    });

    sessionStorage.setItem(sessionKey, '1');
    console.log('[moshell-analytics] terminal_power_user event fired');
  } catch (e) {
    console.error('[moshell-analytics] trackTerminalPowerUser failed', e);
  }
};

window.trackLessonComplete = function (lessonId) {
  try {
    if (typeof gtag !== 'function') {
      console.warn('[moshell-analytics] gtag not available');
      return;
    }

    const sessionKey = 'ms_ga_lesson_' + lessonId + '_session';
    if (sessionStorage.getItem(sessionKey)) {
      console.log('[moshell-analytics] lesson ' + lessonId + ' already tracked this session');
      return;
    }

    gtag('event', 'lesson_complete', {
      lesson_number: lessonId,
      lesson_label: 'Lesson ' + String(lessonId).padStart(2, '0'),
    });

    sessionStorage.setItem(sessionKey, '1');
    console.log('[moshell-analytics] lesson_complete event fired for lesson ' + lessonId);
  } catch (e) {
    console.error('[moshell-analytics] tracking failed', e);
  }
};
