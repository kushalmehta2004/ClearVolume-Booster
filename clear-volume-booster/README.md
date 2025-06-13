# ClearVolume Booster

A Chrome extension that boosts audio volume up to 600% for web media while minimizing distortion using advanced audio processing.

## Features

- **Volume Boost**: Amplify audio from HTML media elements (<audio>, <video>) up to 6x (600%).
- **Dynamic Range Compression**: Reduce audio peaks to prevent clipping at high volumes.
- **Soft Limiter**: Prevent signal from exceeding safe amplitude using a high-ratio compressor.
- **Basic Equalizer**: Adjust mid-frequencies (1–3 kHz) for voice clarity and reduce treble (>8 kHz) to minimize harshness.
- **Distortion Detection**: Monitor output signal for clipping using real-time analysis.
- **Per-Tab Control**: List tabs playing audio in the popup UI.
- **JSON Settings Export**: Export volume and equalizer settings as a JSON file.

## Technical Implementation

The extension uses:
- **React** for the popup UI
- **Tailwind CSS** for styling
- **Web Audio API** for audio processing:
  - MediaElementSourceNode
  - DynamicsCompressorNode
  - BiquadFilterNode
  - GainNode
  - AnalyserNode
- **Chrome Extension API** (Manifest V3)

## Development

### Setup

1. Clone the repository
2. Run `npm install` to install dependencies
3. Run `npm start` to start the development server
4. Load the `build` folder as an unpacked extension in Chrome

### Build

```bash
npm run build
```

### Load the extension in Chrome

1. Open Chrome and navigate to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `build` folder

## How It Works

ClearVolume Booster uses a combination of audio processing techniques to boost volume without causing distortion:

1. **Dynamic Range Compression**: Reduces the difference between loud and soft sounds, allowing overall volume to be increased without clipping.
2. **Soft Limiting**: Prevents the signal from exceeding safe amplitude levels.
3. **Equalization**: Enhances mid-frequencies for better voice clarity and reduces harsh high frequencies.
4. **Clipping Detection**: Continuously monitors the audio signal and automatically reduces gain if clipping is detected.

## Safety Warning

High volumes can potentially damage speakers or hearing. Use with caution.
