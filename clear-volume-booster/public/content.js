// ClearVolume Booster - Content Script
// This script handles audio processing for web media elements

// Store audio nodes for each media element
const sourceNodes = new Map();
// Default settings
let volume = 100;
let equalizer = { mid: 3, treble: -3 };
// Audio context
let audioContext = null;

// Initialize the audio context
function initAudioContext() {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      console.log('ClearVolume: Audio context initialized');
    } catch (e) {
      console.error('ClearVolume: Failed to create audio context', e);
      return false;
    }
  }
  return true;
}

// Process a media element
function processMediaElement(mediaElement) {
  // Skip if already processed or not a valid media element
  if (sourceNodes.has(mediaElement) || !mediaElement.src) {
    return;
  }

  try {
    if (!initAudioContext()) {
      return;
    }

    // Create source node from media element
    const source = audioContext.createMediaElementSource(mediaElement);
    
    // Create compressor for dynamic range compression
    const compressor = audioContext.createDynamicsCompressor();
    compressor.threshold.value = -50; // dB
    compressor.ratio.value = 12; // 12:1 compression ratio
    compressor.attack.value = 0; // 0 ms
    compressor.release.value = 0.25; // 0.25 seconds
    
    // Create limiter to prevent clipping
    const limiter = audioContext.createDynamicsCompressor();
    limiter.threshold.value = -10; // dB
    limiter.ratio.value = 20; // 20:1 compression ratio (limiting)
    limiter.attack.value = 0; // 0 ms
    limiter.release.value = 0.1; // 0.1 seconds
    
    // Create mid-frequency EQ (1-3 kHz)
    const midEQ = audioContext.createBiquadFilter();
    midEQ.type = 'peaking';
    midEQ.frequency.value = 2000; // 2 kHz
    midEQ.gain.value = equalizer.mid; // Default mid boost
    
    // Create treble EQ (>8 kHz)
    const trebleEQ = audioContext.createBiquadFilter();
    trebleEQ.type = 'highshelf';
    trebleEQ.frequency.value = 8000; // 8 kHz
    trebleEQ.gain.value = equalizer.treble; // Default treble reduction
    
    // Create gain node for volume control
    const gainNode = audioContext.createGain();
    gainNode.gain.value = volume / 100; // Convert percentage to gain value
    
    // Create analyser node for clipping detection
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    
    // Connect all nodes
    source.connect(compressor);
    compressor.connect(limiter);
    limiter.connect(midEQ);
    midEQ.connect(trebleEQ);
    trebleEQ.connect(gainNode);
    gainNode.connect(analyser);
    analyser.connect(audioContext.destination);
    
    // Store nodes for future updates
    sourceNodes.set(mediaElement, {
      source,
      compressor,
      limiter,
      midEQ,
      trebleEQ,
      gainNode,
      analyser
    });
    
    console.log('ClearVolume: Processed media element', mediaElement.src);
    
    // Start clipping detection
    detectClipping(mediaElement);
    
  } catch (e) {
    console.error('ClearVolume: Error processing media element', e);
  }
}

// Detect clipping in the audio signal
function detectClipping(mediaElement) {
  const nodes = sourceNodes.get(mediaElement);
  if (!nodes) return;
  
  const { analyser, gainNode } = nodes;
  const dataArray = new Float32Array(analyser.fftSize);
  
  const checkClipping = () => {
    if (!sourceNodes.has(mediaElement)) return; // Element no longer exists
    
    analyser.getFloatTimeDomainData(dataArray);
    
    // Check for values approaching clipping
    const maxAmplitude = Math.max(...dataArray.map(Math.abs));
    
    if (maxAmplitude > 0.9) {
      // Reduce gain to prevent clipping
      const currentGain = gainNode.gain.value;
      const newGain = currentGain * 0.95; // Reduce by 5%
      
      gainNode.gain.value = newGain;
      
      // Send message to popup about clipping
      chrome.runtime.sendMessage({
        action: 'clipping_detected',
        message: 'Clipping detected, reducing volume to prevent distortion'
      }).catch(() => {}); // Ignore errors when popup isn't open
      
      console.warn('ClearVolume: Clipping detected, reducing gain', { maxAmplitude, newGain });
    }
    
    // Continue checking if element is still playing
    if (!mediaElement.paused) {
      requestAnimationFrame(checkClipping);
    }
  };
  
  requestAnimationFrame(checkClipping);
}

// Find and process all media elements on the page
function findAndProcessMediaElements() {
  const mediaElements = document.querySelectorAll('audio, video');
  mediaElements.forEach(processMediaElement);
}

// Update volume setting
function updateVolume(newVolume) {
  volume = Math.min(Math.max(0, newVolume), 600); // Clamp to 0-600%
  
  sourceNodes.forEach(({ gainNode }) => {
    // Smoothly transition to new volume
    gainNode.gain.linearRampToValueAtTime(
      volume / 100,
      audioContext.currentTime + 0.05
    );
  });
  
  console.log('ClearVolume: Volume updated to', volume);
}

// Update equalizer settings
function updateEqualizer(newEqualizer) {
  equalizer = {
    mid: Math.min(Math.max(-12, newEqualizer.mid), 12), // Clamp to -12 to +12 dB
    treble: Math.min(Math.max(-12, newEqualizer.treble), 12) // Clamp to -12 to +12 dB
  };
  
  sourceNodes.forEach(({ midEQ, trebleEQ }) => {
    // Update EQ settings
    midEQ.gain.value = equalizer.mid;
    trebleEQ.gain.value = equalizer.treble;
  });
  
  console.log('ClearVolume: Equalizer updated', equalizer);
}

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    if (message.action === 'setVolume') {
      updateVolume(message.volume);
      sendResponse({ success: true });
    } else if (message.action === 'setEqualizer') {
      updateEqualizer(message.equalizer);
      sendResponse({ success: true });
    } else if (message.action === 'getStatus') {
      sendResponse({
        volume,
        equalizer,
        processingActive: sourceNodes.size > 0
      });
    }
  } catch (e) {
    console.error('ClearVolume: Error handling message', e);
    sendResponse({ error: e.message });
  }
  
  return true; // Keep the message channel open for async responses
});

// Process existing media elements
findAndProcessMediaElements();

// Set up MutationObserver to detect new media elements
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach((node) => {
        if (node.tagName === 'AUDIO' || node.tagName === 'VIDEO') {
          processMediaElement(node);
        } else if (node.querySelectorAll) {
          node.querySelectorAll('audio, video').forEach(processMediaElement);
        }
      });
    }
  });
});

// Start observing the document
observer.observe(document.documentElement, {
  childList: true,
  subtree: true
});

console.log('ClearVolume Booster: Content script initialized');