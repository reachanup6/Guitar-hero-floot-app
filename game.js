// ==========================================
// 1. WEBAUDIO GEAR & DISTORTION ENGINE
// ==========================================
class GuitarAudioEngine {
  constructor() {
    this.audioCtx = null;
    this.sourceNode = null;
    this.driveNode = null;
    this.eqLow = null;
    this.eqMid = null;
    this.eqHigh = null;
    this.masterGain = null;
    this.isPlaying = false;
  }

  init() {
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.audioCtx.createGain();

    this.driveNode = this.audioCtx.createWaveShaper();
    this.eqLow = this.audioCtx.createBiquadFilter();
    this.eqMid = this.audioCtx.createBiquadFilter();
    this.eqHigh = this.audioCtx.createBiquadFilter();

    this.eqLow.type = 'lowshelf';
    this.eqLow.frequency.value = 320;

    this.eqMid.type = 'peaking';
    this.eqMid.frequency.value = 1000;

    this.eqHigh.type = 'highshelf';
    this.eqHigh.frequency.value = 3200;

    // Chain: Input -> Distortion (Pedal) -> Low/Mid/High EQ (Amp) -> Master Gain -> Output
    this.driveNode.connect(this.eqLow);
    this.eqLow.connect(this.eqMid);
    this.eqMid.connect(this.eqHigh);
    this.eqHigh.connect(this.masterGain);
    this.masterGain.connect(this.audioCtx.destination);

    this.applyGearPreset(40, 4, 1, 5); // Default Overdrive + Metal EQ
  }

  makeDistortionCurve(amount = 20) {
    const k = amount;
    const samples = 44100;
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < samples; ++i) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  applyGearPreset(drive, low, mid, high) {
    if (!this.driveNode) return;
    this.driveNode.curve = this.makeDistortionCurve(drive);
    this.driveNode.oversample = '4x';
    this.eqLow.gain.value = low;
    this.eqMid.gain.value = mid;
    this.eqHigh.gain.value = high;
  }

  async startDemoSynthTrack() {
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }
    // WebAudio Synth Backing Track for Testing
    const osc = this.audioCtx.createOscillator();
    const synthGain = this.audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, this.audioCtx.currentTime); // Low A power chord
    synthGain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);

    osc.connect(synthGain);
    synthGain.connect(this.driveNode);
    osc.start();
    this.isPlaying = true;
  }
}

