# Google Apps Script Setup Guide

## CRITICAL: Fix "Failed to fetch" CORS Error

The "Failed to fetch" error occurs because Google Apps Script needs to be properly deployed to allow cross-origin requests from your Vercel domain.

## Step 0: Copy the Enhanced Backend Code

1. Open the file `backend-apps-script.gs` in this repository
2. Copy ALL the code
3. Go to https://script.google.com/
4. Open your existing script project
5. **Replace all existing code** with the enhanced code from `backend-apps-script.gs`
6. Click **Save** (Ctrl+S or Cmd+S)

**What's New in the Enhanced Code:**
- ✅ Better error logging for debugging
- ✅ Test endpoint to verify backend is working (`?action=test`)
- ✅ Enhanced error messages with stack traces
- ✅ Request/response logging for troubleshooting
- ✅ Comprehensive test functions

### Step 1: Deploy Your Google Apps Script

**Important**: You must deploy your script as a **Web App** with the correct settings.

1. Open your Google Apps Script project: https://script.google.com/
2. Click **Deploy** > **New deployment**
3. Click the **gear icon** next to "Select type" and choose **Web app**
4. Configure the deployment:
   - **Description**: "PO Tracker API v1" (or any description)
   - **Execute as**: **Me** (your-email@gmail.com)
   - **Who has access**: **Anyone** ⚠️ **CRITICAL - Must be "Anyone"**
5. Click **Deploy**
6. Copy the **Web app URL** (it will end in `/exec`)
7. Click **Done**

### Step 2: Update Your BACKEND_URL

Update the `BACKEND_URL` environment variable in Vercel with the new deployment URL:

```
BACKEND_URL=https://script.google.com/macros/s/AKfycby.../exec
```

### Step 3: Test the Backend

**First, test that the backend is accessible:**

Visit this URL in your browser (replace YOUR_SCRIPT_ID with your actual script ID):

```
https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?action=test
```

**Expected result:**
```json
{
  "success": true,
  "message": "Backend is working!",
  "timestamp": "2026-01-20T...",
  "spreadsheetId": "1P5HhtUKhfEdHxEr2QyshVEXKYzWrbedkeFKkiY-xVS4"
}
```

If you see this response, **CORS is working!** Your backend is accessible.

**Next, test your PO data:**

```
https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?action=getPOs
```

You should see a JSON response with your PO data.

**If you see an error:**
- Check the Apps Script execution logs: **Extensions** > **Apps Script** > **Executions** tab
- Verify your spreadsheet ID is correct
- Make sure the sheet names match ("POs List", "ApprovalHistoryList")

## Why "Who has access: Anyone" is Safe

Even though the script is set to "Anyone", it's still secure because:

1. ✅ Your frontend has Google OAuth authentication
2. ✅ Only users from authorized domains can access the frontend
3. ✅ The backend URL is not easily discoverable (obfuscated in environment variables)
4. ✅ You can add additional validation in the Apps Script if needed

### Optional: Add Backend Authentication

If you want extra security, you can add authentication to your Apps Script:

```javascript
function doGet(e) {
  // Optional: Validate an API key
  const apiKey = e.parameter.apiKey;
  const validKey = PropertiesService.getScriptProperties().getProperty('API_KEY');

  if (apiKey !== validKey) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: 'Unauthorized' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Rest of your code...
}
```

Then pass the API key from your frontend:
```javascript
const response = await fetch(`${BACKEND_URL}?action=getPOs&apiKey=${API_KEY}`);
```

## Common Issues

### Issue: "Script function not found: doGet"
**Solution**: Make sure your Apps Script has a `doGet` function defined.

### Issue: "Authorization required"
**Solution**:
1. Redeploy the script
2. Ensure "Execute as: Me" is selected
3. Ensure "Who has access: Anyone" is selected

### Issue: "You do not have permission to call this service"
**Solution**:
1. Click **Deploy** > **Manage deployments**
2. Click the **edit icon** (pencil)
3. Change "Who has access" to **Anyone**
4. Click **Deploy**

### Issue: Still getting CORS errors
**Solution**:
1. Verify the BACKEND_URL is exactly the Web app URL ending in `/exec`
2. Clear your browser cache
3. Check browser console for the exact error
4. Verify the Apps Script deployment is active

## Apps Script Code Template

Use the code in `backend-apps-script.gs` as a template. Update it to connect to your actual data source (NetSuite API, Google Sheets, database, etc.).

### Current Data Source

The current implementation expects data from Google Sheets. Update these variables:

```javascript
const spreadsheetId = 'YOUR_SPREADSHEET_ID'; // Your Google Sheet ID
const sheetName = 'PO_DATA'; // Sheet containing PO data
```

### Connecting to NetSuite API

If you want to connect directly to NetSuite instead of using Google Sheets:

```javascript
function getPOsData() {
  try {
    const options = {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer YOUR_NETSUITE_TOKEN',
        'Content-Type': 'application/json'
      },
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch('https://YOUR_NETSUITE_ACCOUNT.suitetalk.api.netsuite.com/services/rest/record/v1/purchaseOrder', options);
    const data = JSON.parse(response.getContentText());

    return { pos: data.items };
  } catch (error) {
    return { error: error.toString() };
  }
}
```

## Testing Your Deployment

### Test in Apps Script Editor (Before Deploying)

1. In the Apps Script editor, click the function dropdown (next to "Debug")
2. Select `testBackend`
3. Click **Run**
4. Click **View** > **Logs** to see the results
5. You should see successful test results with data counts

**This tests:**
- ✅ Your spreadsheet connection is working
- ✅ Your sheet names are correct
- ✅ Data is being read properly

### Test the Deployed Web App

1. **Test in browser**: Visit `https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?action=test`
2. **Expected result**: `{"success": true, "message": "Backend is working!", ...}`
3. **If you see "Authorization required"**: You didn't set "Who has access" to "Anyone"
4. **If you see HTML login page**: Your deployment settings are incorrect
5. **If successful**, test the actual data: `?action=getPOs`

## Deployment Checklist

- [ ] Apps Script has `doGet` function
- [ ] Deployed as **Web app**
- [ ] "Execute as" is set to **Me**
- [ ] "Who has access" is set to **Anyone** ⚠️
- [ ] Copied the Web app URL (ends in `/exec`)
- [ ] Updated `BACKEND_URL` in Vercel environment variables
- [ ] Tested the URL in browser and got JSON response
- [ ] Redeployed Vercel site with new environment variable

## Next Steps

After fixing the Google Apps Script deployment:

1. Update the `BACKEND_URL` environment variable in Vercel
2. Redeploy your Vercel app: `vercel --prod`
3. Test the login and data fetching
4. The "Failed to fetch" error should be resolved

## Support

If you're still experiencing issues:
1. Check the Apps Script execution logs: **Executions** tab in Apps Script editor
2. Check browser console for detailed error messages
3. Verify the deployment URL is correct and accessible
4. Try deploying a new version of the Apps Script
