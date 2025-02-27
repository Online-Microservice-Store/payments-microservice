import { Controller, Get } from '@nestjs/common';

@Controller('/')
export class HealthCheckController {
    @Get()
    healthCheck(){
        return 'Payment webhook is running and up!!';
    }
}
