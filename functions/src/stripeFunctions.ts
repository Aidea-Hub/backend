import * as functions from "firebase-functions";
import Stripe from "stripe";
import { cors } from "./config";

const YOUR_DOMAIN = "https://aidea-hub.netlify.app/";
// const YOUR_DOMAIN = "http://localhost:3000/";
const STRIPE_KEY = process.env.STRIPE_KEY || "";
const stripe = new Stripe(STRIPE_KEY, {
  apiVersion: "2023-08-16",
  typescript: true,
});

export const createCheckoutSession = functions.https.onRequest(
  async (req, res) => {
    cors(req, res, async () => {
      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            // Provide the exact Price ID (for example, pr_1234) of the product you want to sell
            price: "price_1NvNLBFMQoAOlyFrTKBp5ES5",
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${YOUR_DOMAIN}` + "success",
        cancel_url: `${YOUR_DOMAIN}` + "fail",
        automatic_tax: { enabled: true },
      });

      res.redirect(303, session.url!);
      // res.status(200)
    });
  }
);

// export const webhook = functions.https.onRequest(async (req, res) => {
//   cors(req, res, async () => {
//     console.log("ASDASDASD")
//     const sig = req.headers['stripe-signature'];

//     let event;

//     try {
//       event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
//     } catch (err) {
//       console.log(err)
//       res.status(400).send(`Webhook Error: ${err}`);
//       return;
//     }
//     console.log(event)
//     // Handle the event
//     switch (event.type) {
//       case 'checkout.session.completed':
//         const checkoutSessionCompleted = event.data.object;
//         console.log("CHECKOUT:", checkoutSessionCompleted)
//         // Then define and call a function to handle the event payment_intent.succeeded
//         break;
//         // ... handle other event types
//       default:
//         console.log(`Unhandled event type ${event.type}`);
//     }

//     // Return a 200 response to acknowledge receipt of the event
//     res.send();
//   });
// });
