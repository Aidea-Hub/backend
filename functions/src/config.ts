import corsLib from "cors";
import admin from "firebase-admin";

admin.initializeApp();
const allowedOrigins = [
  "http://localhost:3000",
  "https://aidea-hub.netlify.app",
  "https://checkout.stripe.com"
];

export const cors = corsLib({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
});

// export const cors = corsLib({ origin: true });
