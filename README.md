# Event Countdown App

An Angular application with AWS Amplify backend that allows users to:
- Create, edit, and delete categories
- Add events with countdowns to categories
- Add todo items to events

## Features

- **User Authentication**: Secure login and registration using AWS Cognito
- **Categories Management**: Create, edit, and delete categories
- **Event Countdowns**: Add events with target dates and see real-time countdowns
- **Todo Management**: Add, edit, and mark todo items as complete within events
- **Real-time Updates**: Changes sync across devices in real-time

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- AWS Account

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Deploy the Amplify backend:
   ```
   npx amplify sandbox
   ```
4. Start the development server:
   ```
   npm start
   ```

## Project Structure

- `src/app/categories`: Components for managing categories
- `src/app/events`: Components for managing events with countdowns
- `src/app/todo-list`: Components for managing todo items within events
- `amplify/`: AWS Amplify backend configuration

## Data Model

- **Category**: Contains name and description
- **Event**: Contains title, description, target date, and belongs to a category
- **Todo**: Contains content, completion status, and belongs to an event

## Usage

1. Sign in or create an account
2. Create categories to organize your events
3. Add events with target dates to categories
4. Add todo items to events to track tasks
5. Mark todo items as complete as you finish them

## License

This project is licensed under the MIT License - see the LICENSE file for details.