import { GoogleGenAI, Type } from "@google/genai";
import { FigmaNode } from "../../types/figma.dto";
import { SecurityFinding } from "./types";

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

/**
 * Strips away visual styling and extracts only semantic UI elements
 * (buttons, inputs, labels, headers) to keep token usage lean and focused.
 */
const extractSemanticHierarchy = (nodes: FigmaNode[]): any[] => {
    return nodes.map((node) => ({
        id: node.id,
        name: node.name,
        type: node.type,
        ...(node.characters ? { text: node.characters } : {}),
        ...(node.children && node.children.length > 0
            ? { children: extractSemanticHierarchy(node.children) }
            : {}),
    }));
};

export class AISecurityService {
    /**
     * Evaluates a Figma screen using Gemini to identify high-level privacy & security omissions
     */
    static async auditWithAI(nodes: FigmaNode[]): Promise<SecurityFinding[]> {
        if (!ai) {
            console.warn("⚠️ [AI Linter] GEMINI_API_KEY is not set. Skipping AI audit.");
            return [];
        }

        const simplifiedTree = extractSemanticHierarchy(nodes);

        const systemInstruction = `
You are an expert Application Security (AppSec) and Privacy Architect auditing Figma UI mockups before developers implement them.
Your job is to identify security, privacy, and authentication vulnerabilities visible in user interface designs.

Focus on:
1. AUTHENTICATION OMISSIONS: Missing Two-Factor Authentication (2FA/MFA) hints on high-risk actions (wire transfers, password changes, deleting accounts).
2. PRIVACY & GDPR COMPLIANCE: Forms collecting sensitive PII (emails, phone numbers, addresses) without clear privacy notices or consent options.
3. INSECURE RECOVERY PATTERNS: Legacy password resets using security questions instead of OTP or magic links.
4. EXPOSED SENSITIVE DATA: Account numbers, tokens, or PII displayed in full without masking indicators.
5. INPUT HYGIENE: Credit card or PIN inputs that look like standard unrestricted text inputs.

For each issue found, you MUST reference the exact 'nodeId' of the Figma element responsible.
`;

        try {
            const response = await ai.models.generateContent({
                model: "gemini-3.5-flash",
                contents: [
                    {
                        role: "user",
                        parts: [
                            {
                                text: `Audit the following Figma UI hierarchy for security and privacy flaws:\n\n${JSON.stringify(
                                    simplifiedTree,
                                    null,
                                    2
                                )}`,
                            },
                        ],
                    },
                ],
                config: {
                    systemInstruction,
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        description: "List of security and privacy violations found in the design",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                nodeId: { type: Type.STRING, description: "The exact Figma node ID" },
                                nodeName: { type: Type.STRING, description: "The layer name in Figma" },
                                ruleId: { type: Type.STRING, description: "e.g. AI_MISSING_2FA, AI_GDPR_CONSENT" },
                                ruleName: { type: Type.STRING, description: "Concise title of the flaw" },
                                severity: {
                                    type: Type.STRING,
                                    enum: ["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"],
                                },
                                category: {
                                    type: Type.STRING,
                                    enum: ["DATA_EXPOSURE", "AUTHENTICATION", "PRIVACY", "INPUT_SECURITY"],
                                },
                                description: {
                                    type: Type.STRING,
                                    description: "Explanation of why this design introduces a security or privacy risk",
                                },
                                suggestedFix: {
                                    type: Type.STRING,
                                    description: "Actionable guidance for the designer on how to fix this mockup in Figma",
                                },
                            },
                            required: [
                                "nodeId",
                                "nodeName",
                                "ruleId",
                                "ruleName",
                                "severity",
                                "category",
                                "description",
                            ],
                        },
                    },
                },
            });

            if (!response.text) return [];

            const findings = JSON.parse(response.text) as SecurityFinding[];
            return findings;
        } catch (error) {
            console.error("❌ [AI Linter] Gemini audit failed:", error);
            return [];
        }
    }
}