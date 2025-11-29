/**
 * Background Service Worker for Gmail Extension
 * Handles extension lifecycle and message routing
 */

console.log('Gmail AI Assistant background service worker loaded');

// Listen for extension install/update
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed/updated:', details.reason);
  
  if (details.reason === 'install') {
    // First install - could open welcome page
    console.log('First time installation');
  } else if (details.reason === 'update') {
    console.log('Extension updated');
  }
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request, 'from:', sender);

  if (request.action === 'CONTENT_SCRIPT_READY') {
    console.log('Content script is ready in tab:', sender.tab?.id);
    sendResponse({ success: true });
    return false;
  }

  // Add more background message handlers here if needed
  
  return false;
});

// Note: Extension icon click will automatically open the popup defined in manifest.json
// No need to handle it here unless you want custom behavior

// Keep service worker alive
chrome.runtime.onConnect.addListener((port) => {
  console.log('Port connected:', port.name);
});

console.log('Background service worker initialized');
