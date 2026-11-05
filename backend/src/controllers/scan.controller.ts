import { Request, Response, NextFunction } from "express";
import { ScanService } from "../services/scan.service";

export class ScanController {
    static async createScan(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const scan = await ScanService.executeScan(userId, req.body);

            res.status(201).json({
                success: true,
                message: "Scan completed successfully",
                data: { scan },
            });
        } catch (error) {
            next(error);
        }
    }

    static async listScans(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const scans = await ScanService.getUserScans(userId);

            res.status(200).json({
                success: true,
                data: { scans },
            });
        } catch (error) {
            next(error);
        }
    }

    static async getScan(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const scanId = req.params.id as string; // <-- Safely assert as string

            const scan = await ScanService.getScanById(scanId, userId);

            res.status(200).json({
                success: true,
                data: { scan },
            });
        } catch (error) {
            next(error);
        }
    }
}