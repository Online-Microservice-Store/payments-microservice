import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { envs } from './config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const logger = new Logger("Payment microservice");
  const app = await NestFactory.create(AppModule, {
    rawBody: true
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true
    })
  );
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.NATS,
    options:{
      servers: envs.nats_servers,
    }
  },
  { inheritAppConfig: true}
)

  console.log("Health check configured");
  await app.startAllMicroservices();
  await app.listen(envs.port);
  logger.log("Payments microservice started " + envs.port);
}
bootstrap();
