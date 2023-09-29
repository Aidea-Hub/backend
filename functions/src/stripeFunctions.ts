import * as functions from "firebase-functions";
import { cors } from "./config";


const YOUR_DOMAIN = 'http://localhost:4242';
const stripe = require('stripe')('sk_test_51NvIRjFMQoAOlyFr1sf5sVtTPrWnsZpUGnSX12IwNnsCIPJrlCELrFYKrUjjplOVYSCCwlSMUAaMC8paJaG4CuRO00w9a8a3r2');

export const createCheckoutSession = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    // const S = new Stripe('sk_test_51NvIRjFMQoAOlyFr1sf5sVtTPrWnsZpUGnSX12IwNnsCIPJrlCELrFYKrUjjplOVYSCCwlSMUAaMC8paJaG4CuRO00w9a8a3r2');
    const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            // Provide the exact Price ID (for example, pr_1234) of the product you want to sell
            price: 'price_1NvNLBFMQoAOlyFrTKBp5ES5',
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${YOUR_DOMAIN}?success=true`,
        cancel_url: `${YOUR_DOMAIN}?canceled=true`,
        automatic_tax: {enabled: true},
      });
    
      res.redirect(303, session.url);
    // res.status(200)
  });
});