// ==========================================
// 2. CANVAS HIGHWAY & NOTE SCROLLING ENGINE
// ==========================================
class GuitarHeroGame {
  constructor() {
    this.canvas = document.getElementById('highway-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.audioEngine = new GuitarAudioEngine();
    
    this.score = 0;
    this.multiplier = 1;
    this.streak = 0;
    this.gameRunning = false;

    // 4 Lane Colors: Green, Red, Yellow, Blue
    this.laneColors = ['#00ff66', '#ff0055', '#ffcc00', '#0099ff'];
    this.laneKeys = ['KeyA', 'KeyS', 'KeyK', 'KeyL'];
    this.activeKeys = [false, false, false, false];

    // Chart Notes (Timestamps in seconds, Lane 0-3)
    this.notes = [
      { time: 1.0, lane: 0, hit: false },
      { time: 1.8, lane: 1, hit: false },
      { time: 2.5, lane: 2, hit: false },
      { time: 3.2, lane: 3, hit: false },
      { time: 4.0, lane: 1, hit: false },
      { time: 4.5, lane: 2, hit: false },
      { time: 5.0, lane: 0, hit: false },
      { time: 5.5, lane: 3, hit: false }
    ];

    this.startTime = 0;
    this.resizeCanvas();
    this.setupInputs();
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  setupInputs() {
    window.addEventListener('resize', () => this.resizeCanvas());

    // Keyboard controls (Desktop)
    window.addEventListener('keydown', (e) => {
      const laneIdx = this.laneKeys.indexOf(e.code);
      if (laneIdx !== -1 && !this.activeKeys[laneIdx]) {
        this.activeKeys[laneIdx] = true;
        this.checkHit(laneIdx);
      }
    });

    window.addEventListener('keyup', (e) => {
      const laneIdx = this.laneKeys.indexOf(e.code);
      if (laneIdx !== -1) {
        this.activeKeys[laneIdx] = false;
      }
    });

    // Touch controls (Mobile)
    const touchButtons = document.querySelectorAll('.touch-btn');
    touchButtons.forEach((btn) => {
      const laneIdx = parseInt(btn.getAttribute('data-lane'), 10);

      const triggerPress = (e) => {
        e.preventDefault(); // Prevent accidental zoom/scroll on rapid taps
        this.activeKeys[laneIdx] = true;
        this.checkHit(laneIdx);
      };

      const triggerRelease = (e) => {
        e.preventDefault();
        this.activeKeys[laneIdx] = false;
      };

      btn.addEventListener('touchstart', triggerPress, { passive: false });
      btn.addEventListener('touchend', triggerRelease, { passive: false });
      btn.addEventListener('mousedown', triggerPress);
      btn.addEventListener('mouseup', triggerRelease);
    });

    document.getElementById('start-btn').addEventListener('click', () => {
      document.getElementById('start-btn').style.display = 'none';
      this.audioEngine.init();
      this.audioEngine.startDemoSynthTrack();
      this.startTime = performance.now();
      this.gameRunning = true;
      requestAnimationFrame((time) => this.gameLoop(time));
    });
  }

  checkHit(lane) {
    if (!this.gameRunning) return;
    const currentTime = (performance.now() - this.startTime) / 1000;
    
    // Hit Window: ±0.15s
    const targetNote = this.notes.find(
      (n) => n.lane === lane && !n.hit && Math.abs(n.time - currentTime) < 0.15
    );

    if (targetNote) {
      targetNote.hit = true;
      this.streak++;
      this.score += 100 * this.multiplier;
      if (this.streak % 5 === 0 && this.multiplier < 4) {
        this.multiplier++;
      }
      this.updateUI();
    }
  }

  updateUI() {
    document.getElementById('score').innerText = this.score;
    document.getElementById('multiplier').innerText = `${this.multiplier}x`;
  }

  drawHighway() {
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Perspective Trapezoid dimensions
    const topW = w * 0.25;
    const botW = w * 0.65;
    const topY = h * 0.15;
    const botY = h * 0.85;

    // Background Highway Surface
    this.ctx.fillStyle = '#12121a';
    this.ctx.beginPath();
    this.ctx.moveTo((w - topW) / 2, topY);
    this.ctx.lineTo((w + topW) / 2, topY);
    this.ctx.lineTo((w + botW) / 2, botY);
    this.ctx.lineTo((w - botW) / 2, botY);
    this.ctx.closePath();
    this.ctx.fill();

    // Lane Lines (4 Lanes = 5 Dividers)
    this.ctx.strokeStyle = '#2a2a3a';
    this.ctx.lineWidth = 2;
    for (let i = 0; i <= 4; i++) {
      const pTop = (w - topW) / 2 + (topW / 4) * i;
      const pBot = (w - botW) / 2 + (botW / 4) * i;
      this.ctx.beginPath();
      this.ctx.moveTo(pTop, topY);
      this.ctx.lineTo(pBot, botY);
      this.ctx.stroke();
    }

    // Hit Target Bar (Bottom)
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 4;
    this.ctx.beginPath();
    this.ctx.moveTo((w - botW) / 2, botY);
    this.ctx.lineTo((w + botW) / 2, botY);
    this.ctx.stroke();

    return { topW, botW, topY, botY };
  }

  gameLoop(timestamp) {
    if (!this.gameRunning) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const { topW, botW, topY, botY } = this.drawHighway();
    const currentTime = (timestamp - this.startTime) / 1000;
    const scrollSpeed = 1.2; // Seconds visible on screen

    // Draw Falling Notes
    this.notes.forEach((note) => {
      if (note.hit) return;

      const timeDiff = note.time - currentTime;
      if (timeDiff <= scrollSpeed && timeDiff >= -0.2) {
        // Perspective progress factor (0.0 at top, 1.0 at bottom hit line)
        const progress = 1 - timeDiff / scrollSpeed;

        if (progress >= 0 && progress <= 1) {
          const currentY = topY + (botY - topY) * progress;
          const currentW = topW + (botW - topW) * progress;
          const laneW = currentW / 4;
          const startX = (this.canvas.width - currentW) / 2;
          const noteX = startX + laneW * note.lane + laneW / 2;

          // Draw Glowing Target Note
          this.ctx.fillStyle = this.laneColors[note.lane];
          this.ctx.shadowColor = this.laneColors[note.lane];
          this.ctx.shadowBlur = 12;
          this.ctx.beginPath();
          this.ctx.arc(noteX, currentY, 12 * (0.5 + progress * 0.5), 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.shadowBlur = 0;
        }
      }
    });

    requestAnimationFrame((t) => this.gameLoop(t));
  }
}

// Initialize Game Engine
window.onload = () => {
  new GuitarHeroGame();
};
