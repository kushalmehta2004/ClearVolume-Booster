import React, { useState, useEffect } from 'react';
import { saveAs } from 'file-saver';
import './Popup.css';

const Popup = () => {
  // State
  const [volume, setVolume] = useState(100);
  const [equalizer, setEqualizer] = useState({ mid: 3, treble: -3 });
  const [audibleTabs, setAudibleTabs] = useState([]);
  const [selectedTabId, setSelectedTabId] = useState(null);
  const [jsonOutput, setJsonOutput] = useState('');
  const [warning, setWarning] = useState('');
  const [isProcessingActive, setIsProcessingActive] = useState(false);

  // Load tabs playing audio when popup opens
  useEffect(() => {
    const loadAudibleTabs = async () => {
      try {
        const response = await chrome.runtime.sendMessage({ action: 'getAudibleTabs' });
        if (response && response.audibleTabs) {
          setAudibleTabs(response.audibleTabs);
          
          // Select the first tab by default
          if (response.audibleTabs.length > 0 && !selectedTabId) {
            setSelectedTabId(response.audibleTabs[0].id);
            
            // Get current settings from content script
            getTabStatus(response.audibleTabs[0].id);
          }
        }
      } catch (error) {
        console.error('Error loading audible tabs:', error);
      }
    };
    
    loadAudibleTabs();
    
    // Poll for audible tabs every 5 seconds
    const interval = setInterval(loadAudibleTabs, 5000);
    
    // Show safety warning
    setWarning('Warning: High volumes may damage speakers or hearing.');
    
    return () => clearInterval(interval);
  }, [selectedTabId]);
  
  // Get status from the content script in the selected tab
  const getTabStatus = async (tabId) => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'sendToTab',
        tabId,
        data: { action: 'getStatus' }
      });
      
      if (response) {
        if (response.volume) {
          setVolume(response.volume);
        }
        
        if (response.equalizer) {
          setEqualizer(response.equalizer);
        }
        
        if (response.processingActive) {
          setIsProcessingActive(response.processingActive);
        }
      }
    } catch (error) {
      console.error('Error getting tab status:', error);
    }
  };

  // Handle volume change
  const handleVolumeChange = async (e) => {
    const newVolume = parseInt(e.target.value, 10);
    setVolume(newVolume);
    
    // Send to content script if a tab is selected
    if (selectedTabId) {
      try {
        await chrome.runtime.sendMessage({
          action: 'sendToTab',
          tabId: selectedTabId,
          data: { action: 'setVolume', volume: newVolume }
        });
      } catch (error) {
        console.error('Error setting volume:', error);
      }
    }
  };

  // Handle equalizer change
  const handleEqChange = async (type, value) => {
    const newEqualizer = { ...equalizer, [type]: value };
    setEqualizer(newEqualizer);
    
    // Send to content script if a tab is selected
    if (selectedTabId) {
      try {
        await chrome.runtime.sendMessage({
          action: 'sendToTab',
          tabId: selectedTabId,
          data: { action: 'setEqualizer', equalizer: newEqualizer }
        });
      } catch (error) {
        console.error('Error setting equalizer:', error);
      }
    }
  };

  // Handle tab selection
  const handleTabSelect = (tabId) => {
    setSelectedTabId(tabId);
    getTabStatus(tabId);
  };

  // Export settings as JSON
  const exportSettings = () => {
    const settings = { volume, equalizer };
    const jsonString = JSON.stringify(settings, null, 2);
    setJsonOutput(jsonString);
    
    // Create a Blob and download with file-saver
    const blob = new Blob([jsonString], { type: 'application/json' });
    saveAs(blob, 'audio-settings.json');
  };

  // Listen for messages from content script (like clipping warnings)
  useEffect(() => {
    const handleMessage = (message) => {
      if (message.action === 'clipping_detected') {
        setWarning(message.message);
        
        // Clear warning after 5 seconds
        setTimeout(() => {
          setWarning('Warning: High volumes may damage speakers or hearing.');
        }, 5000);
      }
    };
    
    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  return (
    <div className="w-[350px] p-4 bg-gray-100">
      <h1 className="text-xl font-bold text-center mb-4">ClearVolume Booster</h1>
      
      {/* Status indicator */}
      <div className="flex items-center justify-center mb-4">
        <div className={`h-3 w-3 rounded-full mr-2 ${isProcessingActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <span className="text-sm text-gray-700">
          {isProcessingActive ? 'Audio processing active' : 'No audio processing detected'}
        </span>
      </div>
      
      {/* Volume Control */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Volume Boost: {volume}%
        </label>
        <input
          type="range"
          min="0"
          max="600"
          step="5"
          value={volume}
          onChange={handleVolumeChange}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0%</span>
          <span>300%</span>
          <span>600%</span>
        </div>
      </div>
      
      {/* Equalizer */}
      <div className="mb-4">
        <h2 className="text-md font-medium text-gray-700 mb-2">Equalizer</h2>
        
        {/* Mid frequencies */}
        <div className="mb-2">
          <label className="block text-sm text-gray-700 mb-1">
            Mid (1-3kHz): {equalizer.mid} dB
          </label>
          <input
            type="range"
            min="-12"
            max="12"
            value={equalizer.mid}
            onChange={(e) => handleEqChange('mid', parseInt(e.target.value, 10))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>-12 dB</span>
            <span>0 dB</span>
            <span>+12 dB</span>
          </div>
        </div>
        
        {/* Treble frequencies */}
        <div>
          <label className="block text-sm text-gray-700 mb-1">
            Treble (>8kHz): {equalizer.treble} dB
          </label>
          <input
            type="range"
            min="-12"
            max="12"
            value={equalizer.treble}
            onChange={(e) => handleEqChange('treble', parseInt(e.target.value, 10))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>-12 dB</span>
            <span>0 dB</span>
            <span>+12 dB</span>
          </div>
        </div>
      </div>
      
      {/* Audible Tabs */}
      {audibleTabs.length > 0 && (
        <div className="mb-4">
          <h2 className="text-md font-medium text-gray-700 mb-2">Tabs Playing Audio</h2>
          <ul className="max-h-32 overflow-y-auto border border-gray-200 rounded-md divide-y">
            {audibleTabs.map(tab => (
              <li
                key={tab.id}
                onClick={() => handleTabSelect(tab.id)}
                className={`p-2 cursor-pointer hover:bg-gray-200 flex items-center ${selectedTabId === tab.id ? 'bg-blue-100' : ''}`}
              >
                {tab.favIconUrl && (
                  <img src={tab.favIconUrl} alt="" className="w-4 h-4 mr-2" />
                )}
                <span className="text-sm truncate">{tab.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Export Settings */}
      <div className="mb-4">
        <button
          onClick={exportSettings}
          className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md w-full"
        >
          Export Settings
        </button>
        
        {jsonOutput && (
          <div className="mt-2">
            <textarea
              readOnly
              value={jsonOutput}
              className="w-full h-24 p-2 text-xs font-mono border border-gray-300 rounded-md"
            />
          </div>
        )}
      </div>
      
      {/* Warning */}
      {warning && (
        <div className="p-2 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 text-xs">
          <p>{warning}</p>
        </div>
      )}
    </div>
  );
};

export default Popup;