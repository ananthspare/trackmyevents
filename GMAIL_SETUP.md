# Gmail Calendar Integration Setup

## Prerequisites

1. Google Cloud Console account
2. Gmail account with calendar access

## Setup Steps

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google Calendar API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

### 2. Create Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API Key"
3. Copy the API key
4. Click "Create Credentials" > "OAuth 2.0 Client IDs"
5. Configure OAuth consent screen if prompted
6. Select "Web application"
7. Add your domain to "Authorized JavaScript origins":
   - For development: `http://localhost:4200`
   - For production: `https://yourdomain.com`
8. Copy the Client ID

### 3. Update Application

1. Open `src/app/services/gmail-calendar.service.ts`
2. Replace the placeholder values:
   ```typescript
   private readonly CLIENT_ID = 'your-actual-client-id.apps.googleusercontent.com';
   private readonly API_KEY = 'your-actual-api-key';
   ```

**Important**: The current credentials in the code are placeholders and will not work. You must replace them with your actual Google Cloud Console credentials.

### 4. Test Integration

1. Run your application: `npm start`
2. Go to Categories tab
3. Click "Connect Gmail Calendar"
4. Grant permissions when prompted
5. Select a calendar and import events

## Features

- **Import Events**: Sync events from Gmail Calendar to your app
- **Multiple Calendars**: Choose which calendar to sync from
- **Date Range**: Import past events (optional)
- **Auto-sync**: Automatically sync new events (future feature)

## Troubleshooting

### Common Issues

1. **"Access blocked" error**:
   - Ensure OAuth consent screen is configured
   - Add test users if app is in testing mode

2. **"Invalid origin" error**:
   - Check authorized JavaScript origins in Google Cloud Console
   - Ensure URL matches exactly (including port for localhost)

3. **API quota exceeded**:
   - Check API usage in Google Cloud Console
   - Request quota increase if needed

### Security Notes

- Never commit API keys to version control
- Use environment variables for production
- Regularly rotate API keys
- Monitor API usage

## Environment Variables (Production)

For production deployment, use environment variables:

```typescript
private readonly CLIENT_ID = environment.googleClientId;
private readonly API_KEY = environment.googleApiKey;
```

Add to `src/environments/environment.prod.ts`:
```typescript
export const environment = {
  production: true,
  googleClientId: 'your-client-id',
  googleApiKey: 'your-api-key'
};
```