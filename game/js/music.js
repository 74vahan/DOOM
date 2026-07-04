// ============================================================
// music.js — музыка и звуковые эффекты через WebAudio API.
// Никаких mp3-файлов: все звуки синтезируются кодом.
// Браузер разрешает звук только после действия пользователя,
// поэтому start() вызывается по кнопке входа.
// Клавиша M — выключить/включить звук.
// ============================================================

const Music = {
  ctx: null,        // AudioContext
  master: null,     // общая громкость
  muted: false,
  _seqTimer: null,
  _step: 0,

  // Мрачный рифф в духе E1M1: нота (Гц) на каждый шаг, 0 = пауза
  // E2, E3 — "галоп", потом ход вниз
  RIFF: [82.4, 164.8, 82.4, 146.8, 82.4, 130.8, 82.4, 123.5,
         82.4, 164.8, 82.4, 146.8, 82.4, 130.8, 116.5, 123.5],
  STEP_TIME: 0.16,  // секунд на шаг (~94 BPM "галопа")

  // Запуск после клика пользователя
  start() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.35;
    this.master.connect(this.ctx.destination);

    this.startDrone();
    this._seqTimer = setInterval(() => this.playStep(), this.STEP_TIME * 1000);

    // Клавиша M — вкл/выкл звук
    document.addEventListener('keydown', (e) => {
      if (e.code === 'KeyM' && e.target.tagName !== 'INPUT') this.toggleMute();
    });
  },

  toggleMute() {
    if (!this.master) return;
    this.muted = !this.muted;
    this.master.gain.value = this.muted ? 0 : 0.35;
  },

  // Низкий гул на фоне — "адская атмосфера"
  startDrone() {
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 41.2; // E1
    const gain = this.ctx.createGain();
    gain.gain.value = 0.05;
    // Медленное "дыхание" громкости
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.13;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.025;
    lfo.connect(lfoGain).connect(gain.gain);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;
    osc.connect(filter).connect(gain).connect(this.master);
    osc.start();
    lfo.start();
  },

  // Один шаг секвенсора: бас-рифф + бочка
  playStep() {
    if (this.muted) { this._step++; return; }
    const t = this.ctx.currentTime;
    const freq = this.RIFF[this._step % this.RIFF.length];

    if (freq > 0) {
      const osc = this.ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = freq;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.10, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + this.STEP_TIME * 0.9);
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 900;
      osc.connect(f).connect(g).connect(this.master);
      osc.start(t);
      osc.stop(t + this.STEP_TIME);
    }

    // Бочка на каждый 4-й шаг
    if (this._step % 4 === 0) {
      const osc = this.ctx.createOscillator();
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.exponentialRampToValueAtTime(35, t + 0.12);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.25, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
      osc.connect(g).connect(this.master);
      osc.start(t);
      osc.stop(t + 0.15);
    }
    this._step++;
  },

  // --- Звуковые эффекты ---
  // Каждый эффект — короткий синтезированный звук
  sfx(name) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;

    if (name === 'shoot') {
      // Дробовик: взрыв шума + низкий удар
      this.noise(t, 0.22, 1400, 0.5);
      this.tone(t, 'triangle', 90, 30, 0.3, 0.2);
    } else if (name === 'enemyDie') {
      // Рык вниз по частоте
      this.tone(t, 'sawtooth', 220, 40, 0.25, 0.35);
    } else if (name === 'playerHurt') {
      this.tone(t, 'square', 160, 80, 0.2, 0.15);
    } else if (name === 'pickup') {
      // Бодрый блип вверх
      this.tone(t, 'square', 440, 880, 0.12, 0.1);
    } else if (name === 'door') {
      // Гул открывающейся двери
      this.tone(t, 'sawtooth', 60, 120, 0.4, 0.8);
      this.noise(t, 0.6, 300, 0.15);
    } else if (name === 'fireball') {
      this.noise(t, 0.25, 700, 0.15);
    } else if (name === 'levelClear') {
      // Победный аккорд: три ноты подряд
      [261.6, 329.6, 392.0].forEach((f, i) =>
        this.tone(t + i * 0.12, 'square', f, f, 0.15, 0.3));
    } else if (name === 'death') {
      this.tone(t, 'sawtooth', 300, 30, 0.3, 1.2);
    }
  },

  // Вспомогательный тон: частота едет от f1 к f2
  tone(t, type, f1, f2, vol, dur) {
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(f1, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(f2, 1), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  },

  // Вспомогательный шум (для выстрелов и взрывов)
  noise(t, dur, filterFreq, vol) {
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
  },
};
