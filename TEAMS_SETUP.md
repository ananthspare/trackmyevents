# Teams Integration Setup

## 1. Azure AD App Registration
1. Go to https://portal.azure.com
2. Azure Active Directory → App registrations → New registration
3. Name: "Day Planner Teams Integration"
4. Account types: "Accounts in any organizational directory and personal Microsoft accounts"
5. Redirect URI: http://localhost:4200
6. Copy the Client ID

## 2. API Permissions
1. API permissions → Add permission → Microsoft Graph → Delegated
2. Add: Calendars.Read, OnlineMeetings.Read
3. Grant admin consent (if admin)

## 3. Update Client ID
Replace 'YOUR_CLIENT_ID_HERE' in teams-integration.service.ts with your actual Client ID

## 4. Install Packages
Run: npm install @azure/msal-browser @microsoft/microsoft-graph-client

## 5. Test
1. Start app: npm start
2. Click "Connect to Teams" 
3. Sign in with Microsoft account
4. Click "Sync Meetings"
5. Meetings appear in day planner tasks