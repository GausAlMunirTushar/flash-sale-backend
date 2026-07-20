import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { anonymous, bearer, jwt } from 'better-auth/plugins';
import { Db, MongoClient } from 'mongodb';
import type { AppConfig } from '../config/configuration';

export type Auth = ReturnType<typeof createAuth>;

export function createAuth(db: Db, client: MongoClient, config: AppConfig) {
  return betterAuth({
    database: mongodbAdapter(db, { client, transaction: false }),
    secret: config.betterAuthSecret,
    baseURL: config.betterAuthUrl,
    trustedOrigins: [config.frontendUrl],
    emailAndPassword: {
      enabled: true,
    },
    plugins: [anonymous(), bearer(), jwt()],
  });
}
