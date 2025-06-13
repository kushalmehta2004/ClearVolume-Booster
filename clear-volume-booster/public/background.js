// ClearVolume Booster - Background Script
// This script manages tab state and communication between popup and content scripts

// Respond to messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getAudibleTabs') {
    // Find tabs playing audio
    chrome.tabs.query({ audible: true }, (tabs) => {
      const audibleTabs = tabs.map(tab => ({
        id: tab.id,
        title: tab.title,
        url: tab.url,
        favIconUrl: tab.favIconUrl
      }));
      
      sendResponse({ audibleTabs });
    });
    
    return true; // Keep the message channel open for async response
  }
  
  // Forward messages to content script in the specified tab
  if (message.action === 'sendToTab' && message.tabId) {
    chrome.tabs.sendMessage(
      message.tabId,
      message.data,
      (response) => sendResponse(response)
    ).catch(error => {
      console.error('Error sending message to tab:', error);
      sendResponse({ error: error.message });
    });
    
    return true; // Keep the message channel open for async response
  }
});

// When the extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  console.log('ClearVolume Booster extension installed');
});

console.log('ClearVolume Booster: Background script initialized');