import type { Spec } from '@json-render/core';
import type { ExtractedCV, TemplateConfig } from '@/lib/schema';
import { DEFAULT_TEMPLATE_CONFIG } from '@/lib/schema';

/** Variantes de marque pour la même trame « dossier de compétences » (Himeo vs Esneo). */
export type CvDossierLayoutVariant = {
  docTitle: string;
  documentSubject: string;
  experienceBadgeBgColor: string;
  /** Sans `logo.url` dans le template : composant Himeo SVG vs texte Esneo */
  headerLogoFallback: 'himeo' | 'esneo';
};

export const HIMEO_DOSSIER_VARIANT: CvDossierLayoutVariant = {
  docTitle: 'DOSSIER DE COMPÉTENCES TECHNIQUES',
  documentSubject: 'Dossier de compétences techniques',
  experienceBadgeBgColor: '#deeeff',
  headerLogoFallback: 'himeo',
};

export const ESNEO_DOSSIER_VARIANT: CvDossierLayoutVariant = {
  docTitle: 'DOSSIER DE COMPÉTENCES TECHNIQUES',
  documentSubject: 'Dossier de compétences techniques',
  experienceBadgeBgColor: '#ede9fe',
  headerLogoFallback: 'esneo',
};

// ─── Helpers ────────────────────────────────────────────────────

function addSectionHeading(
  elements: Spec['elements'],
  id: string,
  text: string,
  children: string[],
  primaryColor: string,
  secondaryColor: string,
) {
  elements[`${id}-container`] = {
    type: 'View',
    props: {
      padding: null, paddingTop: null, paddingBottom: 8, paddingLeft: null, paddingRight: null,
      margin: null, backgroundColor: null,
      borderWidth: null, borderColor: null, borderRadius: null,
      flex: null, alignItems: null, justifyContent: null,
    },
    children: [`${id}-heading`, `${id}-line`],
  };
  elements[`${id}-heading`] = {
    type: 'Text',
    props: {
      text: text.toUpperCase(),
      fontSize: 10,
      color: primaryColor,
      fontWeight: 'bold',
      fontStyle: null,
      align: null,
      lineHeight: null,
    },
    children: [],
  };
  elements[`${id}-line`] = {
    type: 'Divider',
    props: { color: secondaryColor, thickness: 1.5, marginTop: 4, marginBottom: 0 },
    children: [],
  };
  children.push(`${id}-container`);
}

function addInfoTable(
  elements: Spec['elements'],
  id: string,
  rows: { label: string; value: string }[],
  children: string[],
  colors: TemplateConfig['colors'],
) {
  if (rows.length === 0) return;

  const tableChildren: string[] = [];
  rows.forEach((row, i) => {
    elements[`${id}-row-${i}`] = {
      type: 'Row',
      props: {
        justifyContent: null, alignItems: 'flex-start',
        gap: 12, padding: null, flex: null, wrap: null,
      },
      children: [`${id}-labelcol-${i}`, `${id}-valuecol-${i}`],
    };
    elements[`${id}-labelcol-${i}`] = {
      type: 'Column',
      props: {
        gap: null, alignItems: null, justifyContent: 'center',
        padding: null, flex: 0.2,
      },
      children: [`${id}-label-${i}`],
    };
    elements[`${id}-valuecol-${i}`] = {
      type: 'Column',
      props: {
        gap: null, alignItems: null, justifyContent: 'center',
        padding: null, flex: 0.8,
      },
      children: [`${id}-value-${i}`],
    };
    elements[`${id}-rowwrap-${i}`] = {
      type: 'View',
      props: {
        padding: null, paddingTop: 7, paddingBottom: 7, paddingLeft: 14, paddingRight: 14,
        margin: null, backgroundColor: i % 2 === 0 ? '#F8FAFC' : null,
        borderWidth: null, borderColor: null, borderRadius: null,
        flex: null, alignItems: null, justifyContent: null,
      },
      children: [`${id}-row-${i}`],
    };
    elements[`${id}-label-${i}`] = {
      type: 'Text',
      props: { text: row.label, fontSize: 8, color: colors.primary, fontWeight: 'bold', fontStyle: null, align: null, lineHeight: null },
      children: [],
    };
    elements[`${id}-value-${i}`] = {
      type: 'Text',
      props: { text: row.value, fontSize: 9, color: colors.text, fontWeight: null, fontStyle: null, align: null, lineHeight: 1.5 },
      children: [],
    };
    tableChildren.push(`${id}-rowwrap-${i}`);

    if (i < rows.length - 1) {
      elements[`${id}-div-${i}`] = {
        type: 'Divider',
        props: { color: '#E2E8F0', thickness: 0.5, marginTop: 0, marginBottom: 0 },
        children: [],
      };
      tableChildren.push(`${id}-div-${i}`);
    }
  });

  elements[`${id}-table`] = {
    type: 'View',
    props: {
      padding: null, paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0,
      margin: null, backgroundColor: null,
      borderWidth: 0.5, borderColor: '#E2E8F0', borderRadius: 6,
      flex: null, alignItems: null, justifyContent: null,
    },
    children: tableChildren,
  };
  children.push(`${id}-table`);
}

