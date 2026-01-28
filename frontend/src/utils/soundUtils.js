/**
 * Sound utility for playing notification sounds
 */

// Create a single AudioContext that persists
let globalAudioContext = null;
let soundInitialized = false;

/**
 * Initialize audio context and handle autoplay restrictions
 */
export const initializeAudioContext = () => {
  if (soundInitialized) return;

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass && !globalAudioContext) {
      globalAudioContext = new AudioContextClass();
      console.log('[SOUND] Global audio context created');
      soundInitialized = true;
    }
  } catch (error) {
    console.error('[SOUND] Failed to create audio context:', error);
  }
};

/**
 * Resume audio context if suspended
 */
const resumeAudioContext = async (skipDelay = false) => {
  if (!globalAudioContext) {
    initializeAudioContext();
  }

  if (!globalAudioContext) {
    console.warn('[SOUND] Audio context not available');
    return;
  }

  // Ensure audio context is running
  if (globalAudioContext.state === 'suspended') {
    try {
      await globalAudioContext.resume();
      console.log('[SOUND] Audio context resumed, state:', globalAudioContext.state);
    } catch (error) {
      console.error('[SOUND] Failed to resume audio context:', error);
      // Try creating a new context
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        globalAudioContext = new AudioContextClass();
        console.log('[SOUND] Created new audio context');
      } catch (createError) {
        console.error('[SOUND] Failed to create new audio context:', createError);
      }
    }
  }

  // Wait a bit to ensure context is ready (skip if immediate playback needed)
  if (!skipDelay && globalAudioContext.state === 'running') {
    await new Promise(resolve => setTimeout(resolve, 50));
  }
};

/**
 * Play notification sound using Web Audio API
 * Creates three ascending tones (pleasant chime)
 * @param {boolean} immediate - If true, plays immediately without delays
 */
export const playNotificationSound = async (immediate = false) => {
  try {
    // For immediate playback, try to use existing context first
    if (immediate && globalAudioContext && globalAudioContext.state === 'running') {
      // Context is ready - play immediately without any async delays
      const audioContext = globalAudioContext;
      const now = audioContext.currentTime;
      
      // Play tones immediately
      const tones = [
        { frequency: 523.25, delay: 0 },      // C5
        { frequency: 659.25, delay: 0.15 },   // E5
        { frequency: 783.99, delay: 0.3 }     // G5
      ];

      tones.forEach(({ frequency, delay }) => {
        try {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);

          oscillator.frequency.value = frequency;
          oscillator.type = 'sine';

          const startTime = now + delay;
          const duration = 0.15;

          gainNode.gain.setValueAtTime(0, startTime);
          gainNode.gain.linearRampToValueAtTime(0.7, startTime + 0.02);
          gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

          oscillator.start(startTime);
          oscillator.stop(startTime + duration);
        } catch (toneError) {
          // Silently fail for individual tones
        }
      });
      return; // Exit early - sound is playing
    }
    
    // Initialize and resume audio context (skip delay if immediate)
    await resumeAudioContext(immediate);

    if (!globalAudioContext) {
      // Try to create a new one
      initializeAudioContext();
      if (!globalAudioContext) {
        playFallbackBeep();
        return;
      }
    }

    if (globalAudioContext.state === 'closed') {
      initializeAudioContext();
    }

    if (globalAudioContext.state !== 'running') {
      try {
        await globalAudioContext.resume();
      } catch (e) {
        playFallbackBeep();
        return;
      }
    }

    const audioContext = globalAudioContext;
    // Use currentTime immediately - don't wait
    const now = audioContext.currentTime;

    // Three ascending tones for a pleasant notification sound
    // Musical notes: C5 (523Hz) - E5 (659Hz) - G5 (784Hz)
    const tones = [
      { frequency: 523.25, delay: 0 },      // C5
      { frequency: 659.25, delay: 0.15 },   // E5
      { frequency: 783.99, delay: 0.3 }     // G5
    ];

    tones.forEach(({ frequency, delay }) => {
      try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        // Connect nodes
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Set oscillator properties
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';

        // Schedule the tone - start immediately
        const startTime = now + delay;
        const duration = 0.15;

        // Envelope: attack, sustain, release
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.7, startTime + 0.02);     // Attack
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration); // Decay

        // Play the tone
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);

        console.log(`[SOUND] Playing tone: ${frequency}Hz at ${delay}s`);
      } catch (toneError) {
        console.error('[SOUND] Error creating tone:', toneError);
      }
    });

    console.log('[SOUND] Notification sound played successfully');
  } catch (error) {
    console.error('[SOUND] Error playing notification sound:', error);
    // Fallback to simple beep
    playFallbackBeep();
  }
};

/**
 * Fallback: Play a simple beep
 */
const playFallbackBeep = async () => {
  try {
    const audioContext = globalAudioContext || new (window.AudioContext || window.webkitAudioContext)();
    const now = audioContext.currentTime;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.5, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    oscillator.start(now);
    oscillator.stop(now + 0.15);

    console.log('[SOUND] Fallback beep played');
  } catch (error) {
    console.error('[SOUND] Fallback beep failed:', error);
  }
};

/**
 * Initialize sound on first user interaction
 */
export const initializeAudioOnInteraction = () => {
  if (typeof window === 'undefined') return;

  const initHandler = async () => {
    console.log('[SOUND] User interaction detected, initializing audio');
    await resumeAudioContext();
    
    // Remove listeners after first interaction
    ['click', 'touchstart', 'keydown', 'pointerdown'].forEach(event => {
      window.removeEventListener(event, initHandler);
    });
  };

  // Add listeners for user interaction
  ['click', 'touchstart', 'keydown', 'pointerdown'].forEach(event => {
    window.addEventListener(event, initHandler, { capture: true });
  });
};

