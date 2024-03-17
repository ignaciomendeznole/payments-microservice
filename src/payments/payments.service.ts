import { Inject, Injectable } from '@nestjs/common';
import { CreatePaymentSessionDto } from './dto';
import { NATS_SERVICE } from 'src/config';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class PaymentsService {
  constructor(@Inject(NATS_SERVICE) private readonly natsClient: ClientProxy) {}

  createPaymentSession(createPaymentSessionDto: CreatePaymentSessionDto) {
    return createPaymentSessionDto;
  }
}
