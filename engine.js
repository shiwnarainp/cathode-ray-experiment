/*
 * Cathode Ray Tube Experiment — pure physics + content engine.
 * No DOM access, so this loads both in the browser and in the standalone
 * test harness (test-engine.js).
 *
 * Deflection model: inside the deflection plates the beam follows a
 * parabola (constant transverse acceleration from the electric field,
 * constant horizontal velocity — the standard idealized CRT treatment);
 * once the beam exits the plates it travels in a straight line at the
 * exit angle, since there is no field beyond the plates. This is the
 * same physics a Regents/intro-physics treatment of CRT deflection uses.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.CRTEngine = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const K_CONST = 0.9; // shapes how strongly the field curves the beam; tuned for a visually clear parabola within the plate gap

  /**
   * y-position of the beam at horizontal position x (all in the same
   * normalized units, e.g. 0..1 along the tube).
   * opts: { plateStart, plateEnd, fieldOn, strength (0..1), direction (+1 or -1) }
   */
  function beamY(x, opts) {
    const { plateStart, plateEnd, fieldOn, strength, direction } = opts;
    if (!fieldOn || !(strength > 0) || x <= plateStart) return 0;
    const k = strength * K_CONST;
    const xp = Math.min(x, plateEnd) - plateStart;
    const yAtXp = direction * k * xp * xp;
    if (x <= plateEnd) return yAtXp;
    const slopeAtExit = direction * 2 * k * (plateEnd - plateStart);
    return yAtXp + slopeAtExit * (x - plateEnd);
  }

  /** Where the beam strikes the screen (x = screenX), same units as beamY. */
  function screenHitY(screenX, opts) {
    return beamY(screenX, opts);
  }

  const INVESTIGATION_QUESTIONS = [
    { id: "i1", prompt: "What happened to the beam when the electric field was OFF?", model: "The beam traveled in a straight line from the cathode, through the plates, to the center of the fluorescent screen — it wasn't deflected at all." },
    { id: "i2", prompt: "What happened to the beam when the electric field was ON?", model: "The beam curved while passing between the plates and struck the screen off-center, bending toward the positively charged plate." },
    { id: "i3", prompt: "Which charged plate attracted the cathode rays?", model: "The positively charged plate attracted the beam — the beam always bent toward whichever plate was positive." },
    { id: "i4", prompt: "What does this tell us about the charge of cathode rays?", model: "Since the beam was attracted to the positive plate and repelled by the negative plate, cathode rays must themselves be negatively charged." },
    { id: "i5", prompt: "How did Thomson's experiment change scientists' understanding of atoms?", model: "It showed atoms are not indivisible solid spheres (Dalton's model) — they contain smaller, negatively charged particles (electrons), leading Thomson to propose the \"plum pudding\" model." },
  ];

  const QUIZ_QUESTIONS = [
    {
      id: "q1",
      prompt: "In Thomson's cathode ray tube, what happens to the beam when the electric field is turned on?",
      choices: ["It stops moving", "It bends toward the positively charged plate", "It bends toward the negatively charged plate", "It passes through unaffected"],
      correctIndex: 1,
      explanation: "The beam bends toward the positive plate because cathode rays are negatively charged, and opposite charges attract.",
    },
    {
      id: "q2",
      prompt: "What is the charge of the particles that make up cathode rays?",
      choices: ["Positive", "Negative", "Neutral", "The charge varies"],
      correctIndex: 1,
      explanation: "Cathode rays are streams of electrons, which carry a negative charge.",
    },
    {
      id: "q3",
      prompt: "If the deflection plates' charges are reversed, what happens to the beam?",
      choices: ["It deflects in the opposite direction", "It deflects the same way as before", "It disappears", "It speeds up only"],
      correctIndex: 0,
      explanation: "Reversing which plate is positive reverses which direction the beam bends toward, since the beam always bends toward the positive plate.",
    },
    {
      id: "q4",
      prompt: "What did J. J. Thomson's cathode ray tube experiment provide the first evidence for?",
      choices: ["Protons", "Neutrons", "The electron", "The nucleus"],
      correctIndex: 2,
      explanation: "Thomson's experiment provided the first strong evidence for a subatomic, negatively charged particle — the electron.",
    },
    {
      id: "q5",
      prompt: "What does Thomson's \"plum pudding\" model propose about atomic structure?",
      choices: [
        "Atoms are indivisible solid spheres",
        "Negatively charged electrons are embedded in a diffuse sphere of positive charge",
        "Atoms are mostly empty space with a dense nucleus",
        "Electrons orbit the nucleus in fixed circular shells",
      ],
      correctIndex: 1,
      explanation: "The plum pudding model pictures electrons scattered through a diffuse, positively charged \"pudding\" — a direct response to discovering the electron, and a clear break from Dalton's solid-sphere model.",
    },
  ];

  return { beamY, screenHitY, INVESTIGATION_QUESTIONS, QUIZ_QUESTIONS, K_CONST };
});
