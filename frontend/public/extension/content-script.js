/**
 * Gmail Content Script
 * Runs in the context of mail.google.com pages
 * Extracts email data and manipulates Gmail DOM
 */

console.log('Gmail AI Assistant content script loaded');

// Listen for messages from the extension popup/sidepanel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);

  if (request.action === 'GET_EMAIL_DATA') {
    getEmailData()
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }

  if (request.action === 'INSERT_REPLY') {
    insertReply(request.data.template, request.data.includeHistory)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'SET_BODY_CONTENT') {
    setBodyContent(request.data.content)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  sendResponse({ success: false, error: 'Unknown action' });
  return false;
});

/**
 * Extract email data from current Gmail view
 * Uses Gmail DOM selectors (may need updates as Gmail changes)
 */
async function getEmailData() {
  return new Promise((resolve, reject) => {
    try {
      // Check if we're viewing an email
      const emailView = document.querySelector('[role="main"]');
      if (!emailView) {
        throw new Error('No email view found');
      }

      // Extract subject
      const subjectElement = document.querySelector('h2.hP');
      const subject = subjectElement ? subjectElement.textContent.trim() : '';

      // Extract sender
      const senderElement = document.querySelector('span.gD[email]');
      const from = senderElement ? senderElement.getAttribute('email') || '' : '';

      // Extract body - try multiple selectors
      let body = '';
      const bodyElement = document.querySelector('div.a3s.aiL') || 
                         document.querySelector('div[data-message-id]');
      if (bodyElement) {
        body = bodyElement.innerText || bodyElement.textContent || '';
      }

      // Extract date
      const dateElement = document.querySelector('span.g3[title]');
      const dateStr = dateElement ? dateElement.getAttribute('title') : null;
      const date = dateStr ? new Date(dateStr).toISOString() : null;

      // Extract conversation/thread ID from URL
      const url = window.location.href;
      const threadMatch = url.match(/mail\/u\/\d+\/[^/]+\/([a-zA-Z0-9]+)/);
      const threadId = threadMatch ? threadMatch[1] : null;

      // Extract message ID from DOM if available
      const messageElement = document.querySelector('[data-message-id]');
      const messageId = messageElement ? messageElement.getAttribute('data-message-id') : null;

      // Extract recipients (To, CC)
      const toElements = document.querySelectorAll('span.g2[email]');
      const to = Array.from(toElements).map(el => el.getAttribute('email')).filter(Boolean).join(', ');

      resolve({
        subject,
        from,
        body,
        to,
        date,
        threadId,
        messageId,
        conversationId: threadId, // Use threadId as conversationId
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Insert reply with AI-generated template
 * Opens reply composer and fills it with the template
 */
async function insertReply(template, includeHistory = false) {
  return new Promise((resolve, reject) => {
    try {
      // Click reply button
      const replyButton = document.querySelector('div[data-tooltip="Reply"]') ||
                         document.querySelector('[aria-label*="Reply"]');
      
      if (!replyButton) {
        throw new Error('Reply button not found');
      }

      replyButton.click();

      // Wait for compose box to appear
      setTimeout(() => {
        try {
          // Find the compose editor
          const composeBox = document.querySelector('div[contenteditable="true"][aria-label*="Message"]') ||
                            document.querySelector('div.Am.Al.editable[contenteditable="true"]');

          if (!composeBox) {
            throw new Error('Compose box not found');
          }

          // Set the content
          composeBox.innerHTML = template.replace(/\n/g, '<br>');
          
          // Trigger input event so Gmail knows content changed
          const event = new Event('input', { bubbles: true });
          composeBox.dispatchEvent(event);

          resolve();
        } catch (error) {
          reject(error);
        }
      }, 500); // Give Gmail time to open compose box
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Set body content in compose window (for compose mode)
 * Finds active compose window and sets its content
 */
async function setBodyContent(content) {
  return new Promise((resolve, reject) => {
    try {
      // Find active compose window
      const composeBox = document.querySelector('div[contenteditable="true"][aria-label*="Message"]') ||
                        document.querySelector('div.Am.Al.editable[contenteditable="true"]');

      if (!composeBox) {
        throw new Error('No active compose window found');
      }

      // Set the content
      composeBox.innerHTML = content.replace(/\n/g, '<br>');
      
      // Trigger input event
      const event = new Event('input', { bubbles: true });
      composeBox.dispatchEvent(event);

      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

// Notify extension that content script is ready
chrome.runtime.sendMessage({ action: 'CONTENT_SCRIPT_READY' }, response => {
  console.log('Content script registered with extension');
});
