import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  Category: a
    .model({
      name: a.string(),
      description: a.string(),
      order: a.integer().default(0),
    })
    .authorization(allow => [allow.owner()]),

  Event: a
    .model({
      title: a.string(),
      description: a.string(),
      targetDate: a.string(),
      categoryID: a.string(),
    })
    .authorization(allow => [allow.owner()]),

  Todo: a
    .model({
      content: a.string(),
      isDone: a.boolean().default(false),
      eventID: a.string(),
    })
    .authorization(allow => [allow.owner()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});