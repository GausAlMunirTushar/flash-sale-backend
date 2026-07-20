export interface AppConfig {
  port: number;
  mongodbUri: string;
  frontendUrl: string;
  betterAuthSecret: string;
  betterAuthUrl: string;
  reservationHoldSeconds: number;
}

export default (): AppConfig => ({
  port: parseInt(process.env.PORT ?? '4000', 10),
  mongodbUri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/flash-sale',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  betterAuthSecret: process.env.BETTER_AUTH_SECRET ?? '',
  betterAuthUrl: process.env.BETTER_AUTH_URL ?? 'http://localhost:4000',
  reservationHoldSeconds: parseInt(
    process.env.RESERVATION_HOLD_SECONDS ?? '300',
    10,
  ),
});
