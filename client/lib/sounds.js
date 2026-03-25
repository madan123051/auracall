// ── AuraCall Sound Effects ──
// Uses Web Audio API to generate ringtone and dialing tones
// No external audio files needed!

let audioContext = null;

function getAudioContext() {
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }
  return audioContext;
}

// ── Dialing Tone (outgoing call) ──
// Classic "ring-back" tone: 440Hz + 480Hz, 2s on, 4s off
let dialingInterval = null;
let dialingNodes = [];

function stopDialingNodes() {
  dialingNodes.forEach(node => {
    try { node.stop(); } catch(e) {}
    try { node.disconnect(); } catch(e) {}
  });
  dialingNodes = [];
}

export function startDialingTone() {
  stopDialingTone();
  
  const ctx = getAudioContext();
  
  function playBeep() {
    try {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(440, ctx.currentTime);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(480, ctx.currentTime);
      
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.8);
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      
      osc1.start(ctx.currentTime);
      osc2.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 2);
      osc2.stop(ctx.currentTime + 2);
      
      dialingNodes.push(osc1, osc2, gain);
      
      // Cleanup after stop
      osc1.onended = () => {
        try { osc1.disconnect(); } catch(e) {}
        try { osc2.disconnect(); } catch(e) {}
        try { gain.disconnect(); } catch(e) {}
      };
    } catch(e) {
      console.warn('[Sounds] Dialing tone error:', e);
    }
  }
  
  playBeep();
  dialingInterval = setInterval(playBeep, 4000);
}

export function stopDialingTone() {
  if (dialingInterval) {
    clearInterval(dialingInterval);
    dialingInterval = null;
  }
  stopDialingNodes();
}


// ── Ringtone (incoming call) ──
// Pleasant two-tone ring: alternating notes, WhatsApp-style
let ringtoneInterval = null;
let ringtoneTimeout = null;
let ringtoneNodes = [];

function stopRingtoneNodes() {
  ringtoneNodes.forEach(node => {
    try { node.stop(); } catch(e) {}
    try { node.disconnect(); } catch(e) {}
  });
  ringtoneNodes = [];
}

export function startRingtone() {
  stopRingtone();
  
  const ctx = getAudioContext();
  
  function playRing() {
    try {
      // First beep - higher pitch
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(784, ctx.currentTime); // G5
      gain1.gain.setValueAtTime(0.2, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.3);
      ringtoneNodes.push(osc1, gain1);
      
      // Second beep - slightly lower, after short gap
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659, ctx.currentTime + 0.35); // E5
      gain2.gain.setValueAtTime(0, ctx.currentTime);
      gain2.gain.setValueAtTime(0.2, ctx.currentTime + 0.35);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.65);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.35);
      osc2.stop(ctx.currentTime + 0.65);
      ringtoneNodes.push(osc2, gain2);
      
      // Third beep - highest
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(988, ctx.currentTime + 0.7); // B5
      gain3.gain.setValueAtTime(0, ctx.currentTime);
      gain3.gain.setValueAtTime(0.18, ctx.currentTime + 0.7);
      gain3.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.1);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(ctx.currentTime + 0.7);
      osc3.stop(ctx.currentTime + 1.1);
      ringtoneNodes.push(osc3, gain3);
      
      // Cleanup
      osc3.onended = () => {
        [osc1, osc2, osc3, gain1, gain2, gain3].forEach(n => {
          try { n.disconnect(); } catch(e) {}
        });
      };
    } catch(e) {
      console.warn('[Sounds] Ringtone error:', e);
    }
  }
  
  playRing();
  ringtoneInterval = setInterval(playRing, 2000);
  
  // Auto-stop after 30 seconds (safety)
  ringtoneTimeout = setTimeout(() => {
    stopRingtone();
  }, 30000);
}

export function stopRingtone() {
  if (ringtoneInterval) {
    clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
  if (ringtoneTimeout) {
    clearTimeout(ringtoneTimeout);
    ringtoneTimeout = null;
  }
  stopRingtoneNodes();
}


// ── Call End Beep ──
export function playEndCallBeep() {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(480, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(300, ctx.currentTime + 0.5);
    
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
    
    osc.onended = () => {
      try { osc.disconnect(); gain.disconnect(); } catch(e) {}
    };
  } catch(e) {
    console.warn('[Sounds] End beep error:', e);
  }
}


// ── Warm up AudioContext (call from user gesture for iOS Safari) ──
// Mobile Safari blocks Web Audio API unless AudioContext is created/resumed
// during a user gesture (tap/click). Call this from button handlers to unlock audio.
export function warmUpAudio() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    // Play a silent buffer to fully unlock audio on iOS Safari
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
  } catch (e) {
    console.warn('[Sounds] warmUpAudio error:', e);
  }
}


// ── Cleanup ──
export function cleanupAudio() {
  stopDialingTone();
  stopRingtone();
  if (audioContext && audioContext.state !== 'closed') {
    try { audioContext.close(); } catch(e) {}
    audioContext = null;
  }
}
