import ExcelJS from "exceljs";
import { env } from "../config/env";
import * as ordersRepository from "../repositories/ordersRepository";

/**
 * Reports Service (requirement 4.1.6, and "Reports Service" in the
 * section 2 architecture diagram).
 *
 * Takes the orders for a month and turns them into an .xlsx workbook.
 *
 * It returns a Buffer rather than writing to `res`: services never touch
 * Express objects, which is what allows this to be unit-tested as
 * "given these orders, produce a valid file" with no HTTP involved.
 */

/** Columns of the report, in order. `key` matches the row object below. */
const COLUMNS: ExcelJS.Column[] = [
  { header: "ID", key: "id", width: 8 },
  { header: "Name", key: "name", width: 24 },
  { header: "Title", key: "title", width: 12 },
  { header: "Delay (minutes)", key: "delayMinutes", width: 16 },
  { header: "Status", key: "status", width: 12 },
  { header: "Ordered at", key: "createdAt", width: 20 },
  { header: "Scheduled for", key: "scheduledFor", width: 20 },
  { header: "Started at", key: "startedAt", width: 20 },
  { header: "Completed at", key: "completedAt", width: 20 },
] as ExcelJS.Column[];

/** Excel's display format for the four date columns. */
const DATE_FORMAT = "dd/mm/yyyy hh:mm:ss";

/**
 * Rebases an instant so that its UTC fields hold the wall-clock reading
 * of the configured report timezone.
 *
 * Excel date cells have NO timezone - a cell stores "this many days
 * since 1900" and renders it as-is. Writing the raw instant would make
 * Excel display UTC, so an order placed at 09:00 in Israel would read
 * 06:00 in the report.
 *
 * Intl.DateTimeFormat knows every IANA zone including daylight saving,
 * so it is used to read the wall-clock parts, which are then rebuilt as
 * a Date. The result is meaningless as an instant, but correct as the
 * number Excel is about to display - which is the only thing it is for.
 */
function toSpreadsheetDate(date: Date | null): Date | null {
  if (!date) {
    return null;
  }

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: env.reportTimezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const part = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);

  return new Date(
    Date.UTC(
      part("year"),
      part("month") - 1, // Date months are 0-based, the formatter is not
      part("day"),
      part("hour"),
      part("minute"),
      part("second"),
    ),
  );
}

/**
 * Builds the monthly report.
 *
 * A month with no orders still produces a valid workbook containing just
 * the header row: the month exists, it is simply empty, and an empty
 * spreadsheet is a meaningful answer.
 */
export async function generateMonthlyReport(
  year: number,
  month: number,
): Promise<Buffer> {
  const orders = await ordersRepository.findByMonth(year, month);

  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();

  // Sheet names are limited to 31 characters and cannot contain : \ / ? * [ ]
  const sheet = workbook.addWorksheet(
    `Orders ${String(year)}-${String(month).padStart(2, "0")}`,
  );

  sheet.columns = COLUMNS;

  // Bold the header and freeze it, so it stays visible while scrolling.
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  for (const order of orders) {
    sheet.addRow({
      id: order.id,
      name: order.name,
      title: order.title,
      delayMinutes: order.delayMinutes,
      status: order.status,
      createdAt: toSpreadsheetDate(order.createdAt),
      scheduledFor: toSpreadsheetDate(order.scheduledFor),
      startedAt: toSpreadsheetDate(order.startedAt),
      completedAt: toSpreadsheetDate(order.completedAt),
    });
  }

  // Applied after the rows exist. These are real date cells, not text,
  // so Excel can sort and filter them; numFmt only controls display.
  for (const key of ["createdAt", "scheduledFor", "startedAt", "completedAt"]) {
    sheet.getColumn(key).numFmt = DATE_FORMAT;
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return Buffer.from(buffer);
}
