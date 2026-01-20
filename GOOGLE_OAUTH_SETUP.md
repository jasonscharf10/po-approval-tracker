# Google OAuth Setup Guide

## Fix "Error 400: origin_mismatch"

This error means your Vercel deployment URL is not registered in Google Cloud Console as an authorized JavaScript origin.

## Quick Fix (5 minutes)

### Step 1: Get Your Vercel Deployment URL

Your Vercel URL is something like:
- `https://your-app-name.vercel.app`
- `https://your-app-name-123abc.vercel.app`

You can find it in:
- Vercel dashboard under your project
- The URL you're currently trying to access the app from
- Check your browser's address bar

**Important**: Copy the FULL URL including `https://` but WITHOUT any path. Just the domain.

### Step 2: Update Google OAuth Client

1. Go to [Google Cloud Console](https://console.cloud.google.com/)

2. Navigate to **APIs & Services** > **Credentials**
   - Or use this direct link: https://console.cloud.google.com/apis/credentials

3. Find your OAuth 2.0 Client ID in the list
   - It will be under "OAuth 2.0 Client IDs"
   - Click on the client ID name to edit it

4. **Add Authorized JavaScript origins**

   In the **Authorized JavaScript origins** section, click **+ ADD URI**

   Add these URLs (replace with your actual domain):
   ```
   https://your-app.vercel.app
   ```

   **Also add (if testing locally):**
   ```
   http://localhost:5000
   http://localhost:3000
   http://127.0.0.1:5000
   ```

5. **Add Authorized redirect URIs**

   In the **Authorized redirect URIs** section, click **+ ADD URI**

   Add the same URLs:
   ```
   https://your-app.vercel.app
   ```

   **Note**: For Google Sign-In with the gsi/client library, redirect URIs are usually not required, but some configurations may need them.

6. Click **SAVE** at the bottom of the page

### Step 3: Wait for Changes to Propagate

Google OAuth changes can take **5-10 minutes** to propagate. You might need to:
- Wait a few minutes
- Clear your browser cache
- Try in an incognito/private window
- Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

### Step 4: Test Again

1. Go to your Vercel app URL
2. Try to sign in with Google
3. You should now be able to sign in successfully

## Common Mistakes

### ❌ Wrong: Including path in the origin
```
https://your-app.vercel.app/index.html  ❌ DON'T DO THIS
```

### ✅ Correct: Just the domain
```
https://your-app.vercel.app  ✅ CORRECT
```

### ❌ Wrong: Using http instead of https
```
http://your-app.vercel.app  ❌ DON'T DO THIS (Vercel uses HTTPS)
```

### ✅ Correct: Always use https for Vercel
```
https://your-app.vercel.app  ✅ CORRECT
```

### ❌ Wrong: Forgetting localhost for local testing
```
Only adding Vercel URL  ❌ Won't work for local testing
```

### ✅ Correct: Add both Vercel and localhost
```
https://your-app.vercel.app
http://localhost:3000  ✅ CORRECT
```

## Troubleshooting

### Still getting origin_mismatch after adding the URL?

1. **Double-check the URL is EXACTLY correct**
   - Copy it from your browser address bar
   - Make sure there are no trailing slashes
   - Make sure it's https:// not http://

2. **Clear your browser cache**
   - Chrome: Ctrl+Shift+Delete (or Cmd+Shift+Delete on Mac)
   - Clear "Cached images and files"
   - Click "Clear data"

3. **Try incognito/private window**
   - This ensures no cached OAuth data is being used

4. **Wait 5-10 minutes**
   - Google's OAuth changes take time to propagate

5. **Check you're editing the correct OAuth Client ID**
   - The Client ID in your code should match the one you're editing
   - Your Client ID should look like: `123456789-abc123def456.apps.googleusercontent.com`

### How to verify your Client ID

1. Check your Vercel environment variables:
   - Go to Vercel dashboard
   - Project Settings > Environment Variables
   - Find `GOOGLE_CLIENT_ID`
   - Note the value

2. Compare with Google Cloud Console:
   - Go to [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials)
   - Find the OAuth Client ID
   - Click to edit it
   - Compare the Client ID at the top

3. Make sure they match!

## Advanced: Custom Domain Setup

If you're using a custom domain with Vercel:

1. Add your custom domain as an authorized JavaScript origin:
   ```
   https://po-tracker.yourcompany.com
   ```

2. Don't forget to also keep the Vercel URL:
   ```
   https://your-app.vercel.app
   https://po-tracker.yourcompany.com
   ```

3. Both should work

## Complete OAuth Configuration Example

Here's what your **Authorized JavaScript origins** should look like:

```
https://your-app.vercel.app
https://your-app-preview-abc123.vercel.app  (if using preview deployments)
http://localhost:3000  (for local development)
http://localhost:5000  (alternative local port)
http://127.0.0.1:3000  (alternative localhost)
```

**Authorized redirect URIs** (usually not needed for Google Sign-In button):
```
https://your-app.vercel.app
http://localhost:3000
```

## Still Having Issues?

### Check the Error Details

The error page has a link "see error details" - click it to see:
- **Request Details**: Shows what origin was used
- **Your OAuth Client ID**: Confirms which client you need to update
- **What to do**: Google's suggestions

### Enable Debug Mode

Add this to your index.html temporarily to see what's being used:

```javascript
console.log('Current origin:', window.location.origin);
console.log('Google Client ID:', GOOGLE_CLIENT_ID);
```

This will show in the browser console (F12 > Console) what values are being used.

## Next Steps

After fixing the OAuth origin issue:
1. ✅ OAuth sign-in should work
2. ✅ You can now test the backend connection
3. ✅ If you still get "Failed to fetch", see [GOOGLE_APPS_SCRIPT_SETUP.md](GOOGLE_APPS_SCRIPT_SETUP.md)

## Security Note

Adding `http://localhost` origins is safe for development. These are only used when you're testing locally on your own machine. Production users will always use the `https://` Vercel URL.
