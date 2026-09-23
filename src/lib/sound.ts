// Web Audio API Synthesizer cho chuông đặc quyền tài chính Zmoney
// 100% tự tạo sóng âm không phụ thuộc file âm thanh ngoài, chạy mượt mà offline & PWA
// Mặc định phát 3 lần ngắt quãng cho từng loại sự kiện: Cảnh Báo, Thu, Chi, Đạt Mục Tiêu

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
 * 🚨 1. ÂM THANH CẢNH BÁO TÀI CHÍNH (Warning Alert Chime)
 * Tiếng chuông báo động ngân vang dồn dập, cảnh báo vượt ngưỡng âm nợ, cạn tiền kho, nợ khẩn cấp
 * Mặc định phát 3 hồi ngắt quãng
 */
export function playWarningAlertSound(volume: number = 0.8, repeats: number = 3) {
  stopAllSounds();
  if (volume <= 0) return;
  const ctx = getAudioContext();
  const clampedVol = Math.min(Math.max(volume, 0), 1);

  const playOneBurst = (time: number) => {
    // 2 âm báo kế tiếp tạo độ cấp bách (A5: 880Hz -> E5: 659Hz)
    const notes = [
      { freq: 880, start: 0, dur: 0.12 },
      { freq: 659.25, start: 0.14, dur: 0.18 },
    ];

    notes.forEach((note) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(note.freq, time + note.start);
      osc.frequency.exponentialRampToValueAtTime(note.freq * 0.96, time + note.start + note.dur);

      const amp = clampedVol * 0.55;
      gain.gain.setValueAtTime(0.0001, time + note.start);
      gain.gain.linearRampToValueAtTime(amp, time + note.start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + note.start + note.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time + note.start);
      osc.stop(time + note.start + note.dur + 0.05);
    });
  };

  const burstDuration = 0.35; // 350ms mỗi hồi
  const pauseDuration = 0.25; // 250ms nghỉ giữa các hồi
  const totalCycle = burstDuration + pauseDuration;

  const startTime = ctx.currentTime;
  for (let i = 0; i < repeats; i++) {
    playOneBurst(startTime + i * totalCycle);
  }

  const stopTimeout = setTimeout(() => {
    stopAllSounds();
  }, (repeats * totalCycle + 0.5) * 1000);
  activeTimeouts.push(stopTimeout);
}

/**
 * 🪙 2. TIẾNG LENG KENG TIỀN XU (Coin Clinking Chime)
 * Âm kim loại vàng/bạc va chạm trong trẻo ngân vang khi ghi nhận TIỀN THU VÀO
 * Mặc định phát 3 hồi ngắt quãng
 */
export function playCoinSound(volumeOrDuration: number = 0.8, repeats: number = 3) {
  stopAllSounds();
  let vol = 0.8;
  if (volumeOrDuration <= 1 && volumeOrDuration > 0) {
    vol = volumeOrDuration;
  } else if (volumeOrDuration === 0) {
    return;
  }
  const ctx = getAudioContext();
  const clampedVol = Math.min(Math.max(vol, 0), 1);

  const strikeCoin = (time: number, pitchMultiplier = 1, strikeVol = 0.5) => {
    const freqs = [2150 * pitchMultiplier, 3280 * pitchMultiplier, 5120 * pitchMultiplier];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, time);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.98, time + 0.2);

      const amp = clampedVol * strikeVol * (idx === 0 ? 0.6 : idx === 1 ? 0.35 : 0.2);
      gain.gain.setValueAtTime(amp, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.35 + idx * 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + 0.45);
    });
  };

  const playOneBurst = (baseTime: number) => {
    strikeCoin(baseTime + 0.00, 1.0, 0.45);
    strikeCoin(baseTime + 0.07, 1.25, 0.5);
    strikeCoin(baseTime + 0.15, 0.95, 0.4);
    strikeCoin(baseTime + 0.24, 1.35, 0.55);
  };

  const burstDuration = 0.32;
  const pauseDuration = 0.22;
  const totalCycle = burstDuration + pauseDuration;

  const startTime = ctx.currentTime;
  for (let i = 0; i < repeats; i++) {
    playOneBurst(startTime + i * totalCycle);
  }

  const stopTimeout = setTimeout(() => {
    stopAllSounds();
  }, (repeats * totalCycle + 0.5) * 1000);
  activeTimeouts.push(stopTimeout);
}

/**
 * 💵 3. TIẾNG MÁY ĐẾM TIỀN (Cash Counting Machine Flutter)
 * Tiếng vuốt rào rào tạch tạch của từng tờ polyme/giấy chạy qua lô đếm khi ghi nhận TIỀN CHI RA
 * Mặc định phát 3 nhịp ngắt quãng
 */
