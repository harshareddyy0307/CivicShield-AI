from typing import List, Dict, Tuple, Optional
import numpy as np

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

class TextSimilarityService:
    """
    Computes semantic and lexical similarity between incident descriptions.
    Uses TF-IDF and Cosine Similarity as a reliable local baseline.
    Does NOT claim that semantic similarity proves two reports refer to the same physical issue.
    """
    def __init__(self):
        self.engine_name = "TF-IDF + Cosine Similarity (scikit-learn)" if SKLEARN_AVAILABLE else "Jaccard Token Baseline"

    def compute_similarity(self, text1: str, text2: str) -> float:
        """
        Calculate similarity score between 0.0 and 1.0.
        """
        if not text1 or not text2:
            return 0.0
        
        t1 = text1.strip().lower()
        t2 = text2.strip().lower()
        
        if t1 == t2:
            return 1.0

        if SKLEARN_AVAILABLE:
            try:
                vectorizer = TfidfVectorizer(stop_words="english", min_df=1, ngram_range=(1, 2))
                tfidf_matrix = vectorizer.fit_transform([t1, t2])
                sim = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
                return float(round(sim, 4))
            except Exception:
                pass

        # Jaccard Token Fallback
        tokens1 = set(t1.split())
        tokens2 = set(t2.split())
        if not tokens1 or not tokens2:
            return 0.0
        intersection = tokens1.intersection(tokens2)
        union = tokens1.union(tokens2)
        return float(round(len(intersection) / len(union), 4))

    def find_similar_in_corpus(
        self, query_text: str, corpus: List[Dict[str, Any]], threshold: float = 0.3
    ) -> List[Dict[str, Any]]:
        """
        Matches query_text against a list of incident items (each dict must have 'id' and 'description').
        Returns items with similarity score >= threshold, sorted descending.
        """
        if not query_text or not corpus:
            return []

        results = []
        for item in corpus:
            desc = item.get("description", "")
            score = self.compute_similarity(query_text, desc)
            if score >= threshold:
                results.append({
                    "item": item,
                    "similarity_score": score,
                    "engine": self.engine_name
                })

        results.sort(key=lambda x: x["similarity_score"], reverse=True)
        return results

text_similarity_service = TextSimilarityService()
