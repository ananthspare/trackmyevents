import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  Category: a
    .model({
      name: a.string(),
      description: a.string(),
      order: a.integer().default(0),
      parentCategoryID: a.string(),
    })
    .authorization(allow => [allow.owner()]),

  Event: a
    .model({
      title: a.string(),
      description: a.string(),
      targetDate: a.string(),
      categoryID: a.string(),
      snoozeDates: a.string(),
    })
    .authorization(allow => [allow.owner()]),

  Todo: a
    .model({
      content: a.string(),
      isDone: a.boolean().default(false),
      eventID: a.string(),
      categoryID: a.string(),
    })
    .authorization(allow => [allow.owner()]),

  UserPreferences: a
    .model({
      email: a.string(),
      enableDailyReminders: a.boolean().default(false),
      enableWeeklyReminders: a.boolean().default(false),
      timezone: a.string().default('UTC'),
    })
    .authorization(allow => [allow.owner()]),

  DayPlan: a
    .model({
      date: a.string(),
      tasks: a.string(),
    })
    .authorization(allow => [allow.owner()]),

  PinnedTask: a
    .model({
      date: a.string(),
      tasks: a.string(),
    })
    .authorization(allow => [allow.owner()]),

  MonthlyReminder: a
    .model({
      title: a.string(),
      description: a.string(),
      month: a.integer(),
      day: a.integer(),
      year: a.integer(),
      isRecurring: a.boolean().default(true),
      isCompleted: a.boolean().default(false),
      completedAt: a.string(),
    })
    .authorization(allow => [allow.owner()]),

  Goal: a
    .model({
      title: a.string(),
      description: a.string(),
      dueDate: a.string(),
      isCompleted: a.boolean().default(false),
      category: a.string().default('General'),
      priority: a.string().default('medium'), // low | medium | high
    })
    .authorization(allow => [allow.owner()]),

  SubTask: a
    .model({
      goalID: a.string(),
      content: a.string(),
      dueDate: a.string(),
      isCompleted: a.boolean().default(false),
      order: a.integer().default(0),
    })
    .authorization(allow => [allow.owner()]),

  GoalNote: a
    .model({
      goalID: a.string(),
      subTaskID: a.string(), // null = goal-level note, set = task-level note
      content: a.string(),
    })
    .authorization(allow => [allow.owner()]),

  CardBenefit: a
    .model({
      benefitName: a.string(),
      benefitDetails: a.string(),
      criteriaAction: a.string(),
      completionBy: a.string(),
      remainingBalance2026: a.string(),
      remainingBalance2027: a.string(),
      trackingPeriod: a.string(),
      completed2026: a.boolean().default(false),
      completed2027: a.boolean().default(false),
      notes: a.string(),
      order: a.integer().default(0),
      periodChecks: a.string(),
    })
    .authorization(allow => [allow.owner()]),

  CreditCard: a
    .model({
      name: a.string(),
      lastFour: a.string(),
      network: a.string(),
      color: a.string().default('#1565c0'),
    })
    .authorization(allow => [allow.owner()]),

  CardTodo: a
    .model({
      cardID: a.string(),
      content: a.string(),
      isDone: a.boolean().default(false),
    })
    .authorization(allow => [allow.owner()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
