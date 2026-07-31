import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Expense, Income } from "./types";
import { formatDate, formatMoney } from "./format";

type Transaction = Expense | Income;

function csvCell(value: string | number): string {
  const str = String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const COLUMNS = ["Description", "Category", "Date", "Amount", "Currency", "Amount (base)", "Notes"];

function toRow(e: Transaction): (string | number)[] {
  return [
    e.description,
    e.category.name,
    formatDate(e.date),
    e.amount,
    e.currency,
    Number(e.amountBase.toFixed(2)),
    e.notes ?? "",
  ];
}

export function exportTransactionsToCsv(items: Transaction[], filename = "export.csv") {
  const rows = [COLUMNS, ...items.map(toRow)];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  // BOM so Excel detects UTF-8 correctly
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, filename);
}

export function exportTransactionsToPdf(
  items: Transaction[],
  baseCurrency: string,
  title: string,
  filename = "export.pdf"
) {
  const doc = new jsPDF();
  const total = items.reduce((sum, e) => sum + e.amountBase, 0);

  doc.setFontSize(16);
  doc.text(`ExpenseTrac — ${title}`, 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`Generated ${new Date().toLocaleDateString("en-US", { dateStyle: "long" })}`, 14, 25);
  doc.text(`${items.length} transactions · Total ${formatMoney(total, baseCurrency)}`, 14, 31);

  autoTable(doc, {
    startY: 38,
    head: [["Description", "Category", "Date", "Amount", "Notes"]],
    body: items.map((e) => [
      e.description,
      e.category.name,
      formatDate(e.date),
      formatMoney(e.amount, e.currency),
      e.notes ?? "",
    ]),
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [42, 120, 214], textColor: 255 },
    alternateRowStyles: { fillColor: [249, 249, 247] },
    columnStyles: { 3: { halign: "right" } },
  });

  doc.save(filename);
}
