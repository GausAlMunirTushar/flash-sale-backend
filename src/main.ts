import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { toNodeHandler } from 'better-auth/node';
import express from 'express';
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
  // Better Auth must consume the raw request before Nest's body-parser does,
  // so it is mounted on the underlying Express instance before NestFactory.create.
  server.use('/api/auth', toNodeHandler(auth));

  const app = await NestFactory.create(
    AppModule.forRoot(db, auth),
    new ExpressAdapter(server),
  );

  app.enableCors({ origin: config.frontendUrl, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Flash Sale Reservation Engine')
    .setDescription(
      'Reserve a seat, hold it for 5 minutes, complete a mock payment.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.listen(config.port);
}

void bootstrap();
