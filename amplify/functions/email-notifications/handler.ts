import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const ses = new SESClient({ region: process.env.SES_REGION });
const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async (event: any) => {
  try {
    const { type } = event; // 'daily' or 'weekly'
    
    // Get all events
    const eventsResult = await dynamodb.send(new ScanCommand({
      TableName: process.env.EVENT_TABLE_NAME
    }));

    const events = eventsResult.Items || [];
    const now = new Date();
    
    // Filter events based on reminder type
    const relevantEvents = events.filter(event => {
      const eventDate = new Date(event.targetDate);
      
      if (type === 'daily') {
        // Events happening today
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
        return eventDate >= today && eventDate < tomorrow;
      } else {
        // Events happening this week
        const weekStart = getWeekStart(now);
        const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
        return eventDate >= weekStart && eventDate < weekEnd;
      }
    });

    // Group events by owner
    const eventsByOwner = relevantEvents.reduce((acc, event) => {
      const owner = event.owner;
      if (!acc[owner]) acc[owner] = [];
      acc[owner].push(event);
      return acc;
    }, {} as Record<string, any[]>);

    // Send emails to each user
    for (const [owner, userEvents] of Object.entries(eventsByOwner)) {
      await sendReminderEmail(owner, userEvents, type);
    }

    return { statusCode: 200, body: 'Reminders sent successfully' };
  } catch (error) {
    console.error('Error sending reminders:', error);
    return { statusCode: 500, body: 'Error sending reminders' };
  }
};

function getWeekStart(date: Date): Date {
  const start = new Date(date);
  const day = start.getDay();
  const diff = start.getDate() - day;
  return new Date(start.setDate(diff));
}

async function sendReminderEmail(userEmail: string, events: any[], type: string) {
  const subject = type === 'daily' ? 'Daily Event Reminders' : 'Weekly Event Reminders';
  const timeframe = type === 'daily' ? 'today' : 'this week';
  
  const eventsList = events.map(event => {
    const eventDate = new Date(event.targetDate);
    const daysUntil = Math.ceil((eventDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    
    return `
      <li style="margin-bottom: 15px; padding: 10px; border-left: 3px solid #667eea;">
        <strong>${event.title}</strong><br>
        <span style="color: #666;">Date: ${eventDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}</span><br>
        <span style="color: #667eea; font-weight: bold;">
          ${daysUntil === 0 ? 'Today!' : daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`}
        </span>
        ${event.description ? `<br><span style="color: #888;">${event.description}</span>` : ''}
      </li>
    `;
  }).join('');

  const htmlBody = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 10px;">
            Event Countdown App - ${subject}
          </h2>
          
          <p>Hello! Here are your upcoming events for ${timeframe}:</p>
          
          <ul style="list-style: none; padding: 0;">
            ${eventsList}
          </ul>
          
          <div style="margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 5px;">
            <p style="margin: 0;">
              <a href="${process.env.APP_URL}" 
                 style="background-color: #667eea; color: white; padding: 10px 20px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                View All Events
              </a>
            </p>
          </div>
          
          <p style="margin-top: 20px; font-size: 12px; color: #888;">
            You're receiving this because you have event reminders enabled. 
            You can manage your notification preferences in the app.
          </p>
        </div>
      </body>
    </html>
  `;

  const params = {
    Source: 'noreply@your-domain.com',
    Destination: { ToAddresses: [userEmail] },
    Message: {
      Subject: { Data: subject },
      Body: { Html: { Data: htmlBody } }
    }
  };

  await ses.send(new SendEmailCommand(params));
}