# 📊 Google Sheets Integration Setup Guide

This guide will help you set up Google Sheets integration for your WhatsApp Lead Assistant Bot to ensure data persistence.

## 🎯 **Benefits of Google Sheets Integration**

- ✅ **Data Persistence** - No more data loss on server restarts
- ✅ **Easy Viewing** - View all leads in Google Sheets
- ✅ **Built-in Reporting** - Create charts and summaries
- ✅ **Collaboration** - Share with team members
- ✅ **Mobile Access** - View data on any device
- ✅ **Automatic Backups** - Google handles data safety

## 📋 **Prerequisites**

1. **Google Account** - You need a Google account
2. **Google Cloud Project** - For API access
3. **Google Sheets API** - Enable the API

## 🚀 **Step 1: Create Google Cloud Project**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name your project (e.g., "WhatsApp Lead Assistant")
4. Click "Create"

## 🚀 **Step 2: Enable Google Sheets API**

1. In your Google Cloud project, go to "APIs & Services" → "Library"
2. Search for "Google Sheets API"
3. Click on it and click "Enable"

## 🚀 **Step 3: Create Service Account**

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "Service Account"
3. Fill in the details:
   - **Name**: `whatsapp-lead-assistant`
   - **Description**: `Service account for WhatsApp Lead Assistant Bot`
4. Click "Create and Continue"
5. Skip the optional steps and click "Done"

## 🚀 **Step 4: Generate Service Account Key**

1. Click on your service account name
2. Go to "Keys" tab
3. Click "Add Key" → "Create new key"
4. Choose "JSON" format
5. Click "Create"
6. Download the JSON file and save it as `google-credentials.json` in your project root

## 🚀 **Step 5: Create Google Sheet**

1. Go to [Google Sheets](https://sheets.google.com/)
2. Create a new spreadsheet
3. Name it "WhatsApp Lead Assistant - Leads"
4. Copy the spreadsheet ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
   ```

## 🚀 **Step 6: Share Sheet with Service Account**

1. In your Google Sheet, click "Share"
2. Add your service account email (found in the JSON file)
3. Give it "Editor" permissions
4. Click "Send"

## 🚀 **Step 7: Update Environment Variables**

Add these to your `.env` file:

```env
# Google Sheets Configuration
GOOGLE_SHEET_ID=your_spreadsheet_id_here
GOOGLE_SERVICE_ACCOUNT_KEY_FILE=./google-credentials.json
```

## 🚀 **Step 8: Test the Integration**

Run the test script to verify everything works:

```bash
node scripts/test-google-sheets.js
```

## 📊 **Sheet Structure**

The bot will automatically create a sheet with these columns:

| Column | Description |
|--------|-------------|
| Lead ID | Unique identifier for each lead |
| Phone Number | WhatsApp phone number |
| Name | Lead's name |
| Email | Lead's email |
| Country | Lead's country |
| Service Type | Type of service requested |
| Preferred Time | Preferred meeting time |
| Notes | Additional notes |
| Status | Lead status (active, scheduled, etc.) |
| Stage | Lead stage (initial, collecting_info, etc.) |
| Created At | When lead was created |
| Updated At | When lead was last updated |
| Last Message At | When last message was received |
| Meeting Scheduled | Whether meeting is scheduled |
| Meeting Time | Scheduled meeting time |
| Meeting Date | Scheduled meeting date |
| Calendly Link | Calendly booking link |

## 🔧 **Troubleshooting**

### **Error: "Google Sheets service not initialized"**
- Check if `GOOGLE_SHEET_ID` is set in `.env`
- Verify `google-credentials.json` exists in project root
- Ensure service account has access to the sheet

### **Error: "Permission denied"**
- Make sure service account email has "Editor" access to the sheet
- Check if the sheet ID is correct

### **Error: "API not enabled"**
- Enable Google Sheets API in Google Cloud Console
- Wait a few minutes for changes to propagate

### **Fallback to In-Memory Storage**
- If Google Sheets fails, the bot automatically falls back to in-memory storage
- Check logs for fallback messages

## 📈 **Advanced Features**

### **Custom Sheet Names**
You can change the sheet name by modifying the `sheetName` property in `googleSheetsService.js`.

### **Multiple Sheets**
You can create multiple sheets for different purposes (e.g., leads, conversations, reports).

### **Data Export**
Use Google Sheets' built-in export features to download data as CSV, Excel, or PDF.

## 🔒 **Security Notes**

- Keep your `google-credentials.json` file secure
- Don't commit it to version control
- Add it to `.gitignore`
- Use environment variables for sensitive data

## 📞 **Support**

If you encounter issues:

1. Check the logs for error messages
2. Verify all environment variables are set
3. Test the Google Sheets API manually
4. Ensure service account has proper permissions

## 🎉 **Success Indicators**

When everything is working correctly, you should see:

```
info: Google Sheets service initialized successfully
info: Using Google Sheets for lead storage
```

And your leads will appear in the Google Sheet automatically! 