type SectionBuilder = (
  elements: Spec['elements'],
  pageChildren: string[],
  data: Partial<ExtractedCV>,
  colors: TemplateConfig['colors'],
) => void;

function createSectionBuilders(variant: CvDossierLayoutVariant): Record<string, SectionBuilder> {
  return {
    summary(elements, pageChildren, data, colors) {
      if (!data.summary) return;
      addSectionHeading(elements, 'summary', 'Synthèse du profil', pageChildren, colors.primary, colors.secondary);
      elements['summary-text'] = {
        type: 'RichText',
        props: { text: data.summary, fontSize: 9, color: colors.text, lineHeight: 1.7 },
        children: [],
      };
      pageChildren.push('summary-text');
      elements['spacer-summary'] = { type: 'Spacer', props: { height: 20 }, children: [] };
      pageChildren.push('spacer-summary');
    },

    skills(elements, pageChildren, data, colors) {
      const skills = data.skills;
      if (!skills) return;

      const categoryRows: { label: string; value: string }[] = [];
      const cats: { key: keyof typeof skills; label: string }[] = [
        { key: 'technologies', label: 'Technologies' },
        { key: 'softSkills', label: 'Soft-skills' },
        { key: 'expertises', label: 'Expertises' },
        { key: 'methodologies', label: 'Méthodologies' },
      ];
      for (const cat of cats) {
        const rawItems = (skills[cat.key] ?? []).filter(Boolean);
        const names = rawItems
          .filter((item) => typeof item === 'string' || item.added !== false)
          .map((item) => (typeof item === 'string' ? item : item.name))
          .filter(Boolean);
        if (names.length > 0) {
          categoryRows.push({ label: cat.label, value: names.join(', ') });
        }
      }
      if (categoryRows.length === 0) return;

      addSectionHeading(elements, 'skills', 'Compétences', pageChildren, colors.primary, colors.secondary);
      addInfoTable(elements, 'skills', categoryRows, pageChildren, colors);
      elements['spacer-skills'] = { type: 'Spacer', props: { height: 20 }, children: [] };
      pageChildren.push('spacer-skills');
    },

    education(elements, pageChildren, data, colors) {
      const education = (data.education ?? []).filter(Boolean);
      if (education.length === 0) return;
      addSectionHeading(elements, 'edu', 'Formations', pageChildren, colors.primary, colors.secondary);

      education.forEach((edu, i) => {
        elements[`edu-${i}-row`] = {
          type: 'Row',
          props: { justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: null, flex: null, wrap: null },
          children: [`edu-${i}-info`, `edu-${i}-year`],
        };
        elements[`edu-${i}-info`] = {
          type: 'Column',
          props: { gap: 1, alignItems: null, justifyContent: null, padding: null, flex: null },
          children: [`edu-${i}-degree`, `edu-${i}-school`],
        };
        elements[`edu-${i}-degree`] = {
          type: 'Text',
          props: { text: edu.degree ?? '', fontSize: 9, color: colors.primary, fontWeight: 'bold', fontStyle: null, align: null, lineHeight: null },
          children: [],
        };
        elements[`edu-${i}-school`] = {
          type: 'Text',
          props: { text: edu.school ?? '', fontSize: 8, color: colors.text, fontWeight: null, fontStyle: 'italic', align: null, lineHeight: null },
          children: [],
        };
        elements[`edu-${i}-year`] = {
          type: 'Text',
          props: { text: edu.year ?? '', fontSize: 8, color: colors.lightText, fontWeight: null, fontStyle: null, align: null, lineHeight: null },
          children: [],
        };
        pageChildren.push(`edu-${i}-row`);
        elements[`edu-${i}-spacer`] = { type: 'Spacer', props: { height: 6 }, children: [] };
        pageChildren.push(`edu-${i}-spacer`);
      });

      elements['spacer-edu'] = { type: 'Spacer', props: { height: 14 }, children: [] };
      pageChildren.push('spacer-edu');
    },

    experiences(elements, pageChildren, data, colors) {
      const experiences = (data.experiences ?? []).filter(Boolean);
      if (experiences.length === 0) return;
      addSectionHeading(elements, 'exp', 'Expériences professionnelles', pageChildren, colors.primary, colors.secondary);

      experiences.forEach((exp, i) => {
        const roleText = exp.role ?? '';
        const companyText = (exp.company ?? '').toUpperCase();
        const dateText = `${exp.startDate ?? ''} – ${exp.endDate ?? 'Présent'}`;
        const companyDomain = exp.companyDomain?.trim();
        const expSkills = (exp.skills ?? []).filter(Boolean);

        elements[`exp-${i}-wrapper`] = {
          type: 'View',
          props: {
            padding: null, paddingTop: 0, paddingBottom: 0, paddingLeft: 12, paddingRight: 0,
            margin: null, backgroundColor: null,
            borderWidth: null, borderColor: colors.secondary, borderRadius: null,
            flex: null, alignItems: null, justifyContent: null,
          },
          children: [
            `exp-${i}-header-wrap`,
            ...((exp.description ?? []).filter(Boolean).length > 0 ? [`exp-${i}-desc-spacer`, `exp-${i}-desc`] : []),
            ...(expSkills.length > 0 ? [`exp-${i}-skills-spacer`, `exp-${i}-skills`] : []),
          ],
        };

        elements[`exp-${i}-header-wrap`] = {
          type: 'View',
          props: {
            padding: null, paddingTop: i === 0 ? 0 : 30, paddingBottom: 15, paddingLeft: 0, paddingRight: 0,
            margin: null, backgroundColor: null,
            borderWidth: null, borderColor: null, borderRadius: null,
            flex: null, alignItems: null, justifyContent: null,
          },
          children: [`exp-${i}-header`],
        };

        const roleWithCompany = companyText ? `${roleText} – ${companyText}` : roleText;

        elements[`exp-${i}-header`] = {
          type: 'Row',
          props: { justifyContent: 'space-between', alignItems: 'flex-end', gap: 8, padding: null, flex: null, wrap: null },
          children: [
            ...(companyDomain ? [`exp-${i}-role-with-logo`] : [`exp-${i}-role`]),
            `exp-${i}-date`,
          ],
        };

        if (companyDomain) {
          elements[`exp-${i}-role-with-logo`] = {
            type: 'Row',
            props: { justifyContent: null, alignItems: 'center', gap: 5, padding: null, flex: null, wrap: null },
            children: [`exp-${i}-logo`, `exp-${i}-role`],
          };
          elements[`exp-${i}-logo`] = {
            type: 'Image',
            props: { src: `https://logo.clearbit.com/${companyDomain}`, width: 12, height: 12, objectFit: 'contain' },
            children: [],
          };
        }

        elements[`exp-${i}-role`] = {
          type: 'Text',
          props: { text: roleWithCompany, fontSize: 10, color: colors.primary, fontWeight: 'bold', fontStyle: null, align: null, lineHeight: null },
          children: [],
        };
        elements[`exp-${i}-date`] = {
          type: 'Text',
          props: { text: dateText, fontSize: 8, color: colors.lightText, fontWeight: null, fontStyle: null, align: null, lineHeight: null },
          children: [],
        };

        const descItems = (exp.description ?? []).filter(Boolean);
        if (descItems.length > 0) {
          elements[`exp-${i}-desc-spacer`] = { type: 'Spacer', props: { height: 4 }, children: [] };
          elements[`exp-${i}-desc`] = {
            type: 'List',
            props: { items: descItems, ordered: false, fontSize: 8, color: colors.text, spacing: 2 },
            children: [],
          };
        }

        if (expSkills.length > 0) {
          elements[`exp-${i}-skills-spacer`] = { type: 'Spacer', props: { height: 6 }, children: [] };
          elements[`exp-${i}-skills`] = {
            type: 'BadgeList',
            props: { items: expSkills, bgColor: variant.experienceBadgeBgColor, textColor: colors.primary, fontSize: 7 },
            children: [],
          };
        }

        pageChildren.push(`exp-${i}-wrapper`);
        elements[`exp-${i}-spacer`] = { type: 'Spacer', props: { height: 12 }, children: [] };
        pageChildren.push(`exp-${i}-spacer`);
      });

      elements['spacer-exp-end'] = { type: 'Spacer', props: { height: 8 }, children: [] };
      pageChildren.push('spacer-exp-end');
    },
  };
}

