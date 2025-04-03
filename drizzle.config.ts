import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({
  path: '.env',
});

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dialect: 'mysql',
  dbCredentials: {
    // biome-ignore lint: Forbidden non-null assertion.
    host: process.env.DB_HOST!,
    // biome-ignore lint: Forbidden non-null assertion.
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 4000,
    // biome-ignore lint: Forbidden non-null assertion.
    user: process.env.DB_USER!,
    // biome-ignore lint: Forbidden non-null assertion.
    password: process.env.DB_PASSWORD!,
    // biome-ignore lint: Forbidden non-null assertion.
    database: process.env.DB_NAME!,
  },
});
