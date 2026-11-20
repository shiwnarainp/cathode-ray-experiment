// Standalone test harness for engine.js — runs under JavaScriptCore via
// `osascript -l JavaScript test-engine.js` (no Node.js runtime available
// in this environment).

const app = Application.currentApplication();
app.includeStandardAdditions = true;
const src = app.read(Path("/Users/kevin/cathode-ray-experiment/engine.js"));
eval(src);
const E = CRTEngine;

let passed = 0, failed = 0;
function approx(a, b, tol) { return Math.abs(a - b) <= (tol === undefined ? 1e-6 : tol); }
function check(name, cond) { if (cond) { passed++; } else { failed++; console.log("FAIL: " + name); } }

const base = { plateStart: 0.4, plateEnd: 0.6, fieldOn: true, strength: 0.5, direction: 1 };

// --- field OFF or zero strength => beam is always perfectly straight ---
check("field off: y=0 before plates", E.beamY(0.2, Object.assign({}, base, { fieldOn: false })) === 0);
check("field off: y=0 inside plates", E.beamY(0.5, Object.assign({}, base, { fieldOn: false })) === 0);
check("field off: y=0 after plates (at screen)", E.beamY(0.95, Object.assign({}, base, { fieldOn: false })) === 0);
check("zero strength: y=0 even with field on", E.beamY(0.95, Object.assign({}, base, { strength: 0 })) === 0);

// --- before the plates, beam is always on the centerline ---
check("before plates: y=0", E.beamY(0.1, base) === 0);
check("exactly at plate start: y=0", E.beamY(0.4, base) === 0);

// --- inside the plates: deflection grows (parabolic) ---
{
  const yMid = E.beamY(0.5, base);
  const yEnd = E.beamY(0.6, base);
  check("inside plates: deflection increases with x", yMid > 0 && yEnd > yMid);
}

// --- direction sign flips the deflection (this models "reverse the charges") ---
{
  const yPos = E.beamY(0.6, Object.assign({}, base, { direction: 1 }));
  const yNeg = E.beamY(0.6, Object.assign({}, base, { direction: -1 }));
  check("reversing direction mirrors the deflection", approx(yPos, -yNeg));
}

// --- stronger field => more deflection (monotonic in strength) ---
{
  const yWeak = E.beamY(0.6, Object.assign({}, base, { strength: 0.2 }));
  const yStrong = E.beamY(0.6, Object.assign({}, base, { strength: 0.9 }));
  check("stronger field deflects more", yStrong > yWeak && yWeak > 0);
}

// --- after the plates: straight line continuation (no more curving) ---
{
  const y1 = E.beamY(0.6, base);
  const y2 = E.beamY(0.8, base);
  const y3 = E.beamY(1.0, base);
  const slopeA = (y2 - y1) / (0.8 - 0.6);
  const slopeB = (y3 - y2) / (1.0 - 0.8);
  check("beyond plates: beam travels in a straight line (constant slope)", approx(slopeA, slopeB, 1e-9));
}

// --- continuity at the plate exit: value and slope must match the parabola's ---
{
  const eps = 1e-6;
  const yAtExit = E.beamY(0.6, base);
  const yJustAfter = E.beamY(0.6 + eps, base);
  const slopeJustAfter = (yJustAfter - yAtExit) / eps;
  const analyticSlope = 2 * (base.strength * E.K_CONST) * (base.plateEnd - base.plateStart) * base.direction;
  check("value is continuous at the plate exit", approx(yAtExit, E.beamY(0.6, base)));
  check("slope matches the parabola's analytic exit slope", approx(slopeJustAfter, analyticSlope, 1e-3));
}

check("screenHitY matches beamY at the same x", E.screenHitY(0.95, base) === E.beamY(0.95, base));

// --- content sanity ---
check("exactly 5 investigation questions", E.INVESTIGATION_QUESTIONS.length === 5);
check("exactly 5 quiz questions", E.QUIZ_QUESTIONS.length === 5);
check("every quiz question has a valid correctIndex", E.QUIZ_QUESTIONS.every((q) => q.correctIndex >= 0 && q.correctIndex < q.choices.length));
check("every quiz question has exactly 4 choices", E.QUIZ_QUESTIONS.every((q) => q.choices.length === 4));
check("no duplicate quiz ids", new Set(E.QUIZ_QUESTIONS.map((q) => q.id)).size === E.QUIZ_QUESTIONS.length);

console.log("\n" + passed + " passed, " + failed + " failed");
if (failed > 0) { $.exit(1); }
