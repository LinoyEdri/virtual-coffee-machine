import * as ordersRepository from '../repositories/ordersRepository';

export interface HistogramData {
  labels: string[];
  data: number[];
}

export async function getHistogramData(): Promise<HistogramData> {
  const rows = await ordersRepository.countOrdersByName();
  return {
    labels: rows.map((row) => row.name),
    data: rows.map((row) => row.count)
  };
}