
import { GoogleGenAI } from "@google/genai";
import { TrainingConfig, ModelType } from '../types';

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey });
};

export const validateApiKey = async (apiKey: string): Promise<boolean> => {
  if (!apiKey) return false;
  try {
    const ai = new GoogleGenAI({ apiKey });
    // Minimal request to check auth
    await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'ping',
    });
    return true;
  } catch (error) {
    console.error("API Key Validation Error:", error);
    return false;
  }
};

export const generatePythonCode = async (config: TrainingConfig): Promise<string> => {
  const ai = getAiClient();
  const modelId = "gemini-2.5-flash"; 

  const isDistillation = config.modelType === ModelType.DISTILLATION;
  const isPhysics = config.modelType === ModelType.PHYSICS_LIGHTGBM;
  const isStacking = config.modelType === ModelType.STACKING;

  let strategiesDescription = "";

  if (isPhysics) {
    strategiesDescription = `
    STRATEGY: Physics-Informed LightGBM (Arrhenius Enhanced).
    KEY REQUIREMENT: You MUST implement specific "Feature Engineering" in \`src/features.py\` that reflects Geochemical/Physical laws:
    1. **Arrhenius Term**: Create feature \`10000_over_T\` calculated as $10000 / (Temperature_C + 273.15)$. Viscosity follows $\eta = A \cdot e^{E_a/RT}$.
    2. **Structure Modifiers (SM)**: Sum of basic oxides (CaO + MgO + Na2O + K2O + FexOy).
    3. **Polymerization Index**: Ratio of SiO2 / (Al2O3 + SM).
    4. **Network Effect**: Interaction terms like \`SiO2 * Al2O3\`.
    Model: Use LightGBM Regressor.
    `;
  } else if (isStacking) {
    strategiesDescription = `
    STRATEGY: Stacking Ensemble (SOTA Accuracy).
    Architecture:
    - Level 0 Models: XGBoost, LightGBM, RandomForest.
    - Level 1 Meta-Learner: RidgeCV or LinearRegression.
    - Use \`sklearn.ensemble.StackingRegressor\`.
    `;
  } else if (isDistillation) {
    strategiesDescription = `
    STRATEGY: Knowledge Distillation.
    - Teacher: VotingRegressor (XGB + RF + GradientBoosting).
    - Student: Small DecisionTree or MLP (mimic the Teacher's predictions).
    `;
  } else {
    strategiesDescription = `STRATEGY: Standard ${config.modelType} implementation.`;
  }

  const prompt = `
    Role: Senior Machine Learning Engineer & Computational Geochemist.
    Task: Generate a standardized, multi-file Python Project Structure for predicting Basalt Melt Viscosity.
    Language: Python code. Comments in CHINESE (Simplified).
    
    Database Config:
    - Host: ${config.dbConfig.host}
    - Port: ${config.dbConfig.port}
    - User: ${config.dbConfig.user}
    - Password: ${config.dbConfig.password || 'sql2008'}
    - DB: ${config.dbConfig.database}
    - Table: ${config.dbConfig.table}
    - Target: ${config.target} (This is the viscosity value column)
    - ID Column: sampleID
    
    ${strategiesDescription}
    
    OUTPUT FORMAT:
    You must output the content of multiple files. 
    Separate each file CLEARLY with this delimiter line:
    \`--- FILE: path/to/filename ---\`
    
    Required Files:
    1. \`requirements.txt\` (include pandas, numpy, sqlalchemy, pymysql, scikit-learn, lightgbm, xgboost, matplotlib, seaborn).
    2. \`config.yaml\` (YAML file with db config and model params).
    3. \`src/database.py\` (Class to handle connection and data loading. Column names MUST match user schema: sampleID, SiO2, Al2O3, viscosityValue, etc.).
    4. \`src/features.py\` (Class for Preprocessing & Feature Engineering - CRITICAL for Physics-Informed).
    5. \`src/model_factory.py\` (Class to build the specific model based on strategy).
    6. \`main.py\` (Entry point: Load -> Process -> Train -> Evaluate -> Plot).

    Ensure code is robust, modular, and academic quality.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error generating code:", error);
    return "Error: " + error;
  }
};

export const askExpert = async (question: string, config: TrainingConfig): Promise<string> => {
    const ai = getAiClient();
    const modelId = "gemini-2.5-flash";
    
    const context = `
    CURRENT PROJECT CONFIGURATION:
    - Model Strategy: ${config.modelType}
    - Database Table: ${config.dbConfig.table} in ${config.dbConfig.database}
    - Features: ${config.features.join(', ')}
    - Target: ${config.target}
    `;

    const prompt = `
    You are an expert Computational Geochemist and AI Researcher specializing in Magma Viscosity.
    User is building a Machine Learning project with the following configuration:
    ${context}

    USER QUESTION: "${question}"

    INSTRUCTIONS:
    - Provide a concise, scientifically accurate answer.
    - If relevant, explain the connection between Geochemistry (Arrhenius, NBO/T) and ML (Feature Importance, Overfitting).
    - Use Markdown for formatting (bold, lists, code blocks).
    - Use CHINESE (Simplified).
    `;

    try {
        const response = await ai.models.generateContent({
            model: modelId,
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Error asking expert:", error);
        return "I encountered an error connecting to the expert AI. Please check your network or API Key.";
    }
};

// Deprecated old advice function, replaced by askExpert
export const getDistillationAdvice = async (): Promise<string> => {
  return "";
};
