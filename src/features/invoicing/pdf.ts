import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { FinalizedInvoice } from "./domain";
import { formatRupiah } from "./domain";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 46;
const GREEN = rgb(0.03, 0.38, 0.22);
const ORANGE = rgb(0.93, 0.49, 0.09);
const DARK = rgb(0.09, 0.13, 0.11);
const MUTED = rgb(0.36, 0.41, 0.38);
const LIGHT = rgb(0.91, 0.94, 0.92);

function safeText(value: string): string {
  return value.normalize("NFKD").replace(/[^\x20-\x7E]/gu, "?");
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = safeText(text).split(/\s+/u);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      if (font.widthOfTextAtSize(word, size) <= maxWidth) {
        line = word;
      } else {
        let part = "";
        for (const character of word) {
          if (font.widthOfTextAtSize(part + character, size) > maxWidth && part) {
            lines.push(part);
            part = character;
          } else part += character;
        }
        line = part;
      }
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function drawHeader(page: PDFPage, regular: PDFFont, bold: PDFFont, invoice: FinalizedInvoice): number {
  page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 108, width: PAGE_WIDTH, height: 108, color: GREEN });
  page.drawRectangle({ x: MARGIN, y: PAGE_HEIGHT - 73, width: 34, height: 34, color: ORANGE });
  page.drawText("R", { x: MARGIN + 10, y: PAGE_HEIGHT - 64, size: 18, font: bold, color: rgb(1, 1, 1) });
  page.drawText("RIA NOEL SHOP", { x: MARGIN + 44, y: PAGE_HEIGHT - 52, size: 16, font: bold, color: rgb(1, 1, 1) });
  page.drawText("NOTA PENJUALAN", { x: PAGE_WIDTH - MARGIN - 156, y: PAGE_HEIGHT - 54, size: 14, font: bold, color: rgb(1, 1, 1) });
  page.drawText(invoice.invoiceNumber, { x: PAGE_WIDTH - MARGIN - 156, y: PAGE_HEIGHT - 74, size: 10, font: regular, color: rgb(1, 1, 1) });
  return PAGE_HEIGHT - 136;
}

function drawTableHeader(page: PDFPage, bold: PDFFont, y: number): number {
  page.drawRectangle({ x: MARGIN, y: y - 22, width: PAGE_WIDTH - MARGIN * 2, height: 26, color: LIGHT });
  page.drawText("BARANG", { x: MARGIN + 8, y: y - 14, size: 9, font: bold, color: DARK });
  page.drawText("QTY", { x: 320, y: y - 14, size: 9, font: bold, color: DARK });
  page.drawText("HARGA", { x: 376, y: y - 14, size: 9, font: bold, color: DARK });
  page.drawText("TOTAL", { x: 474, y: y - 14, size: 9, font: bold, color: DARK });
  return y - 34;
}

function drawRight(page: PDFPage, text: string, right: number, y: number, size: number, font: PDFFont, color = DARK) {
  page.drawText(text, { x: right - font.widthOfTextAtSize(text, size), y, size, font, color });
}

