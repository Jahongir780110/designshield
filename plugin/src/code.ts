// 1. Launch the Plugin UI floating window (450px width by 600px height)
figma.showUI(__html__, { width: 450, height: 600, themeColors: true });

/**
 * Recursively traverses Figma SceneNodes and serializes them into our clean FigmaNode DTO
 */
function serializeNode(node: SceneNode): any {
    const serialized: any = {
        id: node.id,
        name: node.name,
        type: node.type,
        visible: node.visible,
        opacity: "opacity" in node ? node.opacity : 1,
    };

    // If the layer is a text node, extract its text content
    if (node.type === "TEXT") {
        serialized.characters = node.characters;
    }

    // If the node contains children (Frame, Group, Component, Instance)
    if ("children" in node && node.children.length > 0) {
        serialized.children = node.children.map((child) => serializeNode(child));
    }

    return serialized;
}

/**
 * Collects nodes to scan: either the designer's current selection, or the entire active page
 */
function getCanvasNodesToScan() {
    const selection = figma.currentPage.selection;

    // If the designer selected specific frames/components, scan only those
    if (selection.length > 0) {
        return selection.map((node) => serializeNode(node));
    }

    // Otherwise, scan all top-level layers on the active page
    return figma.currentPage.children.map((node) => serializeNode(node));
}

// 2. Listen for messages sent from the Vue 3 UI Iframe
figma.ui.onmessage = async (msg: { type: string; payload?: any }) => {
    // A. UI requests canvas nodes to start an audit
    if (msg.type === "REQUEST_SCAN_NODES") {
        const nodes = getCanvasNodesToScan();

        figma.ui.postMessage({
            type: "CANVAS_NODES_PAYLOAD",
            payload: {
                figmaFileKey: figma.fileKey || "local-draft-file",
                figmaFileName: figma.root.name || "Untitled Design",
                nodes,
            },
        });
    }

    // B. UI requests to focus/zoom to a specific node on canvas
    if (msg.type === "FOCUS_NODE") {
        const node = figma.getNodeById(msg.payload.nodeId);
        if (node && "visible" in node) {
            figma.currentPage.selection = [node as SceneNode];
            figma.viewport.scrollAndZoomIntoView([node as SceneNode]);
        }
    }

    // C. UI requests in-place canvas mutation (Applying an approved fix!)
    if (msg.type === "APPLY_FIX") {
        const { nodeId, replacementText } = msg.payload;
        const node = figma.getNodeById(nodeId);

        if (node && node.type === "TEXT" && replacementText) {
            try {
                // Critical: In Figma, you MUST load fonts before modifying characters!
                await Promise.all(
                    node
                        .getRangeAllFontNames(0, node.characters.length)
                        .map(figma.loadFontAsync)
                );

                // Mutate the canvas node text in-place!
                node.characters = replacementText;

                figma.notify(`🛡️ DesignShield: Fix applied to "${node.name}"!`);

                // Notify the UI that the fix was applied successfully
                figma.ui.postMessage({
                    type: "FIX_APPLIED_SUCCESS",
                    payload: { nodeId },
                });
            } catch (error) {
                figma.notify(`❌ Failed to apply fix: ${error}`, { error: true });
            }
        }
    }
};