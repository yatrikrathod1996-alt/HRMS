/* open on the Dashboard */
try {
  if (typeof S !== 'undefined' && S && S.employees) showDash(true);
  else openTab = 'dashboard';
} catch (err) {
  console.warn('dashboard start', err);
  openTab = 'dashboard';
}
