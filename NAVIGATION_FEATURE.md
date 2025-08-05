# Calendar to Categories Navigation Feature

## Overview
This feature allows users to navigate from the calendar page to the categories page with a specific event selected and highlighted.

## Implementation Details

### 1. Calendar Component Changes
- Added navigation button (folder icon) to each event in the events list
- Button emits `navigateToCategories` event with `eventId` and `categoryId`
- Added CSS styling for the navigation button with hover effects

### 2. App Component Changes
- Added `@ViewChild` reference to categories component
- Added `navigateToEventInCategories` method that:
  - Switches to categories tab
  - Calls `navigateToEvent` on categories component

### 3. Categories Component Changes
- Added `navigateToEvent` method that:
  - Finds the target category
  - Expands parent category if it's a subcategory
  - Selects the category
  - Highlights the specific event for 2 seconds
- Added `highlightedEventId` property to track highlighted events
- Enhanced `highlightEvent` method with smooth scrolling to the event

### 4. Visual Enhancements
- Added highlight animation with pulsing effect and glow
- Added `data-event-id` attribute for DOM targeting
- Improved button styling and tooltips

## How It Works

1. User clicks the folder icon next to an event in the calendar
2. App switches to categories tab
3. If event is in a subcategory, the parent category is expanded
4. The target category is selected and its events are loaded
5. The specific event is highlighted with animation for 2 seconds
6. The view scrolls to center the highlighted event

## Usage
- Navigate to Calendar tab
- Find any event in the events list
- Click the folder icon next to the event
- The app will switch to Categories tab and highlight the selected event

## Files Modified
- `src/app/app.component.ts`
- `src/app/app.component.html`
- `src/app/calendar/calendar.component.ts`
- `src/app/calendar/calendar.component.html`
- `src/app/calendar/calendar.component.css`
- `src/app/categories/categories.component.ts`
- `src/app/categories/categories.component.html`
- `src/app/categories/categories.component.css`