export function buildCvDossierLayoutSpec(
  data: Partial<ExtractedCV>,
  templateConfig: Partial<TemplateConfig> | undefined,
  variant: CvDossierLayoutVariant,
): Spec {
  const config = { ...DEFAULT_TEMPLATE_CONFIG, ...templateConfig };
  const colors = { ...DEFAULT_TEMPLATE_CONFIG.colors, ...config.colors };
  const logo = { ...DEFAULT_TEMPLATE_CONFIG.logo, ...config.logo };
  const footer = { ...DEFAULT_TEMPLATE_CONFIG.footer, ...config.footer };
  const sections = config.sections ?? DEFAULT_TEMPLATE_CONFIG.sections;

  const sectionBuilders = createSectionBuilders(variant);

  const elements: Spec['elements'] = {};
  const pageChildren: string[] = [];

  elements['header-band'] = {
    type: 'FixedView',
    props: {
      position: 'absolute', top: 0, left: 0, right: 0,
      padding: null, paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0,
      margin: null, backgroundColor: colors.primary,
      borderWidth: null, borderColor: null, borderRadius: null,
      flex: null, alignItems: null, justifyContent: null,
    },
    children: ['header-inner'],
  };
  const consultantName = data.personalInfo
    ? `${data.personalInfo.firstName ?? ''} ${data.personalInfo.lastName ?? ''}`.trim()
    : '';
  elements['header-inner'] = {
    type: 'Row',
    props: { justifyContent: 'space-between', alignItems: 'center', gap: null, padding: 14, flex: null, wrap: null },
    children: ['header-name', 'header-logo'],
  };
  elements['header-name'] = {
    type: 'Text',
    props: { text: consultantName.toUpperCase(), fontSize: 10, color: '#ffffff', fontWeight: 'bold', fontStyle: null, align: null, lineHeight: null },
    children: [],
  };
  if (logo.url) {
    elements['header-logo'] = {
      type: 'FixedImage',
      props: { src: logo.url, width: logo.width, height: logo.height, objectFit: 'contain' },
      children: [],
    };
  } else if (variant.headerLogoFallback === 'himeo') {
    elements['header-logo'] = {
      type: 'HimeoLogo',
      props: { width: logo.width, height: logo.height },
      children: [],
    };
  } else {
    elements['header-logo'] = {
      type: 'FixedText',
      props: {
        text: 'ESNEO',
        fontSize: 10,
        color: '#ffffff',
        fontWeight: 'bold',
        fontStyle: null,
        align: 'right',
        lineHeight: null,
      },
      children: [],
    };
  }
  pageChildren.push('header-band');

  elements['spacer-after-header'] = { type: 'Spacer', props: { height: 47 }, children: [] };
  pageChildren.push('spacer-after-header');

  elements['doc-title'] = {
    type: 'Text',
    props: {
      text: variant.docTitle,
      fontSize: 12,
      color: colors.primary,
      fontWeight: 'bold',
      fontStyle: null,
      align: 'center',
      lineHeight: null,
    },
    children: [],
  };
  pageChildren.push('doc-title');

  elements['doc-title-accent'] = {
    type: 'Divider',
    props: { color: colors.secondary, thickness: 2, marginTop: 8, marginBottom: 0 },
    children: [],
  };
  pageChildren.push('doc-title-accent');

  elements['spacer-doc-title'] = { type: 'Spacer', props: { height: 16 }, children: [] };
  pageChildren.push('spacer-doc-title');

  if (data.personalInfo) {
    const pi = data.personalInfo;
    const infoRows: { label: string; value: string }[] = [];
    if (pi.title) infoRows.push({ label: 'Poste', value: pi.title });
    if (pi.yearsOfExperience) infoRows.push({ label: "Années d'expérience", value: pi.yearsOfExperience });
    if (pi.location) infoRows.push({ label: 'Localisation', value: pi.location });
    if (pi.availability) infoRows.push({ label: 'Disponibilité', value: pi.availability });

    addInfoTable(elements, 'info', infoRows, pageChildren, colors);

    elements['spacer-info'] = { type: 'Spacer', props: { height: 20 }, children: [] };
    pageChildren.push('spacer-info');
  }

  for (const section of sections) {
    const builder = sectionBuilders[section];
    if (builder) builder(elements, pageChildren, data, colors);
  }

  elements['footer-wrapper'] = {
    type: 'FixedView',
    props: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      padding: null, paddingTop: 10, paddingBottom: 12, paddingLeft: 48, paddingRight: 48,
      margin: null, backgroundColor: null,
      borderWidth: null, borderColor: null, borderRadius: null,
      flex: null, alignItems: null, justifyContent: null,
    },
    children: ['footer-divider', 'footer-content'],
  };
  elements['footer-divider'] = {
    type: 'Divider',
    props: { color: colors.secondary, thickness: 0.5, marginTop: 0, marginBottom: 8 },
    children: [],
  };
  elements['footer-content'] = {
    type: 'Row',
    props: { justifyContent: 'space-between', alignItems: 'center', gap: null, padding: null, flex: null, wrap: null },
    children: ['footer-line1', 'footer-line2'],
  };
  elements['footer-line1'] = {
    type: 'Text',
    props: { text: footer.line1, fontSize: 7, color: colors.primary, fontWeight: 'bold', fontStyle: null, align: null, lineHeight: null },
    children: [],
  };
  elements['footer-line2'] = {
    type: 'Text',
    props: { text: footer.line2, fontSize: 7, color: colors.lightText, fontWeight: null, fontStyle: null, align: null, lineHeight: null },
    children: [],
  };
  pageChildren.push('footer-wrapper');

  elements['doc'] = {
    type: 'Document',
    props: {
      title: data.personalInfo ? `CV ${data.personalInfo.firstName ?? ''} ${data.personalInfo.lastName ?? ''}` : 'CV',
      author: footer.line1.split('–')[0]?.trim() || 'CV',
      subject: variant.documentSubject,
    },
    children: ['page'],
  };
  elements['page'] = {
    type: 'Page',
    props: {
      size: 'A4',
      orientation: null,
      marginTop: 56,
      marginBottom: 45,
      marginLeft: 48,
      marginRight: 48,
      backgroundColor: colors.background,
    },
    children: pageChildren,
  };

  return { root: 'doc', elements };
}
