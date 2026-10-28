# CivicShield AI - Known Limitations & Engineering Disclosures

In compliance with professional engineering standards and ethical AI guidelines, CivicShield AI operates under clearly disclosed operational parameters:

## 1. Computer Vision Disclaimers
- **Visual Screening Only**: RoadWatch AI computer vision detections provide surface visual triage. Image analysis does **not** evaluate pavement subsurface integrity, structural load capacities, or soil subsidence. Certified civil engineering physical inspection remains mandatory before making structural safety declarations.
- **Environmental Factors**: Low light, heavy rain glare, and standing muddy water may obscure fine surface transverse cracking.

## 2. Decision Support vs Authoritative Actions
- **No Autonomous Emergency Dispatch**: DisasterConnect AI identifies and correlates *potential* emergencies based on multi-hazard clustering heuristics. The platform does **not** autonomously dispatch first responders, declare evacuation orders, or close bridges without authorized human coordinator verification.
- **No Automatic Merging**: Duplicate detection computes composite multi-factor candidate scores. The system never merges citizen complaint records without authorized administrative review.

## 3. Simplified Routing & Distance Modeling
- In the absence of live municipal turn-by-turn routing servers or live traffic congestion feeds, resource deployment distance estimations apply a documented **$1.28\times$ urban detour factor** over great-circle Haversine distances. Straight-line Euclidean distance is never claimed to represent real driving distance.

## 4. Cloud LLM Isolation
- Optional Cloud LLM (Gemini) integration is strictly limited to natural-language summaries and public explainability. The LLM has zero direct database write permissions, zero operating system execution capabilities, and is never trusted to make authorization decisions.
- When no LLM credentials are configured, the platform functions seamlessly with deterministic templates.
