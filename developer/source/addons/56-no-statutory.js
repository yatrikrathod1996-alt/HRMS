/* Acme Labs pays full salary as in the HR time sheet: no PF or ESIC is deducted.
   Switched off once; it can still be turned back on in Settings. */
function applyNoStatutory() {
  if (S.noStatutoryV1) return false;
  S.noStatutoryV1 = true;
  S.settings.pfCovered = false;
  S.settings.esiCovered = false;
  save();
  return true;
}
applyNoStatutory();
// a data file connected later (or a restored backup) gets the same one-time update
afterRender.push(() => {
  if (applyNoStatutory()) render();
});
