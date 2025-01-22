import { Inject, Injectable, Logger } from '@nestjs/common';
import { envs, NATS_SERVICE } from 'src/config';
import Stripe from 'stripe';
import { PaymentSessionDto } from './dto/payment-session.to';
import { Request, Response } from 'express';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class PaymentsService {
    private readonly stripe = new Stripe(envs.stripe_secret);
    private readonly logger = new Logger("Payment-service");
    constructor(
        @Inject(NATS_SERVICE) private readonly client:ClientProxy
    ){}
    async createPaymentSession(paymentSessionDto:PaymentSessionDto ){
        const {currency, items, orderId, clientId} = paymentSessionDto;
        const lineItems = items.map( (item) => {
            return {
                price_data: {
                    currency: currency,
                    product_data: {
                        name: item.productId
                    },
                    unit_amount: Math.round( item.price * 100), // $20
                },
                quantity: item.quantity
            }
        });
        
        const session = await this.stripe.checkout.sessions.create({
            //Put the order´s id
            payment_intent_data: {
                metadata: {
                    orderId: orderId,
                    clientId: clientId,
                }
            },

            line_items: lineItems,
            mode: 'payment',
            success_url: envs.stripe_success_url,
            cancel_url: envs.stripe_cancel_url
        });

        return {
            cancelUrl: session.cancel_url,
            successUrl: session.success_url,
            url: session.url
        };
    }   

    async stripeWebHook(req:Request, res: Response){
        const sig = req.headers['stripe-signature'];
        let event : Stripe.Event;
        // const endpointSecret = "whsec_57602a1dfb1dfac30541fdc7dbd9b00d308b3a418bb5e3b15e1be35a64ce31d3";
        const endpointSecret = envs.stripe_endpoint_secret;
        try {
            event = this.stripe.webhooks.constructEvent(
                req['rawBody'],
                sig, 
                endpointSecret,
            );
        } catch (err) {
            res.status(400).send(`Webhook Error: ${err.message}`);
            return;
        }

        console.log({event});
        switch(event.type){
            case 'charge.succeeded':
                const chargeSucceded = event.data.object;
                const payload = {
                    stripePaymentId: chargeSucceded.id,
                    orderId: chargeSucceded.metadata.orderId,
                    receipUrl: chargeSucceded.receipt_url
                }

                this.logger.log({payload});
                this.client.emit('payment.succeeded', payload);
                // TODO: Llamar nuestro microservicio
                console.log({
                    metadata: chargeSucceded.metadata,
                    orderId: chargeSucceded.metadata.orderId
                });
            break;
            default:
                console.log("Event " + event.type + " not handled");
        }
        return res.status(200).json( {sig} );
    }

}
