import * as functions from "firebase-functions";
import admin from "firebase-admin";
import { cors } from "./config";

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
//   "data": {
//     "ideas": [
//       {
//         "title": "string",
//         "description": "string",
//         "algo": "string"
//       }
//  }
// }

interface IdeaResp {
    title: string,
    description: string,
    algo: string
}

const COST_TO_GENERATE_IDEAS = -5;

const algoUrlMap: { [key: string]: string } = {
  "algo1": "https://www.google.com",
  "algo2": "https://www.google.com",
  "algo3": "https://www.google.com",
  "algo4": "https://www.google.com",
}

export const generateIdeas = functions.https.onRequest(
  async (req: any, res: any) => {
    cors(req, res, async () => {
      const data = req.body;
      const { userId, problem, chosenSolution, algo } = data;

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

      if (chosenSolution && algo) {
        // generate 2 more ideas based on chosen solution and algo
        const sameAlgoIdeas = await generateMoreIdeas(chosenSolution, algo, 2);

        // generate 1 idea from another algo
        const rndIdx = getRndInteger(0, algoUrlMap.keys.length)
        const otherAlgo = algoUrlMap.keys[rndIdx];
        const otherAlgoIdeas = await generateMoreIdeas(chosenSolution, otherAlgo, 1);

        // combine all ideas
        const ideas = [...sameAlgoIdeas, ...otherAlgoIdeas];
        res.status(200).json({ data: { ideas } });
      } else {
        // generate 3 ideas based on problem
        const ideas = await generateNewIdeas(problem);
        res.status(200).json({ data: { ideas } });
      }
    });
  }
);

const DUMMY_IDEAS = [
  {
    title: "Idea 1",
    description: "This is idea 1",
    algo: "algo1"
  },
  {
    title: "Idea 2",
    description: "This is idea 2",
    algo: "algo2"
  },
  {
    title: "Idea 3",
    description: "This is idea 3",
    algo: "algo3"
  },
]

// Used to generate more ideas if user chose a solution and algo
const generateMoreIdeas = async (solution: string, algo: string, numIdeas: number): Promise<IdeaResp[]> => {
  // TODO
  return DUMMY_IDEAS;
}

// Used to generate initial set of ideas given user's problem
const generateNewIdeas = async (problem: string): Promise<IdeaResp[]> => {
  return DUMMY_IDEAS;
}

// Get url from algo
// const getUrlFromAlgo = async (algo: string) => {
//   return algoUrlMap[algo];
// }

// Returns a random number between min (included) and max (excluded)
const getRndInteger = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min)) + min;
}