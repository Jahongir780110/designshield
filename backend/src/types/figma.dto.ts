import { z } from "zod";

// Common Figma Node Types we care about inspecting
export const FigmaNodeType = z.enum([
    "DOCUMENT",
    "PAGE",
    "FRAME",
    "GROUP",
    "SECTION",
    "COMPONENT",
    "INSTANCE",
    "TEXT",
    "RECTANGLE",
    "VECTOR",
]);

export type FigmaNodeType = z.infer<typeof FigmaNodeType>;

/**
 * A recursive representation of a node in the Figma Scene Graph.
 * A frame or group can have child nodes, forming a tree.
 */
export interface FigmaNode {
    id: string;                    // Figma canvas node ID (e.g., "12:34")
    name: string;                  // Layer name given by designer (e.g., "password_input")
    type: string;                  // e.g., "TEXT", "FRAME", "INSTANCE"
    characters?: string;           // Text content if the node is a TEXT layer
    visible?: boolean;             // Whether the layer is hidden or visible
    opacity?: number;              // 0 to 1
    children?: FigmaNode[];        // Recursive child nodes (frames inside frames)
}

// Zod Schema for validating incoming FigmaNode trees recursively
export const figmaNodeSchema: z.ZodType<FigmaNode> = z.lazy(() =>
    z.object({
        id: z.string().min(1, "Node ID is required"),
        name: z.string().min(1, "Node name is required"),
        type: z.string(),
        characters: z.string().optional(),
        visible: z.boolean().optional().default(true),
        opacity: z.number().optional().default(1),
        children: z.array(figmaNodeSchema).optional(),
    })
);

// Payload sent by the Figma plugin when triggering an audit
export const createScanSchema = z.object({
    body: z.object({
        figmaFileKey: z.string().min(1, "Figma file key is required"),
        figmaFileName: z.string().min(1, "Figma file name is required"),
        nodes: z.array(figmaNodeSchema).min(1, "At least one node must be scanned"),
    }),
});

export type CreateScanInput = z.infer<typeof createScanSchema>["body"];