// Web Audio API Synthesizer cho chuông đặc quyền tài chính Zmoney
// 100% tự tạo sóng âm không phụ thuộc file âm thanh ngoài, chạy mượt mà offline & PWA

let activeAudioContext: AudioContext | null = null;
let activeIntervalId: NodeJS.Timeout | null = null;
let activeTimeouts: NodeJS.Timeout[] = [];

function getAudioContext(): AudioContext {
  if (!activeAudioContext || activeAudioContext.state === "closed") {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    activeAudioContext = new AudioCtx();
  }
  if (activeAudioContext.state === "suspended") {
    activeAudioContext.resume();
  }
  return activeAudioContext;
}

export function stopAllSounds() {
  if (activeIntervalId) {
    clearInterval(activeIntervalId);
    activeIntervalId = null;
  }
  activeTimeouts.forEach(clearTimeout);
  activeTimeouts = [];

  if (activeAudioContext && activeAudioContext.state !== "closed") {
    try {
      activeAudioContext.close();
    } catch (_) {}
    activeAudioContext = null;
  }
}

/**
 * 🪙 TIẾNG LENG KENG TIỀN XU (Coin Clinking Chime)
 * Tạo chuỗi va chạm kim loại vàng/bạc ngân vang với các họa âm thanh khiết
 */
export function playCoinSound(durationSeconds: number = 3) {
  stopAllSounds();
  const ctx = getAudioContext();
  const startTime = ctx.currentTime;

  // Hàm phát 1 tiếng chạm xu kim loại tại thời điểm t
  const strikeCoin = (time: number, pitchMultiplier = 1, volume = 0.5) => {
    // 3 tần số cộng hưởng kim loại đặc trưng
    const freqs = [2150 * pitchMultiplier, 3280 * pitchMultiplier, 5120 * pitchMultiplier];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, time);

      // Thêm chút biến điệu vi mô tạo độ leng keng tự nhiên
      osc.frequency.exponentialRampToValueAtTime(freq * 0.98, time + 0.3);

      const amp = volume * (idx === 0 ? 0.6 : idx === 1 ? 0.4 : 0.25);
      gain.gain.setValueAtTime(amp, time);
      // Ngân vang kim loại tắt dần theo hàm mũ
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.5 + idx * 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + 0.8);
    });

    // Tiếng click va chạm sắc cạnh (noise click nhẹ)
    const bufferSize = Math.floor(ctx.sampleRate * 0.015); // 15ms click
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(3000, time);

    const clickGain = ctx.createGain();
    clickGain.gain.setValueAtTime(volume * 0.3, time);
    clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.015);

    noise.connect(filter);
    filter.connect(clickGain);
    clickGain.connect(ctx.destination);

    noise.start(time);
    noise.stop(time + 0.02);
  };

  // Tạo đợt leng keng rải rác như tung một bọc tiền xu
  const playPattern = (baseTime: number) => {
    strikeCoin(baseTime + 0.00, 1.0, 0.45);
    strikeCoin(baseTime + 0.07, 1.25, 0.5);
    strikeCoin(baseTime + 0.15, 0.95, 0.4);
    strikeCoin(baseTime + 0.25, 1.35, 0.55);
    strikeCoin(baseTime + 0.40, 1.1, 0.35);
  };

  playPattern(startTime);

  // Nếu thời lượng dài hơn 1 giây, lặp lại chu kỳ leng keng
  const loopInterval = 0.9; // 0.9s mỗi đợt
  const repeatCount = Math.floor(durationSeconds / loopInterval);

  for (let i = 1; i <= repeatCount; i++) {
    const t = setTimeout(() => {
      if (activeAudioContext && activeAudioContext.state === "running") {
        playPattern(activeAudioContext.currentTime);
      }
    }, i * loopInterval * 1000);
    activeTimeouts.push(t);
  }

  // Tự động dừng khi hết thời lượng
  const stopTimeout = setTimeout(() => {
    stopAllSounds();
  }, durationSeconds * 1000 + 800);
  activeTimeouts.push(stopTimeout);
}

/**
 * 💵 TIẾNG MÁY ĐẾM TIỀN (Cash Counting Machine Flutter)
 * Mô phỏng tiếng rào rào tạch tạch của từng tờ polyme/giấy chạy qua lô đếm tốc độ cao
 * và kết thúc bằng tiếng bíp hoàn thành "Ting!"
 */
export function playCashCounterSound(durationSeconds: number = 4) {
  stopAllSounds();
  const ctx = getAudioContext();

  // Tạo 1 nhịp vuốt tiền qua lô đếm (bill flutter)
  const flutterBill = (time: number) => {
    // 1. Noise burst mô phỏng tiếng sột soạt của giấy/polyme
    const bufferSize = Math.floor(ctx.sampleRate * 0.035); // 35ms
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    // Lọc dải tần tạo âm giấy sột soạt
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.setValueAtTime(1400 + Math.random() * 300, time);
    bandpass.Q.setValueAtTime(3.0, time);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.035);

    noise.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(ctx.destination);

    noise.start(time);
    noise.stop(time + 0.04);

    // 2. Tiếng click bánh răng đếm tiền
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(520, time);
    osc.frequency.exponentialRampToValueAtTime(180, time + 0.025);

    oscGain.gain.setValueAtTime(0.25, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.025);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);

    osc.start(time);
    osc.stop(time + 0.03);
  };

  // Tiếng bíp hoàn thành đếm tiền ("Ting! Xong xấp tiền")
  const finishBeep = (time: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1760, time); // A6
    osc.frequency.setValueAtTime(2349, time + 0.08); // D7

    gain.gain.setValueAtTime(0.35, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.6);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(time);
    osc.stop(time + 0.65);
  };

  // Chạy chuỗi đếm tiền liên tục (tốc độ ~16 tờ/giây, mỗi 60ms một tờ)
  const billIntervalMs = 60;
  const totalBills = Math.floor((durationSeconds * 1000 - 600) / billIntervalMs);
  let count = 0;

  activeIntervalId = setInterval(() => {
    if (!activeAudioContext || activeAudioContext.state !== "running") return;
    flutterBill(activeAudioContext.currentTime);
    count++;
    if (count >= totalBills) {
      if (activeIntervalId) {
        clearInterval(activeIntervalId);
        activeIntervalId = null;
      }
      // Phát tiếng bíp chốt hoàn thành
      finishBeep(activeAudioContext.currentTime + 0.05);
      const t = setTimeout(() => {
        stopAllSounds();
      }, 700);
      activeTimeouts.push(t);
    }
  }, billIntervalMs);
}
