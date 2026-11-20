"use strict";
/* Cathode Ray Tube Experiment — application logic. Depends on CRTEngine (engine.js). */
const E = CRTEngine;

function el(tag, attrs, children) {
  const node = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    if (attrs[k] === null || attrs[k] === undefined) continue;
    if (k === "class") node.className = attrs[k];
    else if (k === "html") node.innerHTML = attrs[k];
    else node.setAttribute(k, attrs[k]);
  }
  (children || []).forEach((c) => node.appendChild(typeof c === "string" ? document.createTextNode(c) : c));
  return node;
}
function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

/* ---------------------------------------------------------------------
   Theme toggle (persisted per-browser)
--------------------------------------------------------------------- */
(function initTheme() {
  const root = document.documentElement;
  const btn = document.getElementById("themeToggleBtn");
  let saved = null;
  try { saved = localStorage.getItem("crt.theme"); } catch (e) {}
  if (saved === "light" || saved === "dark") root.setAttribute("data-theme", saved);
  function current() { return root.getAttribute("data-theme") === "light" ? "light" : "dark"; }
  function sync() { btn.textContent = current() === "light" ? "☽ Dark mode" : "☀ Light mode"; }
  btn.addEventListener("click", function () {
    const next = current() === "light" ? "dark" : "light";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("crt.theme", next); } catch (e) {}
    sync();
  });
  sync();
})();

/* persisted free-text fields */
function persistTextarea(id, storeKey) {
  const ta = document.getElementById(id);
  if (!ta) return;
  try { const saved = localStorage.getItem(storeKey); if (saved) ta.value = saved; } catch (e) {}
  ta.addEventListener("input", function () { try { localStorage.setItem(storeKey, ta.value); } catch (e) {} });
}
persistTextarea("predict-input", "crt.predict");

