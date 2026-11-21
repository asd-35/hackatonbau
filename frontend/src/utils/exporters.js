import { jsPDF } from "jspdf";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TabStopPosition,
  TabStopType,
  TextRun,
  WidthType,
} from "docx";
import { TEMPLATE_TEXT } from "../data/mockData";
import {
  reportFooterLeft,
  reportHeading,
  reportMetaLine,
  visibleSections,
} from "./documentUtils";

export function triggerDownload(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function pdfSafe(str) {
  return String(str || "")
    .replaceAll("–", "-")
    .replaceAll("—", "-")
    .replaceAll("‘", "'")
    .replaceAll("’", "'")
    .replaceAll("“", '"')
    .replaceAll("”", '"')
    .replaceAll("→", "->")
    .replaceAll("…", "...")
    .replaceAll("•", "-");
}

export function generateReportPdfBlob(doc, photos, includeInternal) {
  const text = TEMPLATE_TEXT[doc.language] || TEMPLATE_TEXT.en;
  const fields = doc.fields || {};
  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 42;
  const contentWidth = pageWidth - margin * 2;
  const bottom = pageHeight - margin - 18;
  let y = margin;

  const ensureSpace = (needed) => {
    if (y + needed > bottom) {
      pdf.addPage();
      y = margin;
    }
  };

  // Title
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.setTextColor(29, 29, 31);
  const titleLines = pdf.splitTextToSize(
    pdfSafe(fields.title || text.report_title),
    contentWidth
  );
  pdf.text(titleLines, margin, y + 14);
  y += titleLines.length * 22 + 4;

  // Meta line
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(85, 85, 85);
  const metaLines = pdf.splitTextToSize(pdfSafe(reportMetaLine(doc)), contentWidth);
  pdf.text(metaLines, margin, y + 8);
  y += metaLines.length * 12 + 12;

  // Heading
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12.5);
  pdf.setTextColor(29, 29, 31);
  const headingLines = pdf.splitTextToSize(pdfSafe(reportHeading(doc)), contentWidth);
  pdf.text(headingLines, margin, y + 11);
  y += headingLines.length * 16 + 4;

  // Summary
  if (fields.summary) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9.5);
    pdf.setTextColor(85, 85, 85);
    const summaryLines = pdf.splitTextToSize(pdfSafe(fields.summary), contentWidth);
    pdf.text(summaryLines, margin, y + 9);
    y += summaryLines.length * 13 + 10;
  }

  // Table
  const leftWidth = contentWidth * 0.25;
  const rightWidth = contentWidth - leftWidth;
  const pad = 6;
  const headerHeight = 20;

  const drawHeader = () => {
    pdf.setFillColor(15, 23, 42);
    pdf.rect(margin, y, contentWidth, headerHeight, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.5);
    pdf.setTextColor(255, 255, 255);
    pdf.text(pdfSafe(text.col_left), margin + pad, y + 13);
    pdf.text(pdfSafe(text.col_right), margin + leftWidth + pad, y + 13);
    y += headerHeight;
  };

  ensureSpace(headerHeight + 36);
  drawHeader();

  for (const [label, body] of visibleSections(doc, includeInternal)) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    const leftLines = pdf.splitTextToSize(pdfSafe(label), leftWidth - pad * 2);
    pdf.setFont("helvetica", "normal");
    const rightLines = pdf.splitTextToSize(pdfSafe(body), rightWidth - pad * 2);
    const rowHeight = Math.max(leftLines.length, rightLines.length) * 12 + pad * 2;

    if (y + rowHeight > bottom) {
      pdf.addPage();
      y = margin;
      drawHeader();
    }

    pdf.setFillColor(241, 245, 249);
    pdf.setDrawColor(203, 213, 225);
    pdf.setLineWidth(0.6);
    pdf.rect(margin, y, leftWidth, rowHeight, "FD");
    pdf.setFillColor(255, 255, 255);
    pdf.rect(margin + leftWidth, y, rightWidth, rowHeight, "FD");

    pdf.setTextColor(29, 29, 31);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text(leftLines, margin + pad, y + pad + 9);

    pdf.setFont("helvetica", "normal");
    pdf.text(rightLines, margin + leftWidth + pad, y + pad + 9);
    y += rowHeight;
  }

  // Photo appendix
  if (photos.length) {
    const gap = 14;
    const colW = (contentWidth - gap) / 2;
    const boxH = 140;

    for (let i = 0; i < photos.length; i += 2) {
      const pair = photos.slice(i, i + 2);
      const needed = (i === 0 ? 30 : 0) + boxH + 42;
      ensureSpace(needed);
      if (i === 0) {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(12.5);
        pdf.setTextColor(29, 29, 31);
        pdf.text(pdfSafe(text.photos), margin, y + 20);
        y += 30;
      }
      pair.forEach((photo, colIdx) => {
        const x = margin + colIdx * (colW + gap);
        let placed = false;
        if (photo.dataUrl) {
          try {
            const imgFormat = photo.dataUrl.startsWith("data:image/png") ? "PNG" : "JPEG";
            pdf.addImage(photo.dataUrl, imgFormat, x, y, colW, boxH, undefined, "FAST");
            placed = true;
          } catch {
            placed = false;
          }
        }
        if (!placed) {
          pdf.setFillColor(226, 232, 240);
          pdf.rect(x, y, colW, boxH, "F");
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(10);
          pdf.setTextColor(85, 85, 85);
          pdf.text(pdfSafe(photo.photoId), x + colW / 2, y + boxH / 2 + 3, { align: "center" });
        }
        pdf.setDrawColor(203, 213, 225);
        pdf.rect(x, y, colW, boxH, "S");

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8.5);
        pdf.setTextColor(29, 29, 31);
        pdf.text(pdfSafe(photo.photoId), x, y + boxH + 12);

        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(85, 85, 85);
        const capLines = pdf.splitTextToSize(pdfSafe(photo.caption), colW);
        pdf.text(capLines.slice(0, 2), x, y + boxH + 23);
      });
      y += boxH + 42;
    }
  }

  // Footers
  const totalPages = pdf.getNumberOfPages();
  const footerLeft = pdfSafe(reportFooterLeft(doc));
  for (let p = 1; p <= totalPages; p += 1) {
    pdf.setPage(p);
    const baseline = pageHeight - margin + 6;
    pdf.setDrawColor(203, 213, 225);
    pdf.setLineWidth(0.5);
    pdf.line(margin, baseline - 10, pageWidth - margin, baseline - 10);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(85, 85, 85);
    pdf.text(footerLeft, margin, baseline);
    const pageLabel = text.page.replace("{page}", String(p)).replace("{pages}", String(totalPages));
    pdf.text(pageLabel, pageWidth - margin, baseline, { align: "right" });
  }

  return pdf.output("blob");
}

