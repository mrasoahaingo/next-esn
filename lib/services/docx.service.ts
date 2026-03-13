import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
import type { ExtractedCV } from './ai.service';

const HIMEO_BLUE = "1E40AF";
const HIMEO_DARK_BLUE = "1E3A8A";
const TEXT_GRAY = "374151";

export async function generateHimeoDocx(data: ExtractedCV): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Header / Logo Section
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: "HIMEO",
                bold: true,
                color: HIMEO_BLUE,
                size: 32,
              }),
            ],
          }),
          new Paragraph({ spacing: { after: 400 } }),

          // Candidate Name and Title
          new Paragraph({
            alignment: AlignmentType.CENTER,
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({
                text: `${data.personalInfo.firstName} ${data.personalInfo.lastName}`.toUpperCase(),
                bold: true,
                color: HIMEO_DARK_BLUE,
                size: 48,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: data.personalInfo.title,
                bold: true,
                color: HIMEO_BLUE,
                size: 32,
              }),
            ],
          }),
          new Paragraph({ spacing: { after: 800 } }),

          // Strengths Section (Synthèse)
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [
              new TextRun({
                text: "SYNTHÈSE",
                bold: true,
                color: HIMEO_BLUE,
                underline: {},
              }),
            ],
          }),
          ...data.strengths.map(strength => new Paragraph({
            bullet: { level: 0 },
            children: [new TextRun({ text: strength, size: 22 })],
            spacing: { before: 100 },
          })),
          new Paragraph({ spacing: { after: 400 } }),

          // Professional Summary
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [
              new TextRun({
                text: "RÉSUMÉ PROFESSIONNEL",
                bold: true,
                color: HIMEO_BLUE,
                underline: {},
              }),
            ],
          }),
          new Paragraph({
            children: [new TextRun({ text: data.summary, size: 22 })],
            spacing: { before: 200, after: 400 },
          }),

          // Technical Skills
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [
              new TextRun({
                text: "COMPÉTENCES TECHNIQUES",
                bold: true,
                color: HIMEO_BLUE,
                underline: {},
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: data.skills.join(" • "),
                size: 22,
                bold: true,
              }),
            ],
            spacing: { before: 200, after: 400 },
          }),

          // Experiences
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [
              new TextRun({
                text: "EXPÉRIENCES PROFESSIONNELLES",
                bold: true,
                color: HIMEO_BLUE,
                underline: {},
              }),
            ],
          }),
          ...data.experiences.flatMap(exp => [
            new Paragraph({
              spacing: { before: 300 },
              children: [
                new TextRun({
                  text: `${exp.role} @ ${exp.company}`,
                  bold: true,
                  size: 24,
                  color: HIMEO_DARK_BLUE,
                }),
                new TextRun({
                  text: `  (${exp.startDate} - ${exp.endDate || 'Présent'})`,
                  italics: true,
                  size: 20,
                }),
              ],
            }),
            ...exp.description.map(mission => new Paragraph({
              bullet: { level: 0 },
              children: [new TextRun({ text: mission, size: 20 })],
              spacing: { before: 100 },
            })),
          ]),

          // Education
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400 },
            children: [
              new TextRun({
                text: "FORMATIONS",
                bold: true,
                color: HIMEO_BLUE,
                underline: {},
              }),
            ],
          }),
          ...data.education.map(edu => new Paragraph({
            children: [
              new TextRun({
                text: `${edu.degree} - ${edu.school} (${edu.year})`,
                size: 22,
              }),
            ],
            spacing: { before: 100 },
          })),
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
