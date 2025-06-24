// Firebase configuration
const firebaseConfig = {
  // Firebase web configuration (not service account credentials)
  apiKey: "AIzaSyC_0gsL5LVVfuUPCToWP0jPeSX3ysZ6Adk", // Example API key, replace with your actual web API key
  authDomain: "localai-e15cb.firebaseapp.com",
  projectId: "localai-e15cb",
  storageBucket: "localai-e15cb.appspot.com",
  // Replace these values with your actual configuration
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// API endpoint for template generation
const API_BASE_URL = "https://chardouin.fr/api";
const API_PROMPT_ENDPOINT = `${API_BASE_URL}/prompt`;

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

Office.onReady((info) => {
  if (info.host === Office.HostType.Outlook) {
    document.getElementById('auth-section').style.display = 'block';
    initializeApp();
  }
});

// Main application initialization
function initializeApp() {
  // Set up event listeners
  document.getElementById('login-button').addEventListener('click', handleLogin);
  document.getElementById('register-link').addEventListener('click', redirectToRegister);
  document.getElementById('logout-button').addEventListener('click', handleLogout);
  document.getElementById('generate-template-button').addEventListener('click', generateTemplate);
  document.getElementById('insert-template-button').addEventListener('click', insertTemplateToNewEmail);
  document.getElementById('back-button').addEventListener('click', showEmailContext);
  
  // Check authentication state
  checkAuthState();
}

// Authentication state observer
function checkAuthState() {
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      // User is signed in
      document.getElementById('login-form').style.display = 'none';
      document.getElementById('user-info').style.display = 'block';
      document.getElementById('user-email').textContent = user.email;
      
      // Show email context section
      document.getElementById('email-context-section').style.display = 'block';
      
      // Check if an email is selected or open
      checkEmailContext();
    } else {
      // User is signed out
      document.getElementById('login-form').style.display = 'block';
      document.getElementById('user-info').style.display = 'none';
      document.getElementById('email-context-section').style.display = 'none';
      document.getElementById('template-result-section').style.display = 'none';
    }
  });
}

// Handle login form submission
function handleLogin() {
  const email = document.getElementById('email-input').value;
  const password = document.getElementById('password-input').value;
  const errorElement = document.getElementById('auth-error');
  
  if (!email || !password) {
    errorElement.textContent = 'Please enter both email and password';
    errorElement.style.display = 'block';
    return;
  }
  
  firebase.auth().signInWithEmailAndPassword(email, password)
    .catch(function(error) {
      // Handle Errors here.
      errorElement.textContent = error.message;
      errorElement.style.display = 'block';
    });
}

// Redirect to registration page
function redirectToRegister() {
  window.open('https://chardouin.fr/register', '_blank');
}

// Handle logout
function handleLogout() {
  firebase.auth().signOut().catch(function(error) {
    console.error('Sign Out Error', error);
  });
}

// Check if an email is selected or open
function checkEmailContext() {
  Office.context.mailbox.getCallbackTokenAsync({ isRest: true }, function(result) {
    if (result.status === Office.AsyncResultStatus.Succeeded) {
      // Check if we're in a read or compose mode
      const mailboxItem = Office.context.mailbox.item;
      
      if (mailboxItem) {
        // Email is selected or open
        document.getElementById('no-email-selected').style.display = 'none';
        document.getElementById('email-selected').style.display = 'block';
        
        // Get email details
        mailboxItem.subject.getAsync(function(asyncResult) {
          if (asyncResult.status === Office.AsyncResultStatus.Succeeded) {
            document.getElementById('email-subject').textContent = asyncResult.value || '(No subject)';
          }
        });
        
        // If in read mode, we can get sender info
        if (mailboxItem.from) {
          document.getElementById('email-from').textContent = mailboxItem.from.emailAddress || mailboxItem.from.displayName || 'Unknown';
        } else {
          document.getElementById('email-from').textContent = 'N/A';
        }
      } else {
        // No email selected or open
        document.getElementById('no-email-selected').style.display = 'block';
        document.getElementById('email-selected').style.display = 'none';
      }
    } else {
      console.error('Error getting callback token:', result.error);
      document.getElementById('no-email-selected').style.display = 'block';
      document.getElementById('email-selected').style.display = 'none';
    }
  });
}

// Generate email template
function generateTemplate() {
  const mailboxItem = Office.context.mailbox.item;
  
  if (!mailboxItem) {
    alert('No email selected or open');
    return;
  }
  
  // Show loading state
  document.getElementById('template-result-section').style.display = 'block';
  document.getElementById('loading-spinner').style.display = 'block';
  document.getElementById('template-content').textContent = '';
  document.getElementById('email-context-section').style.display = 'none';
  
  // Get the email content
  // For read mode
  if (mailboxItem.body && typeof mailboxItem.body.getAsync === 'function') {
    mailboxItem.body.getAsync('text', function(asyncResult) {
      if (asyncResult.status === Office.AsyncResultStatus.Succeeded) {
        const emailBody = asyncResult.value;
        const emailSubject = document.getElementById('email-subject').textContent;
        
        // Call API to generate template
        callTemplateGenerationAPI(emailSubject, emailBody);
      } else {
        handleTemplateError('Could not retrieve email content');
      }
    });
  } else {
    // For compose mode or fallback
    mailboxItem.subject.getAsync(function(asyncResult) {
      const subject = (asyncResult.status === Office.AsyncResultStatus.Succeeded) ? asyncResult.value : '';
      
      callTemplateGenerationAPI(subject, '');
    });
  }
}

// Authenticated fetch helper function
async function authFetch(url, options = {}) {
  const user = firebase.auth().currentUser;
  
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  // Get the user's ID token
  const idToken = await user.getIdToken(true);
  
  // Add authorization header
  const authOptions = {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${idToken}`
    }
  };
  
  return fetch(url, authOptions);
}

// Call API to generate template
async function callTemplateGenerationAPI(subject, body) {
  try {
    const user = firebase.auth().currentUser;
    
    if (!user) {
      handleTemplateError('User not authenticated');
      return;
    }
    
    const promptData = {
      question: subject,
      temperature: 0.7,
      model: 'gpt-4o-mini',
      use_retrieval: true,
      include_profile_context: false,
      conversation_history: [],
      // Include email body as context
      email_body: body
    };
    
    // Use the authenticated fetch function
    const response = await authFetch(API_PROMPT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(promptData)
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    
    // Hide loading state
    document.getElementById('loading-spinner').style.display = 'none';
    
    // Display the generated template
    document.getElementById('template-content').textContent = data.response || data.template || 'No template generated';
  } catch (error) {
    handleTemplateError('Error generating template: ' + error.message);
  }
}

// Handle template generation errors
function handleTemplateError(message) {
  document.getElementById('loading-spinner').style.display = 'none';
  document.getElementById('template-content').innerHTML = `<div class="error-message">${message}</div>`;
}

// Insert template into new email
function insertTemplateToNewEmail() {
  const template = document.getElementById('template-content').textContent;
  
  if (!template || template.trim() === '') {
    alert('No template to insert');
    return;
  }
  
  // Create a new email with the template
  Office.context.mailbox.displayNewMessageForm({
    toRecipients: [],
    subject: '',
    htmlBody: template,
    attachments: []
  });
}

// Show email context section
function showEmailContext() {
  document.getElementById('template-result-section').style.display = 'none';
  document.getElementById('email-context-section').style.display = 'block';
  checkEmailContext(); // Refresh the context in case it changed
}