export function playCashCounterSound(volumeOrDuration: number = 0.8, repeats: number = 3) {
  stopAllSounds();
  let vol = 0.8;
  if (volumeOrDuration <= 1 && volumeOrDuration > 0) {
    vol = volumeOrDuration;
  } else if (volumeOrDuration === 0) {
    return;
  }
  const ctx = getAudioContext();
  const clampedVol = Math.min(Math.max(vol, 0), 1);

  const flutterBill = (time: number) => {
    const bufferSize = Math.floor(ctx.sampleRate * 0.03);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.setValueAtTime(1500 + Math.random() * 300, time);
    bandpass.Q.setValueAtTime(3.0, time);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(clampedVol * 0.45, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);

    noise.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(ctx.destination);

    noise.start(time);
    noise.stop(time + 0.035);

    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(520, time);
    osc.frequency.exponentialRampToValueAtTime(200, time + 0.02);

    oscGain.gain.setValueAtTime(clampedVol * 0.25, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.02);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);

    osc.start(time);
    osc.stop(time + 0.025);
  };

  const playOneBurst = (baseTime: number) => {
    for (let j = 0; j < 5; j++) {
      flutterBill(baseTime + j * 0.05);
    }
  };

  const burstDuration = 0.28;
  const pauseDuration = 0.22;
  const totalCycle = burstDuration + pauseDuration;

  const startTime = ctx.currentTime;
  for (let i = 0; i < repeats; i++) {
    playOneBurst(startTime + i * totalCycle);
  }

  // Kết thúc phát tiếng bíp chốt hoàn tất nhẹ nhàng
  const finishBeepTime = startTime + repeats * totalCycle;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(2093, finishBeepTime); // C7
  gain.gain.setValueAtTime(clampedVol * 0.3, finishBeepTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, finishBeepTime + 0.35);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(finishBeepTime);
  osc.stop(finishBeepTime + 0.4);

  const stopTimeout = setTimeout(() => {
    stopAllSounds();
  }, (finishBeepTime - startTime + 0.5) * 1000);
  activeTimeouts.push(stopTimeout);
}

/**
 * 🏆 4. TIẾNG ĐẠT MỤC TIÊU TÀI CHÍNH (Goal Reached Fanfare)
 * Hợp âm chiến thắng vinh quang rạng rỡ (Đô - Mi - Sol - Đố) chúc mừng đạt mục tiêu tích lũy
 * Mặc định phát 3 hồi ngắt quãng
 */
export function playGoalReachedSound(volume: number = 0.8, repeats: number = 3) {
  stopAllSounds();
  if (volume <= 0) return;
  const ctx = getAudioContext();
  const clampedVol = Math.min(Math.max(volume, 0), 1);

  const playOneBurst = (baseTime: number) => {
    const chord = [
      { freq: 523.25, offset: 0.00, dur: 0.25 },
      { freq: 659.25, offset: 0.08, dur: 0.25 },
      { freq: 783.99, offset: 0.16, dur: 0.30 },
      { freq: 1046.5, offset: 0.24, dur: 0.45 },
    ];

    chord.forEach((n) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(n.freq, baseTime + n.offset);

      const amp = clampedVol * 0.4;
      gain.gain.setValueAtTime(0.0001, baseTime + n.offset);
      gain.gain.linearRampToValueAtTime(amp, baseTime + n.offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, baseTime + n.offset + n.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(baseTime + n.offset);
      osc.stop(baseTime + n.offset + n.dur + 0.05);
    });
  };

  const burstDuration = 0.45;
  const pauseDuration = 0.25;
  const totalCycle = burstDuration + pauseDuration;

  const startTime = ctx.currentTime;
  for (let i = 0; i < repeats; i++) {
    playOneBurst(startTime + i * totalCycle);
  }

  const stopTimeout = setTimeout(() => {
    stopAllSounds();
  }, (repeats * totalCycle + 0.6) * 1000);
  activeTimeouts.push(stopTimeout);
}

/**
 * ⚡ BỘ ĐIỀU HƯỚNG PHÁT ÂM THANH THEO SỰ KIỆN (Event Sound Router)
 * Hệ thống cố định âm thanh theo từng loại sự kiện, mặc định phát 3 lần ngắt quãng
 */
export function playEventSound(
  event: "alert" | "income" | "expense" | "goal",
  volume: number = 0.8,
  repeats: number = 3
) {
  switch (event) {
    case "alert":
      playWarningAlertSound(volume, repeats);
      break;
    case "income":
      playCoinSound(volume, repeats);
      break;
    case "expense":
      playCashCounterSound(volume, repeats);
      break;
    case "goal":
      playGoalReachedSound(volume, repeats);
      break;
  }
}
