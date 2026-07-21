export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface RetrievalFamily {
  family: string;
  filename: string;
  excerpts: string[];
}

export interface AuditSummary {
  version: "1.2.5";
  modelClass: "efficient" | "deep";
  familiesConsulted: string[];
  evidenceCount: number;
  stored: false;
}

export interface EvaluatedCase {
  title: string;
  type: string;
  scenario: string;
  turns: Array<{
    speaker: "Synthetic patient" | "Ños";
    content: string;
  }>;
  evaluation: {
    score: number;
    strengths: string[];
    limitations: string[];
    observed_capabilities: string[];
    conclusion: string;
  };
  provenance: {
    synthetic: true;
    exchanges: 3;
    generatedForSession: true;
  };
}