/* ---------------------------------------------------------------------
   The cathode ray tube animation
--------------------------------------------------------------------- */
(function initTube() {
  const canvas = document.getElementById("tube-canvas");
  const ctx = canvas.getContext("2d");
  const W = 720, H = 360;
  const cy = H / 2;
  const cathodeX = 60, anodeX = 140, screenX = 660;
  const plateStart = 300, plateEnd = 460;
  const maxAmplitude = 95; // px, deflection at strength=1
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let running = true;
  let fieldOn = false;
  let reversed = false;
  let strength = 0.55;
  let showElectrons = true;
  let slowMotion = false;
  let discoveryRevealed = false;
  let screenFlash = 0; // 0..1 fade

  function engineOpts() {
    return {
      plateStart: (plateStart - anodeX) / (screenX - anodeX),
      plateEnd: (plateEnd - anodeX) / (screenX - anodeX),
      fieldOn,
      strength,
      direction: reversed ? -1 : 1,
    };
  }
  function xNorm(px) { return (px - anodeX) / (screenX - anodeX); }
  function canvasY(px) {
    const yNorm = E.beamY(xNorm(px), engineOpts());
    return cy - yNorm * maxAmplitude;
  }

  const electrons = [];
  function spawnElectron() { electrons.push({ x: anodeX, trail: [] }); }
  for (let i = 0; i < 6; i++) electrons.push({ x: anodeX + i * 90, trail: [] });

  function step(dt) {
    const speed = (slowMotion ? 70 : 230) * dt;
    electrons.forEach((p) => {
      p.trail.push(p.x);
      if (p.trail.length > 5) p.trail.shift();
      p.x += speed;
      if (p.x >= screenX) {
        screenFlash = 1;
        p.x = anodeX - Math.random() * 40;
        p.trail.length = 0;
      }
    });
  }

  function draw() {
    const ink = cssVar("--ink"), inkMuted = cssVar("--ink-muted"), border = cssVar("--border");
    const negative = cssVar("--negative"), positive = cssVar("--positive"), phosphor = cssVar("--phosphor");
    const surfaceSunken = cssVar("--surface-sunken");
    ctx.clearRect(0, 0, W, H);

    // glass tube outline
    ctx.strokeStyle = border;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(24, 40, W - 48, H - 80, 24);
    ctx.stroke();

    // cathode (negative electrode)
    ctx.fillStyle = negative;
    ctx.fillRect(cathodeX - 4, cy - 55, 8, 110);
    ctx.fillStyle = ink;
    ctx.font = "12px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText("CATHODE (−)", cathodeX, cy - 65);

    // anode (positive electrode, with a gap for the beam)
    ctx.fillStyle = positive;
    ctx.fillRect(anodeX - 4, cy - 55, 8, 40);
    ctx.fillRect(anodeX - 4, cy + 15, 8, 40);
    ctx.fillStyle = ink;
    ctx.fillText("ANODE (+)", anodeX, cy - 65);

    // deflection plates
    const topIsPositive = !reversed;
    ctx.fillStyle = topIsPositive ? positive : negative;
    ctx.fillRect(plateStart, cy - 70, plateEnd - plateStart, 8);
    ctx.fillStyle = ink;
    ctx.fillText(topIsPositive ? "+" : "−", (plateStart + plateEnd) / 2, cy - 78);
    ctx.fillStyle = topIsPositive ? negative : positive;
    ctx.fillRect(plateStart, cy + 62, plateEnd - plateStart, 8);
    ctx.fillStyle = ink;
    ctx.fillText(topIsPositive ? "−" : "+", (plateStart + plateEnd) / 2, cy + 90);

    // fluorescent screen
    ctx.fillStyle = surfaceSunken;
    ctx.fillRect(screenX, cy - 100, 14, 200);
    ctx.strokeStyle = border;
    ctx.strokeRect(screenX, cy - 100, 14, 200);

    // screen glow at the beam's hit point
    const hitY = canvasY(screenX);
    if (screenFlash > 0.02) {
      const glowR = 22 * screenFlash;
      const grad = ctx.createRadialGradient(screenX + 7, hitY, 1, screenX + 7, hitY, glowR);
      grad.addColorStop(0, phosphor);
      grad.addColorStop(1, phosphor + "00");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(screenX + 7, hitY, glowR, 0, Math.PI * 2);
      ctx.fill();
      screenFlash *= 0.94;
    }
    ctx.fillStyle = phosphor;
    ctx.beginPath();
    ctx.arc(screenX + 7, hitY, 4, 0, Math.PI * 2);
    ctx.fill();

    // beam
    if (showElectrons) {
      electrons.forEach((p) => {
        const y = canvasY(p.x);
        p.trail.forEach((tx, i) => {
          const ty = canvasY(tx);
          ctx.beginPath();
          ctx.fillStyle = negative + Math.round((i / p.trail.length) * 60 + 20).toString(16).padStart(2, "0");
          ctx.arc(tx, ty, 3.2, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.beginPath();
        ctx.fillStyle = negative;
        ctx.shadowColor = negative;
        ctx.shadowBlur = reduceMotion ? 0 : 8;
        ctx.arc(p.x, y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });
    } else {
      ctx.strokeStyle = negative;
      ctx.lineWidth = 3;
      ctx.shadowColor = negative;
      ctx.shadowBlur = reduceMotion ? 0 : 10;
      ctx.beginPath();
      for (let px = anodeX; px <= screenX; px += 4) {
        const y = canvasY(px);
        if (px === anodeX) ctx.moveTo(px, y); else ctx.lineTo(px, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.textAlign = "left";
    ctx.fillStyle = inkMuted;
    ctx.font = "11px 'JetBrains Mono', monospace";
    ctx.fillText("fluorescent screen", screenX - 70, cy + 118);
  }

  let last = null;
  function loop(ts) {
    if (last == null) last = ts;
    const dt = Math.min(0.05, (ts - last) / 1000);
    last = ts;
    if (running) step(dt);
    draw();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  function updateStatus() {
    document.getElementById("status-readout").textContent =
      "Field: " + (fieldOn ? "ON" : "OFF") + "  ·  Top plate: " + (reversed ? "−" : "+") +
      "  ·  Strength: " + Math.round(strength * 100) + "%";
  }
  updateStatus();

  document.getElementById("btn-start-pause").addEventListener("click", function (ev) {
    running = !running;
    ev.target.textContent = running ? "⏸ Pause" : "▶ Resume";
  });
  document.getElementById("btn-reset").addEventListener("click", function () {
    electrons.length = 0;
    for (let i = 0; i < 6; i++) electrons.push({ x: anodeX + i * 90, trail: [] });
    screenFlash = 0;
    running = true;
    document.getElementById("btn-start-pause").textContent = "⏸ Pause";
  });
  document.getElementById("btn-field-toggle").addEventListener("click", function (ev) {
    fieldOn = !fieldOn;
    ev.target.setAttribute("aria-pressed", String(fieldOn));
    ev.target.textContent = "Field: " + (fieldOn ? "ON" : "OFF");
    updateStatus();
    if (fieldOn && !discoveryRevealed) {
      discoveryRevealed = true;
      document.getElementById("discovery-panel").classList.add("revealed");
    }
  });
  document.getElementById("btn-reverse").addEventListener("click", function () {
    reversed = !reversed;
    updateStatus();
  });
  document.getElementById("slider-strength").addEventListener("input", function (ev) {
    strength = parseInt(ev.target.value, 10) / 100;
    updateStatus();
  });
  document.getElementById("btn-show-electrons").addEventListener("click", function (ev) {
    showElectrons = !showElectrons;
    ev.target.setAttribute("aria-pressed", String(showElectrons));
  });
  document.getElementById("btn-slow-motion").addEventListener("click", function (ev) {
    slowMotion = !slowMotion;
    ev.target.setAttribute("aria-pressed", String(slowMotion));
  });
})();

/* ---------------------------------------------------------------------
   Investigation questions (ungraded — reveal a model answer on demand)
--------------------------------------------------------------------- */
(function initInvestigation() {
  const host = document.getElementById("investigate-questions");
  E.INVESTIGATION_QUESTIONS.forEach((q, i) => {
    const wrap = el("div", { style: i > 0 ? "margin-top:16px; padding-top:16px; border-top:1px solid var(--border);" : "" });
    wrap.appendChild(el("p", { style: "font-weight:600;" }, [(i + 1) + ". " + q.prompt]));
    const ta = el("textarea", { id: "inv-" + q.id, style: "width:100%; min-height:60px; border:1px solid var(--border); border-radius:8px; padding:8px; background:var(--surface-sunken); color:var(--ink);" });
    wrap.appendChild(ta);
    const feedback = el("div", { style: "margin-top:8px;" });
    const btn = el("button", { class: "btn", style: "margin-top:8px;" }, ["Check my thinking"]);
    btn.addEventListener("click", function () {
      feedback.innerHTML = "";
      feedback.appendChild(el("div", { class: "callout info" }, ["Model answer: " + q.model]));
      try { localStorage.setItem("crt.inv." + q.id, ta.value); } catch (e) {}
    });
    try { const saved = localStorage.getItem("crt.inv." + q.id); if (saved) ta.value = saved; } catch (e) {}
    wrap.appendChild(btn);
    wrap.appendChild(feedback);
    host.appendChild(wrap);
  });
})();

/* ---------------------------------------------------------------------
   Thomson's plum pudding model vs. Dalton's solid sphere
--------------------------------------------------------------------- */
(function initModel() {
  const canvas = document.getElementById("model-canvas");
  const ctx = canvas.getContext("2d");
  const W = 500, H = 340;
  const cx = W / 2, cy = H / 2;
  const sphereR = 110;
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let mode = "thomson";
  let theta = 0.4;
  let dragging = false;
  let lastPointerX = 0;
  let autoRotate = !reduceMotion;

  // fixed 3D positions for the embedded electrons (unit sphere coords)
  const electronSeeds = [];
  (function seed() {
    const golden = Math.PI * (3 - Math.sqrt(5));
    const n = 14;
    for (let i = 0; i < n; i++) {
      const yv = 1 - (i / (n - 1)) * 2;
      const r = Math.sqrt(1 - yv * yv);
      const a = i * golden;
      electronSeeds.push({ x: r * Math.cos(a) * 0.82, y: yv * 0.82, z: r * Math.sin(a) * 0.82 });
    }
  })();

  function draw() {
    const ink = cssVar("--ink"), inkMuted = cssVar("--ink-muted");
    const negative = cssVar("--negative"), positive = cssVar("--positive");
    ctx.clearRect(0, 0, W, H);

    if (mode === "dalton") {
      const grad = ctx.createRadialGradient(cx - 30, cy - 30, 10, cx, cy, sphereR);
      grad.addColorStop(0, positive);
      grad.addColorStop(1, "#6b2f1e");
      ctx.beginPath();
      ctx.fillStyle = grad;
      ctx.arc(cx, cy, sphereR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = ink;
      ctx.font = "13px 'Work Sans', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Solid, indivisible sphere", cx, cy + sphereR + 28);
    } else {
      const grad = ctx.createRadialGradient(cx - 30, cy - 30, 10, cx, cy, sphereR);
      grad.addColorStop(0, positive + "cc");
      grad.addColorStop(1, positive + "22");
      ctx.beginPath();
      ctx.fillStyle = grad;
      ctx.arc(cx, cy, sphereR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = positive + "55";
      ctx.beginPath();
      ctx.arc(cx, cy, sphereR, 0, Math.PI * 2);
      ctx.stroke();

      const projected = electronSeeds.map((p) => {
        const x2 = p.x * Math.cos(theta) - p.z * Math.sin(theta);
        const z2 = p.x * Math.sin(theta) + p.z * Math.cos(theta);
        return { sx: cx + x2 * sphereR, sy: cy + p.y * sphereR, z: z2 };
      });
      projected.sort((a, b) => a.z - b.z);
      projected.forEach((p) => {
        const scale = 0.55 + (p.z + 1) * 0.25;
        ctx.beginPath();
        ctx.fillStyle = negative;
        ctx.globalAlpha = 0.55 + (p.z + 1) * 0.2;
        ctx.arc(p.sx, p.sy, 7 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });
      ctx.fillStyle = ink;
      ctx.font = "13px 'Work Sans', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Electrons embedded in a diffuse positive charge", cx, cy + sphereR + 28);
    }
    ctx.fillStyle = inkMuted;
    ctx.font = "11px 'JetBrains Mono', monospace";
    ctx.fillText(mode === "dalton" ? "Dalton's model (pre-1897)" : "Thomson's \"plum pudding\" model (1904)", cx, 24);
  }

  function loop() {
    if (autoRotate && !dragging && mode === "thomson") theta += 0.006;
    draw();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  function pointerX(ev) { return (ev.touches ? ev.touches[0].clientX : ev.clientX); }
  canvas.addEventListener("pointerdown", function (ev) { dragging = true; lastPointerX = ev.clientX; canvas.setPointerCapture(ev.pointerId); });
  canvas.addEventListener("pointermove", function (ev) {
    if (!dragging) return;
    theta += (ev.clientX - lastPointerX) * 0.012;
    lastPointerX = ev.clientX;
  });
  ["pointerup", "pointercancel", "pointerleave"].forEach((evt) => canvas.addEventListener(evt, function () { dragging = false; }));

  document.getElementById("btn-model-thomson").addEventListener("click", function () {
    mode = "thomson";
    this.setAttribute("aria-pressed", "true");
    document.getElementById("btn-model-dalton").setAttribute("aria-pressed", "false");
    document.getElementById("model-description").textContent = "Thomson proposed that negatively charged electrons are scattered through a diffuse sphere of positive charge — like plums suspended in pudding. This directly followed from the cathode ray tube evidence: atoms had to contain smaller, negatively charged parts.";
  });
  document.getElementById("btn-model-dalton").addEventListener("click", function () {
    mode = "dalton";
    this.setAttribute("aria-pressed", "true");
    document.getElementById("btn-model-thomson").setAttribute("aria-pressed", "false");
    document.getElementById("model-description").textContent = "Before Thomson's discovery, Dalton's model treated the atom as a solid, indivisible sphere — with no internal structure at all. Thomson's experiment is exactly what overturned this idea.";
  });
  document.getElementById("model-description").textContent = "Thomson proposed that negatively charged electrons are scattered through a diffuse sphere of positive charge — like plums suspended in pudding. This directly followed from the cathode ray tube evidence: atoms had to contain smaller, negatively charged parts.";
})();

/* ---------------------------------------------------------------------
   5-question knowledge check
--------------------------------------------------------------------- */
(function initQuiz() {
  const host = document.getElementById("quiz-panel");
  const answers = {};

  function renderScore() {
    const scored = Object.keys(answers);
    if (scored.length < E.QUIZ_QUESTIONS.length) return;
    const correct = scored.filter((id) => answers[id]).length;
    let scoreEl = document.getElementById("quiz-final-score");
    if (!scoreEl) {
      scoreEl = el("div", { id: "quiz-final-score", class: "callout " + (correct === E.QUIZ_QUESTIONS.length ? "good" : "info"), style: "margin-top:16px;" });
      host.appendChild(scoreEl);
    }
    scoreEl.className = "callout " + (correct === E.QUIZ_QUESTIONS.length ? "good" : "info");
    scoreEl.innerHTML = "";
    scoreEl.appendChild(el("div", { class: "quiz-score" }, ["Final score: " + correct + " / " + E.QUIZ_QUESTIONS.length]));
  }

  E.QUIZ_QUESTIONS.forEach((q, qi) => {
    const wrap = el("div", { class: "quiz-question" });
    wrap.appendChild(el("p", { style: "font-weight:600;" }, [(qi + 1) + ". " + q.prompt]));
    q.choices.forEach((choice, ci) => {
      wrap.appendChild(el("label", {}, [
        el("input", { type: "radio", name: "quiz-" + q.id, value: String(ci), style: "margin-top:3px;" }),
        el("span", {}, [choice]),
      ]));
    });
    const feedback = el("div", { style: "margin-top:8px;" });
    const submitBtn = el("button", { class: "btn primary" }, ["Submit"]);
    submitBtn.addEventListener("click", function () {
      const checked = wrap.querySelector('input[name="quiz-' + q.id + '"]:checked');
      feedback.innerHTML = "";
      if (!checked) { feedback.appendChild(el("div", { class: "callout warn" }, ["Choose an answer first."])); return; }
      const correct = parseInt(checked.value, 10) === q.correctIndex;
      feedback.appendChild(el("div", { class: "callout " + (correct ? "good" : "critical") }, [(correct ? "✓ Correct. " : "✗ Not quite. ") + q.explanation]));
      submitBtn.disabled = true;
      wrap.querySelectorAll('input[name="quiz-' + q.id + '"]').forEach((r) => (r.disabled = true));
      answers[q.id] = correct;
      renderScore();
    });
    wrap.appendChild(submitBtn);
    wrap.appendChild(feedback);
    host.appendChild(wrap);
  });
})();
