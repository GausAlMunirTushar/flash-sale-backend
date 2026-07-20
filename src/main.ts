import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { toNodeHandler } from 'better-auth/node';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { createAuth } from './auth/better-auth';
import configuration from './config/configuration';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { connectMongo } from './database/mongo-connection';

async function bootstrap() {
  const config = configuration();
  const { client, db } = await connectMongo(config.mongodbUri);
  const auth = createAuth(db, client, config);

  const server = express();
  server.use('/api/auth', toNodeHandler(auth));

  const app = await NestFactory.create(
    AppModule.forRoot(auth),
    new ExpressAdapter(server),
  );

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  (app as any).use(helmet());
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  (app as any).use(compression());
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  (app as any).use(cookieParser());
  app.enableCors({ origin: config.frontendUrl, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Flash Sale Reservation Engine')
    .setDescription(
      'Reserve a seat, hold it for 5 minutes, complete a mock payment.',
    )
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const { Logger } = await import('@nestjs/common');
  const logger = new Logger('Bootstrap');
  await app.listen(config.port);
  logger.log(`Server running on http://localhost:${config.port}`);
  logger.log(`Swagger docs at http://localhost:${config.port}/docs`);
}

void bootstrap();
