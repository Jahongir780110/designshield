import { Severity } from "@prisma/client";
import { FigmaNode } from "../../../types/figma.dto";
import { SecurityFinding, SecurityRule } from "../types";

export class PasswordMaskingRule implements SecurityRule {
    id = "SEC_PASSWORD_MASKING";
    name = "Exposed Plaintext Password";
    severity = Severity.HIGH;
    category = "DATA_EXPOSURE" as const;
    description =
        "Password fields in design mockups should display masked characters (dots or asterisks) to prevent shoulder surfing and accidental exposure in client demos.";

    evaluate(node: FigmaNode, parent?: FigmaNode): SecurityFinding[] | null {
        // We only inspect TEXT nodes
        if (node.type !== "TEXT" || !node.characters) {
            return null;
        }

        const text = node.characters.trim();
        const nodeName = node.name.toLowerCase();
        const parentName = parent?.name.toLowerCase() || "";

        // Check if the layer or its parent container is labeled as a password field
        const isPasswordField =
            nodeName.includes("password") ||
            nodeName.includes("passcode") ||
            nodeName.includes("secret") ||
            parentName.includes("password") ||
            parentName.includes("passcode");

        if (!isPasswordField) {
            return null;
        }

        // Check if the text is already properly masked (e.g., "••••••••" or "********")
        const isMasked = /^[\u2022\u25CF*•]+$/.test(text);

        // If it's a password field and contains non-placeholder, unmasked plaintext
        if (!isMasked && text.length > 0 && text.toLowerCase() !== "enter password") {
            return [
                {
                    nodeId: node.id,
                    nodeName: node.name,
                    ruleId: this.id,
                    ruleName: this.name,
                    severity: this.severity,
                    category: this.category,
                    description: `Layer "${node.name}" displays unmasked password text: "${text}".`,
                    suggestedFix: "••••••••••••", // The exact string to replace on the canvas!
                },
            ];
        }

        return null;
    }
}