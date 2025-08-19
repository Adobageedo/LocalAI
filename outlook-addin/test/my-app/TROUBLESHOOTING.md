# Troubleshooting Outlook Add-in Issues

## Cross-Origin Frame Access Error

**Error Message:**
```
[Error] Blocked a frame with origin "https://localhost:3000" from accessing a frame with origin "https://outlook.live.com". Protocols, domains, and ports must match.
```

### What This Error Means

This error occurs when the add-in tries to access the parent Outlook frame from a different origin. This is a browser security feature that prevents cross-origin frame access.

### Solutions Applied

1. **Removed Duplicate Office.js Initialization**
   - Eliminated duplicate Office.onReady calls between App.tsx and OfficeProvider
   - Single initialization point in OfficeProvider prevents conflicts

2. **Enhanced Error Handling**
   - Added comprehensive try-catch blocks around Office.js API calls
   - Implemented timeout mechanisms for async operations
   - Graceful fallbacks when Office context is unavailable

3. **Defensive Programming**
   - Check for Office.context availability before making API calls
   - Validate Office.context.mailbox and item existence
   - Use Promise-based approach with timeouts for better control

4. **Improved Context Loading**
   - Added delay after Office.onReady to ensure full initialization
   - Concurrent loading of email data with individual timeouts
   - Fallback data when Office APIs fail

### Testing the Fix

1. **Clear Browser Cache**
   ```bash
   # Clear all browser data for localhost:3000
   # Or use incognito/private browsing mode
   ```

2. **Restart the Add-in**
   ```bash
   npm run build
   npm run start:https
   ```

3. **Reload in Outlook**
   - Remove and re-add the add-in in Outlook
   - Or refresh the taskpane if already loaded

### Additional Debugging

1. **Check Browser Console**
   - Open browser dev tools in the taskpane
   - Look for detailed error messages and warnings
   - Monitor Office.js initialization logs

2. **Verify Office.js Loading**
   ```javascript
   // In browser console:
   console.log('Office available:', typeof Office !== 'undefined');
   console.log('Office context:', Office?.context);
   console.log('Mailbox item:', Office?.context?.mailbox?.item);
   ```

3. **Test in Different Environments**
   - Outlook Web (outlook.office.com)
   - Outlook Desktop
   - Different browsers (Edge, Chrome, Firefox)

## Other Common Issues

### SSL Certificate Issues

**Symptoms:**
- "This site is not secure" warnings
- Certificate errors in browser

**Solutions:**
1. Ensure mkcert is properly installed and CA is trusted
2. Regenerate certificates if expired
3. Use exact certificate names in start-https.js

### Manifest Loading Issues

**Symptoms:**
- Add-in doesn't appear in Outlook
- "Invalid manifest" errors

**Solutions:**
1. Validate manifest XML syntax
2. Ensure all URLs are accessible
3. Check that icons exist at specified paths
4. Verify HTTPS endpoints are running

### Firebase Authentication Issues

**Symptoms:**
- Login/register buttons don't work
- Firebase errors in console

**Solutions:**
1. Update Firebase configuration in `src/firebase.ts`
2. Ensure Firebase project is properly configured
3. Check Firebase authentication settings

### API Integration Issues

**Symptoms:**
- Template generation fails
- Network errors when calling AI API

**Solutions:**
1. Verify API endpoint is accessible
2. Check CORS settings on API server
3. Validate API request format and authentication

## Development Best Practices

### For Cross-Origin Safety

1. **Always Check Context Availability**
   ```typescript
   if (typeof Office === 'undefined' || !Office.context) {
     // Handle gracefully
     return;
   }
   ```

2. **Use Timeouts for Async Operations**
   ```typescript
   const timeout = setTimeout(() => {
     console.warn('Operation timed out');
     resolve(defaultValue);
   }, 5000);
   ```

3. **Implement Fallback Mechanisms**
   ```typescript
   try {
     // Office.js operation
   } catch (error) {
     // Provide fallback data or functionality
   }
   ```

### For Better User Experience

1. **Show Loading States**
   - Display loading indicators during initialization
   - Provide feedback for long-running operations

2. **Handle Errors Gracefully**
   - Show user-friendly error messages
   - Provide retry mechanisms where appropriate

3. **Test in Multiple Environments**
   - Different Outlook clients (Web, Desktop)
   - Various browsers and operating systems
   - Different network conditions

## Getting Help

If issues persist:

1. **Check Office.js Documentation**
   - [Office Add-ins documentation](https://docs.microsoft.com/en-us/office/dev/add-ins/)
   - [Office.js API reference](https://docs.microsoft.com/en-us/javascript/api/office)

2. **Enable Verbose Logging**
   - Add more console.log statements
   - Use browser dev tools for detailed debugging

3. **Test with Minimal Configuration**
   - Temporarily disable Firebase authentication
   - Test with mock data instead of Office.js APIs
   - Isolate the problematic component

4. **Community Resources**
   - Stack Overflow with `office-js` tag
   - Microsoft Tech Community forums
   - GitHub issues for Office.js repository
