import React, { useState, useEffect } from 'react';
import {
  Cpu, Layers, Shield, CheckCircle, AlertTriangle,
  Sparkles, Terminal, Activity, ArrowRight
} from 'lucide-react';
import { aiApi, incidentApi } from '../api/services';
import { AIStatus, Incident } from '../types';

export const AISettingsPage: React.FC = () => {
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);
  const [agentTools, setAgentTools] = useState<any>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [testingAgent, setTestingAgent] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statusRes, toolsRes, incList] = await Promise.all([
        aiApi.getStatus(),
        aiApi.getTools(),
        incidentApi.list({ limit: 15 })
      ]);
      setAiStatus(statusRes);
      setAgentTools(toolsRes);
      setIncidents(incList);
      if (incList.length > 0) setSelectedIncidentId(incList[0].id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRunAgentDiagnostic = async () => {
    if (!selectedIncidentId) return;
    setTestingAgent(true);
    try {
      const res = await aiApi.analyzeIncident(selectedIncidentId);
      setAnalysisResult(res);
    } catch (e: any) {
      alert(`Diagnostic error: ${e.message}`);
    } finally {
      setTestingAgent(false);
    }
  };

  if (loading || !aiStatus) {
    return (
      <div className="p-12 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-3 text-xs text-slate-500">Querying AI subsystem architecture...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">AI Subsystem & Controlled Agent Architecture</h1>
          <span className="text-xs px-2 py-0.5 rounded font-medium bg-purple-100 text-purple-800">
            Hybrid AI Layers
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          CivicShield AI uses a 3-tier hybrid AI architecture. Core features operate deterministically without requiring a paid LLM.
        </p>
      </div>

      {/* 3 Layers Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Layer 1 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center space-x-2 text-blue-600 font-bold text-xs uppercase tracking-wider">
            <span className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[11px]">1</span>
            <span>Deterministic Engine</span>
          </div>
          <h3 className="text-sm font-bold text-slate-900">Zero-LLM Reliability</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Keyword rules, spherical Haversine spatial calculations, status transitions, role authorizations, and audit integrity run locally in pure Python.
          </p>
          <div className="pt-2 text-[10px] font-bold text-emerald-700 flex items-center space-x-1">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Always Active & Operational</span>
          </div>
        </div>

        {/* Layer 2 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center space-x-2 text-purple-600 font-bold text-xs uppercase tracking-wider">
            <span className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-[11px]">2</span>
            <span>Machine Learning</span>
          </div>
          <h3 className="text-sm font-bold text-slate-900">Computer Vision & NLP</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            RoadWatch AI computer vision interface with genuine model execution abstraction. Scikit-learn TF-IDF & cosine similarity for duplicate discovery.
          </p>
          <div className="pt-2 text-[10px] font-bold text-purple-700 flex items-center space-x-1">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>{aiStatus.text_similarity_engine}</span>
          </div>
        </div>

        {/* Layer 3 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center space-x-2 text-amber-600 font-bold text-xs uppercase tracking-wider">
            <span className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center text-[11px]">3</span>
            <span>Optional Cloud LLM</span>
          </div>
          <h3 className="text-sm font-bold text-slate-900">Natural Language Assist</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Replaceable provider abstraction supporting Google Gemini. Used for complaint summarization and multilingual citizen explanation.
          </p>
          <div className="pt-2 text-[10px] font-bold text-slate-500 flex items-center space-x-1">
            {aiStatus.llm_configured ? (
              <span className="text-emerald-700 flex items-center space-x-1">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Connected ({aiStatus.llm_model})</span>
              </span>
            ) : (
              <span className="text-slate-500">
                Operating in Deterministic Fallback Mode (No API key required)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Controlled Agent Tools Catalog */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div>
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
            <Shield className="w-4 h-4 text-blue-600" />
            <span>Controlled Agent Sandbox Tools ({Object.keys(agentTools?.tools || {}).length})</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            The Civic Incident Intelligence Agent coordinates sandboxed, deterministic tools. Zero arbitrary shell commands, zero filesystem access, and zero unverified action execution.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(agentTools?.tools || {}).map(([toolName, def]: [string, any]) => (
            <div key={toolName} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-blue-700">{toolName}</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                  {def.timeout_seconds}s timeout
                </span>
              </div>
              <p className="text-slate-600 text-[11px] leading-snug">{def.description}</p>
              <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-200 flex items-center justify-between">
                <span>Auth: {def.permission}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Controlled Agent Interactive Diagnostic Runner */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-slate-700" />
              <span>Execute Controlled Agent Analysis Pipeline</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select an incident to run the complete 7-tool automated correlation pipeline and view structured audit output.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={selectedIncidentId}
              onChange={(e) => setSelectedIncidentId(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 max-w-xs"
            >
              {incidents.map((i) => (
                <option key={i.id} value={i.id}>
                  #{i.id.slice(0, 8)} - {i.title}
                </option>
              ))}
            </select>

            <button
              onClick={handleRunAgentDiagnostic}
              disabled={testingAgent || !selectedIncidentId}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
            >
              {testingAgent ? 'Executing...' : 'Run Pipeline'}
            </button>
          </div>
        </div>

        {analysisResult && (
          <div className="p-4 bg-slate-900 rounded-xl text-slate-200 text-xs font-mono space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-emerald-400 font-bold">PIPELINE EXECUTION OUTCOME: SUCCESS</span>
              <span className="text-slate-400 text-[10px]">Provider: {analysisResult.ai_provider}</span>
            </div>

            <div>
              <span className="text-slate-400 font-bold">Tools Executed: </span>
              <span className="text-blue-300">{analysisResult.tools_executed?.join(' → ')}</span>
            </div>

            <div>
              <span className="text-slate-400 font-bold">Predicted Category: </span>
              <span className="text-amber-300">{analysisResult.predicted_category}</span> ({analysisResult.classification_method})
            </div>

            <div>
              <span className="text-slate-400 font-bold">Reasoning: </span>
              <span className="text-slate-300">{analysisResult.explanation}</span>
            </div>

            <div>
              <span className="text-slate-400 font-bold">Summary: </span>
              <p className="text-slate-200 mt-1 font-sans">{analysisResult.recommended_next_steps?.join(' ')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
