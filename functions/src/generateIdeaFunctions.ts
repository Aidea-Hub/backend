import * as functions from "firebase-functions";
import admin from "firebase-admin";
import { cors } from "./config";
import keywordExtractor from "keyword-extractor";
import natural from "natural";
import axios from "axios";

const COST_TO_GENERATE_IDEA = 10;
const MAX_RETRIES = 3;
const ERROR_MESSAGE =
  "Failed to generate response, please contact us on Discord for assistance.";
const REFUSE_TO_ANSWER = "AI language model";

const API_REFLECTION_URL = process.env.API_GENERATE_REFLECTION || "";
const API_RESEARCH_URL = process.env.API_GENERATE_RESEARCH || "";

const LOADING = "";

const STATUS = {
  GENERATING: "GENERATING",
  COMPLETED: "COMPLETED",
};

const generateReflection = async (
  title: string,
  description: string,
  prompt: string,
  format: string
) => {
  try {
    const response = await axios.post(API_REFLECTION_URL, {
      prompt,
      format,
      title,
      description,
    });
    return response.data.response;
  } catch (error: any) {
    if (error.response) {
      // The request was made and the server responded with a status code that falls out of the range of 2xx
      console.error("Response Error:", error.response.data);
      console.error("Response Status:", error.response.status);
    } else if (error.request) {
      // The request was made but no response was received
      console.error("No Response:", error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error("Request Error:", error.message);
    }
    return ERROR_MESSAGE;
  }
};

const generateResearch = async (description: string) => {
  try {
    const response = await axios.post(API_RESEARCH_URL, {
      description,
    });
    return response.data.response;
  } catch (error) {
    console.error("Error making API call:", error);
    return "Failed to generate response, please contact us on Discord for assistance.";
  }
};

const productCapabilitiesPrompt =
  "For the following idea, suggest 10 of the most useful and innovative product capabilities. Avoid the common pitfall of failing to consider how the product serves the problem in the process. Consider if the product have the capabilities to succeed in the chosen problem space.";
const productCapabilitiesFormat = `Product Capabilities: <List of product capabilities, elaborating on each product capability>
Conclusion: <Conclusion of product capabilities>
`;
const productCabpabilitiesStart = "Product Capabilities:";

const competitiveLandscapeStart = "1. Problem Space and Market Competition";

const moatPrompt =
  "For the given product idea, identify 2 to 3 potential moats or sustainable competitive advantages. These moats should protect its market position, deter new entrants, and prevent existing competitors from replicating its success. Example: One of Apple's moat is its integrated ecosystem of products. Apple's products, from iPhone, Macs, and services like iCloud, are tightly integrated into a single ecosystem, creating a seamless user experience that is difficult for competitors to match. This tight integration also makes it difficult for consumers to switch out of Apple.";
const moatFormat = `Moat: <List of moats, elaborating on each moat>
Conclusion: <Conclusion of moats>
`;
const moatStart = "Moat:";

const productLifecyclePrompt =
  "For the given product idea it is in the introduction stage. Outline its journey through the product life cycle. Highlight challenges and strategies for each stage and how to achieve product-market fit during growth. Emphasize user acquisition tactics in the introduction and their evolution in later stages.";
const productLifecycleFormat = `Introduction Stage:
- Steps: <Steps for introduction>
- Challenges: <Challenges and tactics for user acquisition>
- Strategies: <Strategies for engagement>

Growth Stage:
- Steps: <Steps for growth>
- Product-Market Fit: <Strategies for fit>
- Evolution of Tactics: <Changes in user acquisition tactics>

Maturity Stage:
- Steps: <Steps for maturity>
- Challenges: <Challenges faced>
- Strategies: <Strategies to maintain user base>

Decline Stage:
- Steps: <Steps for decline>
- Challenges: <Challenges faced>
- Strategies: <Revitalization strategies>

Conclusion:
- Summary: <Brief overview of the product's lifecycle journey>
`;
const productLifecycleStart = "Introduction Stage:";

const businessModelPrompt =
  "For the following idea, outline a monetization and pricing strategy considering costs, value, and competition. Emphasize the suitability of the strategy for the product's stage, target users, and problem space. Discuss potential revenue streams and factors influencing pricing decisions.";
const businessModelFormat = `Cost-Based Pricing:
- Production Costs: <Costs associated with producing and maintaining the product>
- Desired Profit Margin: <Targeted profit margin>

Value-Based Pricing:
- User Benefits: <Benefits the product provides>
- Perceived Value: <Value perceived by users>

Competition-Based Pricing:
- Competitor Pricing: <How competitors price similar products>
- Product Comparison: <Differences and unique selling points of your product vs. competition>

Monetization Strategy:
- Strategy Details: <Details of the chosen monetization method, e.g., subscription, one-time payment>
- Revenue Streams: <Possible revenue streams for the product>
- Currency of Success: <If not monetary, other metrics of success, e.g., volume of messages>

Conclusion:
- Strategy Justification: <Why the chosen pricing strategy is suitable for target users and problem space>
- Influencing Factors: <Factors that influenced the pricing decisions, such as production costs, perceived value, competition>
`;
const businessModelStart = "Cost-Based Pricing:";

const brandingPrompt =
  "For the following idea, define a compelling brand identity by suggesting a product name and designing a logo. Consider factors like name length, reproducibility, domain availability, cultural references, and potential resemblances. Discuss the rationale behind the name, potential alternatives, and the significance of the chosen logo.";
const brandingFormat = `Product Name:
- Suggested Name: <Proposed product name>
- Meaning Behind the Name: <Rationale or story behind the name>
- Alternatives Considered: <Other names that were thought of>
- Factors Considered: <Aspects like domain availability, cultural implications, and more>

Logo Design:
- Logo Description: <Brief description of the logo's design>
- Significance: <What the logo represents and its connection to the product>
- Design Challenges: <Any challenges faced during the design process and how they were addressed>
- Inspirations: <Any sources of inspiration, such as Pinterest, Dribbble, etc.>

Conclusion:
- Brand Identity Justification: <Why the chosen name and logo best represent the product's identity>
- Potential Impact: <How this branding might influence the product's perception and recognition in the market>
`;
const brandingFormatStart = "Product Name:";

const uiuxPrompt =
  "Given a product's details, define both the user experience (UX) and user interface (UI). Describe key workflows for optimal user interaction and the rationale behind their design. Highlight UI considerations tailored to specific features and functionalities. Reflect on transparency, ethics, privacy, and user empowerment, especially in decision-making features. Discuss design prototypes and the final design choices.";
const uiuxFormat = `Sample Key Workflows:
- Workflow 1: <Description and reasoning>
- Workflow 2: <Description and reasoning>
- Workflow 3: <Description and reasoning>

User Experience Considerations:
- Branding Synergy: <How UX decisions resonate with the brand>
- User Emotions & Connections: <How the UX design fosters certain feelings or memories>
- Feedback & Iteration: <Feedback sources and changes made based on feedback>

User Interface Considerations:
- Transparency & Trust: <How the UI communicates the capabilities and limitations of features>
- Ethical Considerations: <Design choices made to ensure ethical interactions>
- Privacy & Data Collection: <How the UI informs users about data usage and collection>
- User Empowerment: <UI elements that give users control over automated actions or recommendations>

Conclusion:
- Overall Strategy: <Summary of the holistic design strategy for both UX and UI>
`;
const uiuxFormatStart = "Sample Key Workflows:";

// To be called once the idea's title and description is decided
export const generateIdeaContent = functions
  .runWith({
    timeoutSeconds: 300,
  })
  .https.onRequest(async (req, res) => {
    cors(req, res, async () => {
      const data = req.body;
      const userId = data.userId;
      const title = data.title;
      const description = data.description;
      const problem = data.problem || "";

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

      // Get the current number of credits the user has
      const currentCredits = userSnapshot.data()!.credits;

      // Check if the user has enough credits
      if (currentCredits < COST_TO_GENERATE_IDEA) {
        res.status(400).send("Insufficient credits");
        return;
      }

      // Decrement user credits by 10
      await userRef.update({
        credits: admin.firestore.FieldValue.increment(-COST_TO_GENERATE_IDEA),
      });
      const url = await generateImageUrl(title);
      console.log(url);
      // Create a new idea document in the "ideas" collection
      const ideaRef = admin.firestore().collection("ideas").doc();
      await ideaRef.set({
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        description: description,
        keywords: getSearchKeyWords(title, description),
        problem: problem,
        title: title,
        url: url,
        user_id: userId,
        votes: 0,
      });

      const ideaId = ideaRef.id;

      // Create a new content document in the "idea_contents" collection
      const ideaContentRef = admin
        .firestore()
        .collection("idea_contents")
        .doc();
      await ideaContentRef.set({
        idea_id: ideaId,
        title: title,
        description: description,
        status: STATUS.GENERATING,
        retries: 0,
        isPublic: true,
        productCapabilities: LOADING,
        competitiveLandscape: LOADING,
        moat: LOADING,
        productLifecycle: LOADING,
        businessModel: LOADING,
        branding: LOADING,
        uiux: LOADING,
      });

      res.status(200).send({
        message: `Idea ${ideaId} and its content were successfully created`,
        ideaId: ideaId,
      });
    });
  });

// Sequential generation of idea content
const handleIdeaContentGeneration = async (
  snapshot: admin.firestore.DocumentSnapshot
) => {
  const ideaContent = snapshot.data()!;
  const { title, description, retries } = ideaContent;

  if (ideaContent.status === STATUS.COMPLETED) {
    return;
  }

  const updates = {} as any;

  if (ideaContent.productCapabilities === LOADING) {
    const productCapabilities = await generateReflection(
      title,
      description,
      productCapabilitiesPrompt,
      productCapabilitiesFormat
    );
    const extractedProductCapabilities = extractContentFromResponse(
      productCapabilities,
      productCabpabilitiesStart
    );
    updates.productCapabilities = extractedProductCapabilities;
    // Retry if response is bad
    if (
      isBadResponse(extractedProductCapabilities, productCabpabilitiesStart) &&
      retries < MAX_RETRIES
    ) {
      updates.retries = retries + 1;
      updates.productCapabilities = LOADING;
    }
  } else if (ideaContent.competitiveLandscape === LOADING) {
    const competitiveLandscape = await generateResearch(description);
    const extractedCompetitiveLandscape = extractContentFromResponse(
      competitiveLandscape,
      competitiveLandscapeStart
    );
    updates.competitiveLandscape = extractedCompetitiveLandscape;
    // Retry if response is bad
    if (
      isBadResponse(extractedCompetitiveLandscape, competitiveLandscapeStart) &&
      retries < MAX_RETRIES
    ) {
      updates.retries = retries + 1;
      updates.competitiveLandscape = LOADING;
    }
  } else if (ideaContent.moat === LOADING) {
    const moat = await generateReflection(
      title,
      description,
      moatPrompt,
      moatFormat
    );
    const extractedMoat = extractContentFromResponse(moat, moatStart);
    updates.moat = extractedMoat;
    // Retry if response is bad
    if (isBadResponse(extractedMoat, moatStart) && retries < MAX_RETRIES) {
      updates.retries = retries + 1;
      updates.moat = LOADING;
    }
  } else if (ideaContent.productLifecycle === LOADING) {
    const productLifecycle = await generateReflection(
      title,
      description,
      productLifecyclePrompt,
      productLifecycleFormat
    );
    const extractedProductLifecycle = extractContentFromResponse(
      productLifecycle,
      productLifecycleStart
    );
    updates.productLifecycle = extractedProductLifecycle;
    // Retry if response is bad
    if (
      isBadResponse(extractedProductLifecycle, productCabpabilitiesStart) &&
      retries < MAX_RETRIES
    ) {
      updates.retries = retries + 1;
      updates.productLifecycle = LOADING;
    }
  } else if (ideaContent.businessModel === LOADING) {
    const businessModel = await generateReflection(
      title,
      description,
      businessModelPrompt,
      businessModelFormat
    );
    const extractedBusinessModel = extractContentFromResponse(
      businessModel,
      businessModelStart
    );
    updates.businessModel = extractedBusinessModel;
    // Retry if response is bad
    if (
      isBadResponse(extractedBusinessModel, brandingFormatStart) &&
      retries < MAX_RETRIES
    ) {
      updates.retries = retries + 1;
      updates.businessModel = LOADING;
    }
  } else if (ideaContent.branding === LOADING) {
    const branding = await generateReflection(
      title,
      description,
      brandingPrompt,
      brandingFormat
    );
    const extractedBranding = extractContentFromResponse(
      branding,
      brandingFormatStart
    );
    updates.branding = extractedBranding;
    // Retry if response is bad
    if (
      isBadResponse(extractedBranding, brandingFormatStart) &&
      retries < MAX_RETRIES
    ) {
      updates.retries = retries + 1;
      updates.branding = LOADING;
    }
  } else {
    const uiux = await generateReflection(
      title,
      description,
      uiuxPrompt,
      uiuxFormat
    );
    const extractedUiux = extractContentFromResponse(uiux, uiuxFormatStart);
    updates.uiux = extractedUiux;
    // Retry if response is bad
    if (
      isBadResponse(extractedUiux, uiuxFormatStart) &&
      retries < MAX_RETRIES
    ) {
      updates.retries = retries + 1;
      updates.uiux = LOADING;
    } else {
      // Mark as completed since all content has been generated
      updates.status = STATUS.COMPLETED;
    }
  }

  console.log("Updating: " + JSON.stringify(updates));

  await snapshot.ref.update(updates);
};

const extractContentFromResponse = (
  responseText: string,
  startText: string
): string => {
  const startIndex = responseText.indexOf(startText);
  // Return original text if startText not found
  if (startIndex === -1) return responseText;
  return responseText.substring(startIndex);
};

const isBadResponse = (parsedText: string, startText: string): boolean => {
  const startIndex = parsedText.indexOf(startText);
  if (parsedText === ERROR_MESSAGE) {
    return true;
  }
  const refuseToAnswerIndex = parsedText.indexOf(REFUSE_TO_ANSWER);
  return startIndex === -1 || refuseToAnswerIndex !== -1;
};

export const generateIdeaContentOnCreate = functions
  .runWith({
    timeoutSeconds: 300,
  })
  .firestore.document("idea_contents/{docId}")
  .onCreate((snapshot, context) => {
    console.log("onCreate Generating idea content");
    return handleIdeaContentGeneration(snapshot);
  });

export const generateIdeaContentOnUpdate = functions
  .runWith({
    timeoutSeconds: 300,
  })
  .firestore.document("idea_contents/{docId}")
  .onUpdate((change, context) => {
    console.log("onUpdate Generating idea content");
    // Use 'after' snapshot to get the current data
    return handleIdeaContentGeneration(change.after);
  });

const generateImageUrl = async (title: string): Promise<string> => {
  const extractedKeywords = keywordExtractor.extract(title, {
    language: "english",
    remove_digits: true,
    return_changed_case: true,
    remove_duplicates: true,
  });

  const queryUrl = `https://source.unsplash.com/1600x900/?${encodeURIComponent(
    extractedKeywords.join(",")
  )}`;

  const data = await fetch(queryUrl);
  console.log(data.url);
  return data.url;
};

const getSearchKeyWords = (title: string, description: string) => {
  const extractedKeywords = keywordExtractor.extract(
    `${title} ${description}`,
    {
      language: "english",
      remove_digits: true,
      return_changed_case: true,
      remove_duplicates: true,
    }
  );
  return extractedKeywords.map((keyword: string) =>
    natural.PorterStemmer.stem(keyword)
  );
};

export const generateNewIdeaImage = functions.https.onRequest(
  async (req, res) => {
    cors(req, res, async () => {
      const data = req.body;
      const userId = data.userId;
      const ideaId = data.ideaId;

      if (!userId || !ideaId) {
        res.status(400).send("Missing required data");
        return;
      }

      // Check if a user document already exists in Firestore
      const userRef = admin.firestore().collection("users").doc(userId);
      const userSnapshot = await userRef.get();

      // Check if an idea document already exists in Firestore
      const ideaRef = admin.firestore().collection("ideas").doc(ideaId);
      const ideaSnapshot = await ideaRef.get();

      if (!ideaSnapshot.exists || !userSnapshot.exists) {
        res.status(400).send("User or Idea does not exist");
        return;
      }

      const ideaData = ideaSnapshot.data()!;

      // Check if the idea belongs to the user
      if (ideaData.user_id !== userId) {
        res.status(401).send("Unauthorized");
        return;
      }

      const url = await regenerateImageUrl(ideaData.title);

      await ideaRef.update({
        url: url,
      });

      res.status(200).send({
        message: `New image for Idea ${ideaId} was successfully generated`,
      });
    });
  }
);

export const updateIdeaVisibility = functions.https.onRequest(
  async (req, res) => {
    cors(req, res, async () => {
      const data = req.body;
      const userId = data.userId;
      const ideaId = data.ideaId;
      const isPublic = data.isPublic;

      if (!userId || !ideaId || isPublic === undefined) {
        res.status(400).send("Missing required data");
        return;
      }

      // Check if a user document already exists in Firestore
      const userRef = admin.firestore().collection("users").doc(userId);
      const userSnapshot = await userRef.get();

      // Check if an idea document already exists in Firestore
      const ideaRef = admin.firestore().collection("ideas").doc(ideaId);
      const ideaSnapshot = await ideaRef.get();

      if (!ideaSnapshot.exists || !userSnapshot.exists) {
        res.status(400).send("User or Idea does not exist");
        return;
      }

      const ideaData = ideaSnapshot.data()!;

      // Check if the idea belongs to the user
      if (ideaData.user_id !== userId) {
        res.status(401).send("Unauthorized");
        return;
      }

      await ideaRef.update({
        isPublic: isPublic,
      });

      res.status(200).send({
        message: `Updated Idea ${ideaId} visibility to ${isPublic}`,
      });
    });
  }
);

const regenerateImageUrl = async (title: string): Promise<string> => {
  const extractedKeywords = keywordExtractor.extract(title, {
    language: "english",
    remove_digits: true,
    return_changed_case: true,
    remove_duplicates: true,
  });

  // Shuffle the extractedKeywords array
  const shuffledKeywords = extractedKeywords.sort(() => Math.random() - 0.5);

  const queryUrl = `https://source.unsplash.com/1600x900/?${encodeURIComponent(
    shuffledKeywords.join(",")
  )}`;

  const data = await fetch(queryUrl);
  console.log(data.url);
  return data.url;
};
