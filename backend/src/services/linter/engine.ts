import { FigmaNode } from "../../types/figma.dto";
import { SecurityFinding, SecurityRule } from "./types";

export class LinterEngine {
    private rules: SecurityRule[] = [];

    public registerRule(rule: SecurityRule): void {
        this.rules.push(rule);
    }

    /**
     * Scans root Figma nodes and all nested children using Depth-First Search
     */
    public run(nodes: FigmaNode[]): SecurityFinding[] {
        const findings: SecurityFinding[] = [];

        for (const rootNode of nodes) {
            this.traverse(rootNode, undefined, findings);
        }

        return findings;
    }

    private traverse(
        node: FigmaNode,
        parent: FigmaNode | undefined,
        findings: SecurityFinding[]
    ): void {
        // 1. Run all registered rules on the current node
        for (const rule of this.rules) {
            try {
                const result = rule.evaluate(node, parent);
                if (result && result.length > 0) {
                    findings.push(...result);
                }
            } catch (error) {
                console.error(`[Linter] Error running rule ${rule.id} on node ${node.id}:`, error);
            }
        }

        // 2. Recursively traverse children (Frames, Groups, Components)
        if (node.children && node.children.length > 0) {
            for (const child of node.children) {
                this.traverse(child, node, findings);
            }
        }
    }
}