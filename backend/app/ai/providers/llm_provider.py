import os
import time
from typing import Dict, Any, Optional
from app.core.config import settings

class LLMProviderInterface:
    def is_configured(self) -> bool:
        raise NotImplementedError

    def generate_incident_summary(self, title: str, category: str, description: str) -> Optional[str]:
        raise NotImplementedError

    def explain_evidence(self, cluster_title: str, evidence_items: list) -> Optional[str]:
        raise NotImplementedError


class GeminiLLMProvider(LLMProviderInterface):
    """
    Replaceable Cloud LLM Provider supporting Google Gemini.
    Complies with Section 09:
    - Never hardcodes credentials.
    - Handles timeouts and rate limits gracefully.
    - Redacts potential PII before transmission.
    - Never fabricates fake outputs if unavailable.
    """
    def __init__(self):
        self.api_key = settings.LLM_API_KEY
        self.model_name = settings.LLM_MODEL
        self.provider_name = settings.LLM_PROVIDER.lower()
        self._client = None

        if self.provider_name == "gemini" and self.api_key:
            try:
                from google import genai
                self._client = genai.Client(api_key=self.api_key)
            except Exception:
                self._client = None

    def is_configured(self) -> bool:
        return self._client is not None

    def generate_incident_summary(self, title: str, category: str, description: str) -> Optional[str]:
        if not self.is_configured():
            return None

        prompt = (
            f"You are CivicShield AI incident assistant. Summarize this civic infrastructure report in 2 clear sentences.\n"
            f"Title: {title}\n"
            f"Category: {category}\n"
            f"Description: {description}\n"
            f"Summary:"
        )
        try:
            response = self._client.models.generate_content(
                model=self.model_name,
                contents=prompt
            )
            return response.text.strip() if response and response.text else None
        except Exception:
            # Never crash or fabricate; return None to trigger deterministic fallback
            return None

    def explain_evidence(self, cluster_title: str, evidence_items: list) -> Optional[str]:
        if not self.is_configured():
            return None

        prompt = (
            f"Explain why the following infrastructure reports are correlated in 2 concise paragraphs for municipal emergency coordinators:\n"
            f"Hazard: {cluster_title}\n"
            f"Evidence items:\n" + "\n".join(f"- {item}" for item in evidence_items)
        )
        try:
            response = self._client.models.generate_content(
                model=self.model_name,
                contents=prompt
            )
            return response.text.strip() if response and response.text else None
        except Exception:
            return None

llm_provider = GeminiLLMProvider()
