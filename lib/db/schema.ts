import {
  mysqlTable,
  varchar,
  timestamp,
  text,
  boolean,
  char,
  mysqlEnum,
} from 'drizzle-orm/mysql-core';

export const user = mysqlTable('User', {
  id: varchar('id', { length: 36 }).notNull().primaryKey(),
  email: varchar('email', { length: 64 }).notNull(),
  password: varchar('password', { length: 64 }),
});

export type User = {
  id: string;
  email: string;
  password: string | null;
};

export const chat = mysqlTable('Chat', {
  id: varchar('id', { length: 36 }).notNull().primaryKey(),
  createdAt: timestamp('createdAt').notNull(),
  title: text('title').notNull(),
  userId: varchar('userId', { length: 36 }).notNull(),
  visibility: mysqlEnum('visibility', ['public', 'private'])
    .notNull()
    .default('private'),
});

export type Chat = {
  id: string;
  createdAt: Date;
  title: string;
  userId: string;
  visibility: 'public' | 'private';
};

interface TextContent {
  type: 'text';
  text: string;
}

interface ToolCallContent {
  type: 'tool-call';
  toolCallId: string;
  toolName: string;
  args: unknown; // or a more specific type if you know the shape
}

interface ReasoningContent {
  type: 'reasoning';
  reasoning: string;
}

// A union type of all possible content shapes
export type ContentItem = TextContent | ToolCallContent | ReasoningContent;

export const message = mysqlTable('Message', {
  id: char('id', { length: 36 }).notNull().primaryKey(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  content: text('content').notNull(),
  role: varchar('role', { length: 20 }).notNull(),
  chatId: char('chatId', { length: 36 })
    .notNull()
    .references(() => chat.id),
});

export type Message = {
  id: string;
  createdAt: Date;
  content: string | ContentItem[];
  role: string;
  chatId: string;
};

export const vote = mysqlTable('Vote', {
  chatId: char('chatId', { length: 36 })
    .notNull()
    .references(() => chat.id),
  messageId: char('messageId', { length: 36 })
    .notNull()
    .references(() => message.id),
  isUpvoted: boolean('isUpvoted').notNull(),
});

export type Vote = {
  chatId: string;
  messageId: string;
  isUpvoted: boolean;
};

export const document = mysqlTable('Document', {
  id: varchar('id', { length: 36 }).notNull().primaryKey(),
  createdAt: timestamp('createdAt').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  kind: mysqlEnum('kind', ['text', 'code', 'image', 'sheet']).notNull(),
  content: text('content').notNull(),
  userId: varchar('userId', { length: 36 }).notNull(),
});

export type Document = {
  id: string;
  createdAt: Date;
  title: string;
  kind: 'text' | 'code' | 'image' | 'sheet';
  content: string;
  userId: string;
};

export const suggestion = mysqlTable('Suggestion', {
  id: varchar('id', { length: 36 }).notNull().primaryKey(),
  documentId: varchar('documentId', { length: 36 }).notNull(),
  documentCreatedAt: timestamp('documentCreatedAt').notNull(),
  originalText: text('originalText').notNull(),
  suggestedText: text('suggestedText').notNull(),
  description: text('description'),
  isResolved: boolean('isResolved').notNull().default(false),
  userId: varchar('userId', { length: 36 }).notNull(),
  createdAt: timestamp('createdAt').notNull(),
});

export type Suggestion = {
  id: string;
  documentId: string;
  documentCreatedAt: Date;
  originalText: string;
  suggestedText: string;
  description: string | null;
  isResolved: boolean;
  userId: string;
  createdAt: Date;
};
