// ==UserScript==
// @name         Gmail AI Draft Button
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Add AI draft button to Gmail compose window
// @author       Edoardo
// @match        https://mail.google.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Utility to wait for Gmail compose window
    function waitForComposeBox(cb) {
        const interval = setInterval(() => {
            const compose = document.querySelector('[role="dialog"] textarea[aria-label]');
            if (compose) {
                clearInterval(interval);
                cb(compose);
            }
        }, 1000);
    }

    // Add the AI Draft button
    function addAIDraftButton() {
        waitForComposeBox((compose) => {
            const toolbar = compose.closest('[role="dialog"]').querySelector('[command="Files"]')?.parentElement;
            if (!toolbar || toolbar.querySelector('.ai-draft-btn')) return;

            const btn = document.createElement('button');
            btn.textContent = 'Draft with AI';
            btn.className = 'ai-draft-btn';
            btn.style.marginLeft = '8px';
            btn.onclick = async function() {
                btn.disabled = true;
                btn.textContent = 'Drafting...';
                // Get email context
                const subject = document.querySelector('input[name="subjectbox"]').value;
                const recipient = document.querySelector('textarea[name="to"]').value;
                const conversation = getThreadText();
                const user_id = getUserEmail();
                const prompt = "Rédige une réponse polie et professionnelle à ce fil de discussion.";
                const res = await fetch('http://localhost:5001/generate-email-draft', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({subject, recipient, prompt, conversation, user_id})
                });
                const data = await res.json();
                compose.value = data.draft;
                btn.disabled = false;
                btn.textContent = 'Draft with AI';
            };
            toolbar.appendChild(btn);
        });
    }

    // Dummy functions: you must adapt these to extract Gmail data correctly
    function getThreadText() {
        // Example: concatenate all visible message bodies in the thread
        let thread = '';
        document.querySelectorAll('.a3s.aXjCH').forEach(el => {
            thread += el.innerText + '\n\n';
        });
        return thread.trim();
    }
    function getUserEmail() {
        // Example: get user's email from Gmail page
        const meta = document.querySelector('meta[name="og:title"]');
        if (meta) return meta.content;
        // Fallback: prompt user
        return prompt('Votre adresse email ?');
    }

    // Observe DOM changes to add button on new compose
    const observer = new MutationObserver(addAIDraftButton);
    observer.observe(document.body, {childList: true, subtree: true});

    // Initial call
    addAIDraftButton();
})();
