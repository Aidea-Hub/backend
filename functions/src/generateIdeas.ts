import * as functions from "firebase-functions";
import admin from "firebase-admin";
import { cors } from "./config";
import axios from "axios";

// API definition
// POST /generateIdeas
// Request body:
// {
//   "userId": "string",
//   "problem": "string",
//   "chosenSolution": "string",
//   "algo": "string"
// }
// Response body:
// {
//   "response": {
//     "ideas": []
//  }
// }

const COST_TO_GENERATE_IDEAS = -5;

const algoUrlMap: { [key: string]: string } = {
  "algo1": process.env.ALGO_1_URL || "",
  "algo2": process.env.ALGO_2_URL || "",
  "algo3": process.env.ALGO_3_URL || "",
  "algo4": process.env.ALGO_4_URL || "",
}

export const generateIdeas = functions.runWith({ timeoutSeconds: 300 }).https.onRequest(
  async (req: any, res: any) => {
    cors(req, res, async () => {
      try {
        const data = req.body;
        const { userId, problem, numIdeas } = data;
  
        // validate request body
        if (!userId || !problem) {
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
  
        // Get the current number of credits the user has
        const currentCredits = userSnapshot.data()!.credits;
  
        // Check if the user has enough credits
        if (currentCredits < COST_TO_GENERATE_IDEAS) {
          res.status(400).send("Insufficient credits");
          return;
        }
  
        // Decrement user credits by 5
        await userRef.update({
          credits: admin.firestore.FieldValue.increment(COST_TO_GENERATE_IDEAS),
        });
        if (!numIdeas) {
          // generate 4 new ideas based on problem
          const ideas = await generateNewIdeas(problem);
          res.status(200).json({ data: { ideas } });
        } else {
          // generate numIdeas more ideas
          const ideas = await generateMoreIdeas(problem, numIdeas)
          res.status(200).json({ data: { ideas } });
        }
        
      } catch (e) {
        console.error("Error generating ideas:", e);
        res.status(500).send("Error generating ideas");
      }
    });
  }
);

const generateMoreIdeas = async (problem: string, numIdeas: number) => {
  // Generate numIdeas random numbers between 0 and 3
  const randomAlgoIndices = [];
  for (let i = 0; i < numIdeas; i++) {
    randomAlgoIndices.push(getRndInteger(0, 4));
  }
  // Generate ideas from the random algo indices
  const results = await Promise.all(randomAlgoIndices.map(index => generateIdeaFromProblem(problem, Object.values(algoUrlMap)[index])));
  return results;
}

// Used to generate initial set of ideas given user's problem
const generateNewIdeas = async (problem: string) => {
  const results = await Promise.all(Object.values(algoUrlMap).map(url => generateIdeaFromProblem(problem, url)));
  return results;
}

const generateIdeaFromProblem = async (problem: string, url: string) => {
  try {
    const response = await axios.post(url, {
      problem,
    });
    return response.data.response;
  } catch (error) {
    console.error("Error making API call:", error);
    return "Failed to generate response, please contact us on Discord for assistance.";
  }
}

// Returns a random number between min (included) and max (excluded)
const getRndInteger = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min)) + min;
}