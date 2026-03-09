console.log('[demo] preferences script executed');
try {
  localStorage.setItem('demo_preferences', '1');
} catch (_error) {
}
window.demoPreferencesLoaded = true;