export async function generateReportDocxBlob(doc, photos, includeInternal) {
  const text = TEMPLATE_TEXT[doc.language] || TEMPLATE_TEXT.en;
  const fields = doc.fields || {};
  const borderStyle = {
    style: BorderStyle.SINGLE,
    size: 4,
    color: "CBD5E1",
  };
  const cellBorders = {
    top: borderStyle,
    bottom: borderStyle,
    left: borderStyle,
    right: borderStyle,
  };

  const rows = [
    new TableRow({
      tableHeader: true,
      cantSplit: true,
      children: [
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: "0F172A" },
          borders: cellBorders,
          children: [
            new Paragraph({
              children: [new TextRun({ text: text.col_left, bold: true, size: 15, color: "FFFFFF" })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 75, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: "0F172A" },
          borders: cellBorders,
          children: [
            new Paragraph({
              children: [new TextRun({ text: text.col_right, bold: true, size: 15, color: "FFFFFF" })],
            }),
          ],
        }),
      ],
    }),
    ...visibleSections(doc, includeInternal).map(
      ([label, body]) =>
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              width: { size: 25, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.CLEAR, fill: "F1F5F9" },
              borders: cellBorders,
              children: [
                new Paragraph({
                  children: [new TextRun({ text: label, bold: true, size: 18, color: "1D1D1F" })],
                }),
              ],
            }),
            new TableCell({
              width: { size: 75, type: WidthType.PERCENTAGE },
              borders: cellBorders,
              children: body.split("\n").map(
                (line) =>
                  new Paragraph({
                    children: [new TextRun({ text: line, size: 18, color: "1D1D1F" })],
                  })
              ),
            }),
          ],
        })
    ),
  ];

  const children = [
    new Paragraph({
      children: [
        new TextRun({
          text: fields.title || text.report_title,
          bold: true,
          size: 36,
          color: "1D1D1F",
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun({ text: reportMetaLine(doc), size: 16, color: "555555" })],
    }),
    new Paragraph({
      spacing: { after: 80 },
      children: [new TextRun({ text: reportHeading(doc), bold: true, size: 25, color: "1D1D1F" })],
    }),
  ];

  if (fields.summary) {
    children.push(
      new Paragraph({
        spacing: { after: 180 },
        children: [new TextRun({ text: fields.summary, size: 19, color: "555555" })],
      })
    );
  }

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows,
    })
  );

  if (photos.length) {
    children.push(
      new Paragraph({
        spacing: { before: 300, after: 120 },
        children: [new TextRun({ text: text.photos, bold: true, size: 25, color: "1D1D1F" })],
      })
    );
    for (const photo of photos) {
      children.push(
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({ text: `${photo.photoId}: `, bold: true, size: 18, color: "1D1D1F" }),
            new TextRun({ text: photo.caption || "", size: 18, color: "555555" }),
          ],
        })
      );
    }
  }

  const wordDoc = new Document({
    sections: [
      {
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
                children: [
                  new TextRun({ text: `${reportFooterLeft(doc)}\t`, size: 14, color: "555555" }),
                  new TextRun({ children: ["Page ", PageNumber.CURRENT, " / ", PageNumber.TOTAL_PAGES], size: 14, color: "555555" }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return Packer.toBlob(wordDoc);
}
