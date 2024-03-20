import { Inject, Injectable, Logger } from '@nestjs/common';
import { CreatePaymentSessionDto } from './dto';
import { NATS_SERVICE, envs } from 'src/config';
import { ClientProxy } from '@nestjs/microservices';
import Stripe from 'stripe';
import { Request, Response } from 'express';

@Injectable()
export class PaymentsService {
  private readonly stripe = new Stripe(envs.stripeSecretKey);
  private readonly logger = new Logger('PaymentsService');

  constructor(@Inject(NATS_SERVICE) private readonly natsClient: ClientProxy) {}

  async createPaymentSession(createPaymentSessionDto: CreatePaymentSessionDto) {
    const { currency, items, orderId } = createPaymentSessionDto;

    const lineItems = items.map((item) => ({
      price_data: {
        currency,
        product_data: {
          name: item.name,
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));

    const session = await this.stripe.checkout.sessions.create({
      payment_intent_data: {
        metadata: {
          orderId,
        },
      },
      line_items: lineItems,
      mode: 'payment',
      success_url: envs.stripeSuccessUrl,
      cancel_url: envs.stripeCancelUrl,
    });

    // Return the session
    return {
      cancelUrl: session.cancel_url,
      successUrl: session.success_url,
      url: session.url,
    };
  }

  success() {
    return {
      ok: true,
      message: 'Payment successful',
    };
  }

  cancel() {
    return {
      ok: true,
      message: 'Payment cancelled',
    };
  }

  async webhook(req: Request, res: Response) {
    const sig = req.headers['stripe-signature'];

    let event: Stripe.Event;

    const endpointSecret = envs.stripeEndpointSecret;

    try {
      event = this.stripe.webhooks.constructEvent(
        req['rawBody'],
        sig,
        endpointSecret,
      );

      switch (event.type) {
        case 'charge.succeeded':
          const paymentIntent = event.data.object as Stripe.Charge;
          this.logger.log(`PaymentIntent was successful: ${paymentIntent.id}`);

          this.natsClient.emit('order.payment.succeeded', {
            orderId: paymentIntent.metadata.orderId,
          });

          return res.status(200).json(event);

          // TODO: Notify the order service that the payment was successful
          break;

        default:
          this.logger.warn(`Unhandled event type: ${event.type}`);
      }
    } catch (err) {
      this.logger.error(err);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }
}
