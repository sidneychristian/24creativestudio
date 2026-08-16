(function () {
  "use strict";
  const config = window.STUDIO24_CONFIG || {};
  const configured = Boolean(
    config.supabaseUrl &&
    config.supabasePublishableKey &&
    !config.supabaseUrl.startsWith("COLE_") &&
    !config.supabasePublishableKey.startsWith("COLE_") &&
    window.supabase
  );
  window.STUDIO24_SUPABASE_READY = configured;
  window.studio24Supabase = configured
    ? window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      })
    : null;
})();
