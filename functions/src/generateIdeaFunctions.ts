import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { cors } from "./config";

const COST_TO_GENERATE_IDEA = 10;

// To be called once the idea's title and description is decided
export const generateIdeaContent = functions.https.onRequest(
  async (req, res) => {
    cors(req, res, async () => {
      const data = req.body;
      const userId = data.userId;
      const title = data.title;
      const description = data.description;

      if (!userId || !title || !description) {
        res.status(400).send("Missing required data");
        return;
      }

      // Check if a user document already exists in Firestore
      const userRef = admin.firestore().collection("users").doc(userId);
      const userSnapshot = await userRef.get();

      if (!userSnapshot.exists) {
        res.status(400).send("User does not exist");
        return;
      }

      // Decrement user credits by 10
      await userRef.update({
        userCredits: admin.firestore.FieldValue.increment(
          COST_TO_GENERATE_IDEA
        ),
      });

      // Create a new idea document in the "ideas" collection
      const ideaRef = admin.firestore().collection("ideas").doc();
      await ideaRef.set({
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        description: description,
        keywords: getSearchKeyWords(title),
        title: title,
        url: generateImageUrl(title),
        user_id: userId,
        votes: 0,
      });

      const ideaId = ideaRef.id;

      const productCapabilities = "";
      const competitiveLandscapeAndMoat = "";
      const productLifecycle = "";
      const businessModel = "";
      const branding = "";
      const uiux = "";

      // Create a new content document in the "idea_contents" collection
      const ideaContentRef = admin
        .firestore()
        .collection("idea_contents")
        .doc();
      await ideaContentRef.set({
        idea_id: ideaId,
        productCapabilities: productCapabilities,
        competitiveLandscapeAndMoat: competitiveLandscapeAndMoat,
        productLifecycle: productLifecycle,
        businessModel: businessModel,
        branding: branding,
        uiux: uiux,
      });

      res.status(200).send({
        message: `Idea ${ideaId} and its content were successfully created`,
      });
    });
  }
);

const generateImageUrl = (title: string) => {
  return "https://source.unsplash.com/1600x900/?nature,water";
};

const getSearchKeyWords = (title: string) => {
  return [title];
};
