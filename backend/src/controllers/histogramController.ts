import type { Request, Response } from "express";
import * as histogramService from "../services/histogramService";

export async function getHistogram(_req: Request, res: Response): Promise<void> {
  const histogramData = await histogramService.getHistogramData();
  
  res.json(histogramData);
}