import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { FinalizedInvoice } from "./domain";
import { formatRupiah } from "./domain";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 46;
const GREEN = rgb(0.03, 0.45, 0.29);
const DEEP_GREEN = rgb(0.025, 0.30, 0.21);
const ORANGE = rgb(0.91, 0.54, 0.11);
const RED = rgb(0.71, 0.24, 0.21);
const DARK = rgb(0.09, 0.20, 0.16);
const MUTED = rgb(0.37, 0.44, 0.40);
const LIGHT = rgb(0.94, 0.95, 0.91);
const CREAM = rgb(0.99, 0.98, 0.95);

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
  page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 124, width: PAGE_WIDTH, height: 124, color: CREAM });
  page.drawSvgPath("M2 68C12 22 71 4 126 18C166 28 176 55 165 80C153 107 104 116 59 104C24 95 5 80 2 68", { x: MARGIN, y: PAGE_HEIGHT - 23, scale: .43, borderColor: GREEN, borderWidth: 5 });
  page.drawSvgPath("M39 99L70 23L92 23C112 23 124 34 119 50C114 66 97 72 79 71L103 98M60 62L82 62C94 62 102 58 105 49", { x: MARGIN + 12, y: PAGE_HEIGHT - 15, scale: .43, borderColor: GREEN, borderWidth: 5 });
  page.drawCircle({ x: MARGIN + 76, y: PAGE_HEIGHT - 58, size: 5, color: ORANGE });
  page.drawText("RIA", { x: MARGIN + 87, y: PAGE_HEIGHT - 57, size: 15, font: bold, color: ORANGE });
  page.drawText("NOEL SHOP", { x: MARGIN + 87, y: PAGE_HEIGHT - 74, size: 8, font: bold, color: RED });
  page.drawText("PILIHAN BAIK, DIBUNGKUS RAPI", { x: MARGIN, y: PAGE_HEIGHT - 105, size: 6.8, font: bold, color: MUTED });
  page.drawRectangle({ x: 329, y: PAGE_HEIGHT - 94, width: 220, height: 66, color: DEEP_GREEN });
  page.drawRectangle({ x: 329, y: PAGE_HEIGHT - 101, width: 68, height: 7, color: ORANGE });
  page.drawText("NOTA PENJUALAN", { x: 349, y: PAGE_HEIGHT - 55, size: 17, font: bold, color: rgb(1, 1, 1) });
  page.drawText(invoice.invoiceNumber, { x: 349, y: PAGE_HEIGHT - 75, size: 9, font: regular, color: rgb(.88, .94, .90) });
  return PAGE_HEIGHT - 150;
}

function drawTableHeader(page: PDFPage, bold: PDFFont, y: number): number {
  page.drawRectangle({ x: MARGIN, y: y - 24, width: PAGE_WIDTH - MARGIN * 2, height: 28, color: DEEP_GREEN });
  page.drawText("BARANG", { x: MARGIN + 10, y: y - 15, size: 8.5, font: bold, color: rgb(1,1,1) });
  page.drawText("QTY", { x: 320, y: y - 15, size: 8.5, font: bold, color: rgb(1,1,1) });
  page.drawText("HARGA", { x: 376, y: y - 15, size: 8.5, font: bold, color: rgb(1,1,1) });
  page.drawText("TOTAL", { x: 474, y: y - 15, size: 8.5, font: bold, color: rgb(1,1,1) });
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
  page.drawRectangle({ x: MARGIN, y: y - 56, width: PAGE_WIDTH - MARGIN * 2, height: 70, color: LIGHT });
  page.drawRectangle({ x: MARGIN, y: y - 56, width: 5, height: 70, color: ORANGE });
  page.drawText("DITUJUKAN KEPADA", { x: MARGIN + 18, y: y - 5, size: 7, font: bold, color: GREEN });
  page.drawText(safeText(invoice.customer.name), { x: MARGIN + 18, y: y - 26, size: 15, font: bold, color: DARK });
  page.drawText("Tanggal", { x: 382, y: y - 5, size: 8, font: bold, color: MUTED });
  page.drawText(invoice.invoiceDate.split("-").reverse().join("/"), { x: 432, y: y - 5, size: 8, font: regular, color: DARK });
  y -= 46;
  y -= 18;
  if (invoice.customer.whatsapp) {
    page.drawText(`WhatsApp  ${safeText(invoice.customer.whatsapp)}`, { x: MARGIN + 18, y: y + 17, size: 8, font: regular, color: MUTED });
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
  page.drawLine({ start: { x: MARGIN, y: y + 8 }, end: { x: PAGE_WIDTH - MARGIN, y: y + 8 }, thickness: 1, color: ORANGE });
  page.drawText("TERIMA KASIH", { x: MARGIN, y: y - 10, size: 12, font: bold, color: GREEN });
  page.drawText("Semoga pesanan ini membawa manfaat. Sampai jumpa kembali di Ria Noel Shop.", { x: MARGIN, y: y - 27, size: 8.5, font: regular, color: MUTED });
  page.drawText("Ria Noel Shop", { x: PAGE_WIDTH - MARGIN - 83, y: y - 10, size: 10, font: bold, color: DARK });
  page.drawSvgPath("M0 18C90 5 180 25 290 11C390 -2 455 6 520 20", { x: 0, y: 10, borderColor: GREEN, borderWidth: 16 });
  page.drawSvgPath("M0 8C120 23 225 2 340 14C420 23 490 16 560 5", { x: 0, y: 4, borderColor: ORANGE, borderWidth: 7 });

  return pdf.save({ useObjectStreams: false, addDefaultPage: false, objectsPerTick: 50 });
}

export function invoicePdfFilename(invoiceNumber: string): string {
  return `RiaNoelShop_${invoiceNumber}.pdf`;
}
