import * as functions from "firebase-functions";
import admin from "firebase-admin";
import { FieldValue } from "@google-cloud/firestore";
import { cors } from "./config";

export const login = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    const data = req.body;
    const uid = data.uid;
    const name = data.name;
    const email = data.email;
    const authProvider = data.authProvider || "google";

    if (!uid || !name || !email) {
      res.status(400).send("Missing required data");
      return;
    }

    // Check if a user document already exists in Firestore
    const userDocRef = admin.firestore().collection("users").doc(uid);
    const userDocSnapshot = await userDocRef.get();

    let newUser;

    if (!userDocSnapshot.exists) {
      newUser = {
        uid,
        name,
        auth_provider: authProvider,
        email,
        created_at: FieldValue.serverTimestamp(),
        liked_ideas: [],
        votes: {},
        credits: 0,
        theme: "yellow",
        is_plus: false,
      };
      // Create a new user document in Firestore
      await userDocRef.set(newUser);
    }

    res.status(200).send({
      message: "User document created successfully",
      data: userDocSnapshot.exists ? userDocSnapshot.data() : newUser,
    });
  });
});

export const updateUserSettings = functions.https.onRequest(
  async (req, res) => {
    cors(req, res, async () => {
      const data = req.body;
      const userId = data.userId;
      const theme = data.theme;

      if (!userId || !theme) {
        res.status(400).send("Missing required data");
        return;
      }

      admin.firestore().collection("users").doc(userId).update({
        theme: theme,
      });

      res.status(200).send({
        message: `Updated user ${userId} settings`,
      });
    });
  }
);
