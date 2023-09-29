import * as functions from "firebase-functions";
import admin from "firebase-admin";
import { cors } from "./config";

const CREDITS_TOP_UP = 100

export const topupCredits = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    const data = req.body;
    const userId = data.userId;
    
    if (!userId) {
      res.status(400).send("Missing required data");
      return;
    }

    // Check if a user document already exists in Firestore
    const userRef = admin.firestore().collection("users").doc(userId);

    const userSnapshot = await userRef.get();

    if (userSnapshot.exists) {
      const user = userSnapshot.data()!;
      const credits = user.credits;

      userRef.update({
        credits: credits + CREDITS_TOP_UP,
      });
    }

    res.status(200).send({
      message: `success`,
    });
  });
});
