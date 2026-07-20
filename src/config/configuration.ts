export interface AppConfig {
  port: number;
  mongodbUri: string;
  frontendUrl: string;
  betterAuthSecret: string;
  betterAuthUrl: string;
  reservationHoldSeconds: number;
  smsApiKey: string;
  smsSenderId: string;
}

export default (): AppConfig => {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error(
      'BETTER_AUTH_SECRET environment variable is required. Set it in .env or the environment.',
    );
  }

  return {
    port: parseInt(process.env.PORT ?? '4000', 10),
    mongodbUri:
      process.env.MONGODB_URI ?? 'mongodb://localhost:27017/flash-sale',
    frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    betterAuthSecret: secret,
    betterAuthUrl:
      process.env.BETTER_AUTH_URL ?? 'http://localhost:4000/api/auth',
    reservationHoldSeconds: parseInt(
      process.env.RESERVATION_HOLD_SECONDS ?? '300',
      10,
    ),
    smsApiKey: process.env.SMS_API_KEY ?? '',
    smsSenderId: process.env.SMS_SENDER_ID ?? '',
  };
};
