# PO Approval Tracker - Secure Edition

A secure, enterprise-grade purchase order approval tracking system with Google OAuth authentication and comprehensive security features.

## Security Features

- **Google OAuth Authentication**: Only authorized users can access the application
- **Domain-based Access Control**: Restrict access to specific email domains
- **Security Headers**: Comprehensive HTTP security headers including CSP, HSTS, X-Frame-Options
- **Session Management**: Secure client-side session handling with automatic expiration
- **Environment Variable Protection**: Backend URLs and credentials not exposed in client code
- **HTTPS Enforcement**: Strict Transport Security enabled

## Prerequisites

1. **Google Cloud Project** with OAuth 2.0 credentials
2. **Vercel Account** for hosting
3. **Google Apps Script** backend (already deployed)

## Setup Instructions

### Step 1: Set Up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**
5. Select **Web application**
6. Add authorized JavaScript origins:
   - `http://localhost:3000` (for local testing)
   - `https://your-domain.vercel.app` (your Vercel deployment URL)
7. Add authorized redirect URIs:
   - `http://localhost:3000`
   - `https://your-domain.vercel.app`
8. Copy the **Client ID** (you'll need this later)

### Step 2: Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and update the values:
   ```env
   GOOGLE_CLIENT_ID=your-actual-client-id.apps.googleusercontent.com
   BACKEND_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
   AUTHORIZED_DOMAINS=yourcompany.com,yourdomain.com
   ```

### Step 3: Deploy to Vercel

#### Option A: Deploy via Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   vercel
   ```

4. Set environment variables in Vercel:
   ```bash
   vercel env add GOOGLE_CLIENT_ID
   vercel env add BACKEND_URL
   vercel env add AUTHORIZED_DOMAINS
   ```

5. Deploy to production:
   ```bash
   vercel --prod
   ```

#### Option B: Deploy via Vercel Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New** > **Project**
3. Import your Git repository
4. Configure environment variables:
   - `GOOGLE_CLIENT_ID`
   - `BACKEND_URL`
   - `AUTHORIZED_DOMAINS`
5. Deploy

### Step 4: Update Google OAuth Authorized URLs

1. Go back to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Credentials**
3. Edit your OAuth client ID
4. Add your Vercel deployment URL to:
   - Authorized JavaScript origins: `https://your-app.vercel.app`
   - Authorized redirect URIs: `https://your-app.vercel.app`

### Step 5: Test Authentication

1. Visit your deployed URL
2. You should see a login screen
3. Click "Sign in with Google"
4. Sign in with an account from your authorized domain
5. You should now see the PO tracker dashboard

## Local Development

For local development without authentication (testing only):

1. Open `index.html` directly in your browser
2. The app will use fallback values and allow access without authentication
3. **Note**: This is for development only. Never deploy without proper authentication.

## Security Configuration

### Authorized Domains

Edit the `AUTHORIZED_DOMAINS` environment variable to control which email domains can access the app:

```env
AUTHORIZED_DOMAINS=company.com,partner.com
```

Only users with email addresses ending in these domains will be granted access.

### Security Headers Explained

The application includes the following security headers:

- **X-Frame-Options: DENY** - Prevents clickjacking attacks
- **X-Content-Type-Options: nosniff** - Prevents MIME type sniffing
- **X-XSS-Protection** - Enables browser XSS protection
- **Referrer-Policy** - Controls referrer information
- **Permissions-Policy** - Restricts browser features
- **Content-Security-Policy** - Prevents XSS and injection attacks
- **Strict-Transport-Security** - Enforces HTTPS connections

### Session Management

- User sessions are stored in localStorage
- Sessions persist across page reloads
- Users can sign out at any time via the profile menu
- Sessions include user email, name, and profile picture

## Troubleshooting

### "Access denied" error

- Verify the user's email domain matches your `AUTHORIZED_DOMAINS` setting
- Check that the domain is properly configured in your environment variables

### OAuth not working

- Ensure your Google Client ID is correctly set in Vercel environment variables
- Verify that your deployment URL is added to Google OAuth authorized URLs
- Check browser console for detailed error messages

### Build fails on Vercel

- Ensure all environment variables are set in Vercel dashboard
- Check build logs for specific error messages
- Verify `package.json` and `build.js` are committed to your repository

### Backend connection issues

- Verify `BACKEND_URL` is correctly set and accessible
- Check that Google Apps Script is deployed and public
- Review CORS settings if you see cross-origin errors

## File Structure

```
.
├── index.html          # Main application file with OAuth integration
├── po-tracker.html     # Legacy version (without auth)
├── build.js            # Build script for environment variable injection
├── package.json        # Node.js project configuration
├── vercel.json         # Vercel configuration with security headers
├── .env.example        # Example environment variables
├── .gitignore          # Git ignore patterns
└── README.md           # This file
```

## Maintenance

### Updating Authorized Domains

1. Update the `AUTHORIZED_DOMAINS` environment variable in Vercel
2. Redeploy the application
3. Existing sessions will be validated against new domains on next page load

### Rotating OAuth Credentials

1. Create new OAuth client ID in Google Cloud Console
2. Update `GOOGLE_CLIENT_ID` in Vercel environment variables
3. Redeploy
4. All users will need to sign in again

### Updating Backend URL

1. Update `BACKEND_URL` in Vercel environment variables
2. Redeploy
3. Application will connect to new backend immediately

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review browser console for error messages
3. Check Vercel deployment logs
4. Verify all environment variables are correctly set

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Regularly rotate OAuth credentials**
3. **Monitor access logs** in Vercel analytics
4. **Keep authorized domains list** up to date
5. **Review security headers** periodically
6. **Use HTTPS only** - never allow HTTP access
7. **Audit user access** regularly

## License

Proprietary - Internal Use Only
