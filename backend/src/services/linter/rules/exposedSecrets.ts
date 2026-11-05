import { Severity } from "@prisma/client";
import { FigmaNode } from "../../../types/figma.dto";
import { SecurityFinding, SecurityRule } from "../types";

export class ExposedSecretsRule implements SecurityRule {
    id = "SEC_EXPOSED_SECRETS";
    name = "Exposed Payment Card or Secret Key";
    severity = Severity.CRITICAL;
    category = "DATA_EXPOSURE" as const;
    description =
        "Live or realistic credit card numbers and API keys should never be placed in Figma designs.";

    // Regex patterns
    private creditCardRegex =
        /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/;

    private apiKeyRegex =
        /\b(?:sk_live_[0-9a-zA-Z]{24,}|AIzaSy[0-9A-Za-z_-]{33}|ghp_[0-9a-zA-Z]{36})\b/;

    evaluate(node: FigmaNode): SecurityFinding[] | null {
        if (node.type !== "TEXT" || !node.characters) {
            return null;
        }

        const text = node.characters.replace(/[\s-]/g, ""); // strip dashes/spaces for CC check
        const findings: SecurityFinding[] = [];

        // 1. Credit Card Check
        if (this.creditCardRegex.test(text)) {
            findings.push({
                nodeId: node.id,
                nodeName: node.name,
                ruleId: this.id,
                ruleName: "Exposed Payment Card Number",
                severity: Severity.CRITICAL,
                category: this.category,
                description: `Layer "${node.name}" contains an unmasked credit card number.`,
                suggestedFix: "•••• •••• •••• 1234",
            });
        }

        // 2. Leaked API Key Check
        if (this.apiKeyRegex.test(node.characters)) {
            findings.push({
                nodeId: node.id,
                nodeName: node.name,
                ruleId: "SEC_LEAKED_API_KEY",
                ruleName: "Leaked API Key",
                severity: Severity.CRITICAL,
                category: this.category,
                description: `Layer "${node.name}" contains an exposed API secret key.`,
                suggestedFix: "[REDACTED_API_KEY]",
            });
        }

        return findings.length > 0 ? findings : null;
    }
}