export async function generateInvoicePdf(invoice: FinalizedInvoice): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fixedDate = new Date(invoice.createdAt);
  pdf.setTitle(`Nota ${invoice.invoiceNumber}`);
  pdf.setAuthor("Ria Noel Shop");
  pdf.setCreator("Ria Noel Shop");
  pdf.setProducer("Ria Noel Shop");
  pdf.setCreationDate(fixedDate);
  pdf.setModificationDate(fixedDate);

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = drawHeader(page, regular, bold, invoice);
  page.drawText("Tanggal", { x: MARGIN, y, size: 10, font: bold, color: MUTED });
  page.drawText(invoice.invoiceDate.split("-").reverse().join("/"), { x: MARGIN + 76, y, size: 10, font: regular, color: DARK });
  y -= 19;
  page.drawText("Customer", { x: MARGIN, y, size: 10, font: bold, color: MUTED });
  page.drawText(safeText(invoice.customer.name), { x: MARGIN + 76, y, size: 10, font: regular, color: DARK });
  y -= 18;
  if (invoice.customer.whatsapp) {
    page.drawText("WhatsApp", { x: MARGIN, y, size: 10, font: bold, color: MUTED });
    page.drawText(safeText(invoice.customer.whatsapp), { x: MARGIN + 76, y, size: 10, font: regular, color: DARK });
    y -= 18;
  }
  y = drawTableHeader(page, bold, y - 9);

  for (const item of invoice.items) {
    const title = item.variant ? `${item.productName} - ${item.variant}` : item.productName;
    const lines = wrapText(title, regular, 10, 244);
    const height = Math.max(35, lines.length * 13 + 13);
    if (y - height < 120) {
      page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = drawTableHeader(page, bold, drawHeader(page, regular, bold, invoice) - 4);
    }
    lines.forEach((line, index) => page.drawText(line, { x: MARGIN + 8, y: y - index * 13, size: 10, font: regular, color: DARK }));
    page.drawText(`${item.quantity} ${safeText(item.unitLabel)}`, { x: 320, y, size: 9, font: regular, color: DARK });
    drawRight(page, formatRupiah(item.unitPriceRupiah), 456, y, 9, regular);
    drawRight(page, formatRupiah(item.lineTotalRupiah), PAGE_WIDTH - MARGIN - 8, y, 9, bold);
    y -= height;
    page.drawLine({ start: { x: MARGIN, y: y + 8 }, end: { x: PAGE_WIDTH - MARGIN, y: y + 8 }, thickness: 0.7, color: LIGHT });
  }

  const summaryHeight = 142 + (invoice.discountRupiah > 0 ? 18 : 0) + (invoice.shippingRupiah > 0 ? 18 : 0);
  if (y - summaryHeight < 46) {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = drawHeader(page, regular, bold, invoice) - 12;
  }
  const labelX = 360;
  page.drawText("Subtotal", { x: labelX, y, size: 10, font: regular, color: MUTED });
  drawRight(page, formatRupiah(invoice.subtotalRupiah), PAGE_WIDTH - MARGIN, y, 10, regular);
  y -= 18;
  if (invoice.discountRupiah > 0) {
    page.drawText("Diskon", { x: labelX, y, size: 10, font: regular, color: MUTED });
    drawRight(page, `-${formatRupiah(invoice.discountRupiah)}`, PAGE_WIDTH - MARGIN, y, 10, regular);
    y -= 18;
  }
  if (invoice.shippingRupiah > 0) {
    page.drawText("Ongkir", { x: labelX, y, size: 10, font: regular, color: MUTED });
    drawRight(page, formatRupiah(invoice.shippingRupiah), PAGE_WIDTH - MARGIN, y, 10, regular);
    y -= 18;
  }
  page.drawLine({ start: { x: labelX, y: y + 8 }, end: { x: PAGE_WIDTH - MARGIN, y: y + 8 }, thickness: 1, color: GREEN });
  page.drawText("TOTAL", { x: labelX, y: y - 10, size: 13, font: bold, color: GREEN });
  drawRight(page, formatRupiah(invoice.grandTotalRupiah), PAGE_WIDTH - MARGIN, y - 10, 13, bold, GREEN);
  y -= 50;
  page.drawText("Terbilang", { x: MARGIN, y, size: 9, font: bold, color: MUTED });
  const wordLines = wrapText(invoice.amountInWords, regular, 10, PAGE_WIDTH - MARGIN * 2);
  wordLines.forEach((line, index) => page.drawText(line, { x: MARGIN, y: y - 16 - index * 13, size: 10, font: regular, color: DARK }));
  y -= 28 + wordLines.length * 13;
  page.drawText("Terima kasih telah berbelanja di Ria Noel Shop.", { x: MARGIN, y, size: 10, font: bold, color: GREEN });

  return pdf.save({ useObjectStreams: false, addDefaultPage: false, objectsPerTick: 50 });
}

export function invoicePdfFilename(invoiceNumber: string): string {
  return `RiaNoelShop_${invoiceNumber}.pdf`;
}
