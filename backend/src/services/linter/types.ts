import { Severity } from "@prisma/client";
import { FigmaNode } from "../../types/figma.dto";

export type RuleCategory =
    | "DATA_EXPOSURE"
    | "AUTHENTICATION"
    | "PRIVACY"
    | "INPUT_SECURITY";

/**
 * A violation detected on a specific Figma node
 */
export interface SecurityFinding {
    nodeId: string;
    nodeName: string;
    ruleId: string;
    ruleName: string;
    severity: Severity;
    category: RuleCategory;
    description: string;
    suggestedFix?: string;
}

/**
 * Contract that every deterministic security rule must implement
 */
export interface SecurityRule {
    id: string; // Unique ID, e.g. "SEC_PASSWORD_MASKING"
    name: string; // Human title, e.g. "Exposed Plaintext Password"
    severity: Severity;
    category: RuleCategory;
    description: string;

    /**
     * Evaluates a single node. Returns findings if violations exist, or null/empty array if clean.
     */
    evaluate(node: FigmaNode, parent?: FigmaNode): SecurityFinding[] | null;
}