// Public pages only need session state for account navigation, not order APIs.
(() => {
  const config = window.NAMCUMZ_CONFIG;
  if (!window.supabase || !config?.supabaseUrl || !config?.supabaseAnonKey) return;
  const client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
  // Expose only the existing public profile RPC needed by storefront rankings.
  window.NAMCUMZ_PUBLIC_API = Object.freeze({boosterProfiles: () => client.rpc('booster_profiles')});
  client.auth.onAuthStateChange((_event, session) => {
    window.NAMCUMZ_PUBLIC_USER = session?.user || null;
    window.dispatchEvent(new Event('namcumz-auth-updated'));
  });
})();