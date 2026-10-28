# CivicShield AI - AI Models & Machine Learning Specification

## 1. Hybrid AI Architectural Principle
CivicShield AI does not depend on a mandatory paid LLM or external model APIs to function. Capabilities are cleanly divided into three distinct operational layers:

### Layer 1: Deterministic Processing
- **Rule-Based Categorization**: Matches descriptions against canonical infrastructure keywords. Does not generate artificial or fabricated confidence scores for keyword heuristics.
- **Geospatial Analytics**: Spherical great-circle Haversine calculations ($R = 6,371\text{ km}$).
- **Detour Distance Modeling**: Uses a documented $1.28\times$ urban detour factor over great-circle distances to approximate road driving distance without fabricating live GPS turn-by-turn routing.
- **Controlled Agent Sandbox**: 7 audited tools with strict input schemas and zero shell/filesystem execution permissions.

### Layer 2: Machine Learning Subsystems
- **RoadWatch Computer Vision Interface (`RoadVisionModelInterface`)**:
  - Abstract interface decoupling inference from FastAPI routes.
  - Supported distress classes: `pothole`, `longitudinal_crack`, `transverse_crack`, `alligator_cracking`, `rutting`, `manhole_displacement`.
  - Configurable weights path: `VISION_MODEL_PATH` in `.env`.
  - When weights are unconfigured: Genuine status reporting (`weights_not_configured`), manual observation recording enabled, and zero fabricated bounding boxes or fake confidence scores.
- **Lexical & Semantic Text Similarity (`TextSimilarityService`)**:
  - Scikit-learn TF-IDF Vectorizer with unigrams and bigrams + Cosine Similarity.
  - Used for duplicate report candidate scoring.

### Layer 3: Replaceable Cloud LLM Provider
- **Provider Interface (`LLMProviderInterface`)**:
  - Supports Google Gemini (`gemini-2.5-flash`) via `google-genai` SDK.
  - Zero hardcoded API keys. Configured strictly via `LLM_API_KEY` in environment.
  - Handles rate limits and timeouts gracefully.
  - Never trusted to authorize actions or execute state transitions.
  - When `LLM_PROVIDER=none` or API key is absent: Smoothly falls back to deterministic template synthesis with zero downtime or fabrication.

## 2. Model Configuration Guide

### Configuring RoadWatch Vision Weights
1. Train or obtain a compatible road damage detection model (e.g. YOLOv8 / ONNX trained on the RDD2022 or CRDDC dataset).
2. Save the weights file to a local path (e.g. `backend/weights/roadwatch_yolov8.onnx`).
3. Set the environment variable in `.env`:
   ```bash
   VISION_MODEL_PATH=./weights/roadwatch_yolov8.onnx
   VISION_MODEL_NAME=RoadWatch-RDD2022-YOLOv8
   ```
4. Restart the backend. The `/api/v1/roadwatch/model-status` endpoint will report status `loaded`.

### Configuring Optional Cloud LLM (Gemini)
1. Obtain an API key from Google AI Studio.
2. Update `.env`:
   ```bash
   LLM_PROVIDER=gemini
   LLM_API_KEY=your_actual_gemini_api_key_here
   LLM_MODEL=gemini-2.5-flash
   ```
3. Restart the backend. Natural language complaint summaries and evidence explanations will be enriched by Gemini.
