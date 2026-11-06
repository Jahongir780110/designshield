import prisma from "../config/db";
import { CreateScanInput } from "../types/figma.dto";
import { LinterEngine } from "./linter/engine";
import { PasswordMaskingRule } from "./linter/rules/passwordMasking";
import { ExposedSecretsRule } from "./linter/rules/exposedSecrets";
import { AISecurityService } from "./linter/ai.service";
import { SecurityFinding } from "./linter/types";

// Initialize engine and register deterministic rules once (singleton)
const engine = new LinterEngine();
engine.registerRule(new PasswordMaskingRule());
engine.registerRule(new ExposedSecretsRule());

export class ScanService {
    /**
     * Executes deterministic checks and AI audit in parallel, then saves results to Postgres
     */
    static async executeScan(userId: string, input: CreateScanInput) {
        // 1. Run deterministic rules & Gemini AI audit concurrently
        const [deterministicFindings, aiFindings] = await Promise.all([
            Promise.resolve(engine.run(input.nodes)),
            AISecurityService.auditWithAI(input.nodes),
        ]);

        // 2. Combine findings
        const allFindings: SecurityFinding[] = [
            ...deterministicFindings,
            ...aiFindings,
        ];

        // 3. Atomically persist the Scan and all ScanIssue records in PostgreSQL
        const scan = await prisma.scan.create({
            data: {
                figmaFileKey: input.figmaFileKey,
                figmaFileName: input.figmaFileName,
                userId,
                issues: {
                    create: allFindings.map((finding) => ({
                        nodeId: finding.nodeId,
                        nodeName: finding.nodeName,
                        ruleId: finding.ruleId,
                        ruleName: finding.ruleName,
                        severity: finding.severity,
                        description: finding.description,
                        suggestedFix: finding.suggestedFix || null,
                    })),
                },
            },
            include: {
                issues: true,
            },
        });

        return scan;
    }

    /**
 * Fetches scans:
 * - SECURITY_LEAD / ADMIN sees all company-wide scans!
 * - DESIGNER only sees their own scans.
 */
    static async getUserScans(userId: string, role: string) {
        const isLeadOrAdmin = role === "SECURITY_LEAD" || role === "ADMIN";

        return prisma.scan.findMany({
            where: isLeadOrAdmin ? {} : { userId }, // <-- RBAC in action!
            orderBy: { createdAt: "desc" },
            include: {
                user: {
                    select: { name: true, email: true }, // Display who ran each scan
                },
                _count: {
                    select: { issues: true },
                },
            },
        });
    }

    static async getScanById(scanId: string, userId: string, role: string) {
        const isLeadOrAdmin = role === "SECURITY_LEAD" || role === "ADMIN";

        const scan = await prisma.scan.findFirst({
            where: isLeadOrAdmin ? { id: scanId } : { id: scanId, userId },
            include: {
                user: { select: { name: true, email: true } },
                issues: true,
            },
        });

        if (!scan) {
            const error: any = new Error("Scan not found or access denied");
            error.statusCode = 404;
            throw error;
        }

        return scan;
    }
}