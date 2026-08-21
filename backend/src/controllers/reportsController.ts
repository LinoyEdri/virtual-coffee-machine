import type { Request, Response } from "express";
import { monthlyReportQuerySchema } from "../dtos/order.dto";
import * as reportsService from "../services/reportsService";

export async function getMonthlyReport(req: Request, res: Response): Promise<void> {
    const { year, month } = monthlyReportQuerySchema.parse(req.query);

    const buffer = await reportsService.generateMonthlyReport(year, month);

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=coffee-report-${year}-${String(month).padStart(2, '0')}.xlsx`);
    
    res.send(buffer);
} 