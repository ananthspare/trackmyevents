// Extract Teams meetings from calendar view
function extractMeetings() {
  const meetings = [];
  
  // Teams calendar selectors (may need adjustment based on UI updates)
  const meetingElements = document.querySelectorAll('[data-tid="calendar-event"], .calendar-event, [role="button"][aria-label*="meeting"]');
  
  meetingElements.forEach(element => {
    const titleElement = element.querySelector('[data-tid="event-title"], .event-title, .meeting-title');
    const timeElement = element.querySelector('[data-tid="event-time"], .event-time, .meeting-time');
    
    if (titleElement && timeElement) {
      meetings.push({
        title: titleElement.textContent.trim(),
        time: timeElement.textContent.trim(),
        date: extractDateFromElement(element),
        type: 'teams-meeting'
      });
    }
  });
  
  return meetings;
}

function extractDateFromElement(element) {
  // Try to find date from parent containers or data attributes
  const dateContainer = element.closest('[data-date], [aria-label*="2024"]');
  if (dateContainer) {
    const dateAttr = dateContainer.getAttribute('data-date') || 
                    dateContainer.getAttribute('aria-label');
    if (dateAttr) {
      const dateMatch = dateAttr.match(/\d{4}-\d{2}-\d{2}|\w+ \d{1,2}, \d{4}/);
      return dateMatch ? dateMatch[0] : new Date().toISOString().split('T')[0];
    }
  }
  return new Date().toISOString().split('T')[0];
}

// Listen for extraction requests
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractMeetings') {
    const meetings = extractMeetings();
    sendResponse({ meetings });
  }
});

// Auto-extract when page loads
window.addEventListener('load', () => {
  setTimeout(() => {
    const meetings = extractMeetings();
    if (meetings.length > 0) {
      chrome.storage.local.set({ 'extracted_meetings': meetings });
    }
  }, 3000);
});