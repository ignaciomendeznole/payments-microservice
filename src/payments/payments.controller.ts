import { Controller } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreatePaymentSessionDto } from './dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @MessagePattern('create_payment_session')
  createPaymentSession(
    @Payload() createPaymentSessionDto: CreatePaymentSessionDto,
  ) {
    return this.paymentsService.createPaymentSession(createPaymentSessionDto);
  }
}
