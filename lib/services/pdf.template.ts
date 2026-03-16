import type { Spec } from '@json-render/core';
import type { ExtractedCV, TemplateConfig } from '@/lib/schema';
import { DEFAULT_TEMPLATE_CONFIG } from '@/lib/schema';


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
      padding: null, paddingTop: null, paddingBottom: 6, paddingLeft: null, paddingRight: null,
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

// Section builders keyed by section name
type SectionBuilder = (
  elements: Spec['elements'],
  pageChildren: string[],
  data: Partial<ExtractedCV>,
  colors: TemplateConfig['colors'],
) => void;

const sectionBuilders: Record<string, SectionBuilder> = {
  strengths(elements, pageChildren, data, colors) {
    const strengths = (data.strengths ?? []).filter(Boolean);
    if (strengths.length === 0) return;
    addSectionHeading(elements, 'strengths', 'Synthèse', pageChildren, colors.primary, colors.secondary);
    elements['strengths-list'] = {
      type: 'List',
      props: { items: strengths, ordered: false, fontSize: 9, color: colors.text, spacing: 4 },
      children: [],
    };
    pageChildren.push('strengths-list');
    elements['spacer-strengths'] = { type: 'Spacer', props: { height: 20 }, children: [] };
    pageChildren.push('spacer-strengths');
  },

  summary(elements, pageChildren, data, colors) {
    if (!data.summary) return;
    addSectionHeading(elements, 'summary', 'Résumé Professionnel', pageChildren, colors.primary, colors.secondary);
    elements['summary-text'] = {
      type: 'Text',
      props: { text: data.summary, fontSize: 9, color: colors.text, fontWeight: null, fontStyle: 'italic', align: null, lineHeight: 1.7 },
      children: [],
    };
    pageChildren.push('summary-text');
    elements['spacer-summary'] = { type: 'Spacer', props: { height: 20 }, children: [] };
    pageChildren.push('spacer-summary');
  },

  skills(elements, pageChildren, data, colors) {
    const skills = (data.skills ?? []).filter(Boolean);
    if (skills.length === 0) return;
    addSectionHeading(elements, 'skills', 'Compétences Techniques', pageChildren, colors.primary, colors.secondary);
    elements['skills-row'] = {
      type: 'Row',
      props: { justifyContent: null, alignItems: null, gap: 6, padding: null, flex: null, wrap: true },
      children: skills.map((_, i) => `skill-chip-${i}`),
    };
    skills.forEach((skill, i) => {
      elements[`skill-chip-${i}`] = {
        type: 'View',
        props: {
          padding: null, paddingTop: 4, paddingBottom: 4, paddingLeft: 10, paddingRight: 10,
          margin: null, backgroundColor: '#eef2ff',
          borderWidth: null, borderColor: null, borderRadius: 12,
          flex: null, alignItems: null, justifyContent: null,
        },
        children: [`skill-chip-text-${i}`],
      };
      elements[`skill-chip-text-${i}`] = {
        type: 'Text',
        props: { text: skill, fontSize: 8, color: colors.primary, fontWeight: 'bold', fontStyle: null, align: null, lineHeight: null },
        children: [],
      };
    });
    pageChildren.push('skills-row');
    elements['spacer-skills'] = { type: 'Spacer', props: { height: 20 }, children: [] };
    pageChildren.push('spacer-skills');
  },

  experiences(elements, pageChildren, data, colors) {
    const experiences = (data.experiences ?? []).filter(Boolean);
    if (experiences.length === 0) return;
    addSectionHeading(elements, 'exp', 'Expériences Professionnelles', pageChildren, colors.primary, colors.secondary);

    experiences.forEach((exp, i) => {
      const roleText = exp.role ?? '';
      const companyText = (exp.company ?? '').toUpperCase();
      const dateText = `${exp.startDate ?? ''} – ${exp.endDate ?? 'Présent'}`;
      const companyDomain = exp.companyDomain?.trim();

      // Experience wrapper with left accent border
      elements[`exp-${i}-wrapper`] = {
        type: 'View',
        props: {
          padding: null, paddingTop: 0, paddingBottom: 0, paddingLeft: 12, paddingRight: 0,
          margin: null, backgroundColor: null,
          borderWidth: null, borderColor: colors.secondary, borderRadius: null,
          flex: null, alignItems: null, justifyContent: null,
        },
        children: [`exp-${i}-header`, ...(companyDomain || companyText ? [`exp-${i}-meta`] : []), ...((exp.description ?? []).filter(Boolean).length > 0 ? [`exp-${i}-desc-spacer`, `exp-${i}-desc`] : [])],
      };

      // Role + date on same line
      elements[`exp-${i}-header`] = {
        type: 'Row',
        props: { justifyContent: 'space-between', alignItems: 'flex-end', gap: 8, padding: null, flex: null, wrap: null },
        children: [`exp-${i}-role`, `exp-${i}-date`],
      };
      elements[`exp-${i}-role`] = {
        type: 'Text',
        props: { text: roleText, fontSize: 10, color: colors.primary, fontWeight: 'bold', fontStyle: null, align: null, lineHeight: null },
        children: [],
      };
      elements[`exp-${i}-date`] = {
        type: 'Text',
        props: { text: dateText, fontSize: 8, color: colors.lightText, fontWeight: null, fontStyle: null, align: null, lineHeight: null },
        children: [],
      };

      // Company row
      const metaChildren: string[] = [];
      if (companyDomain) {
        elements[`exp-${i}-company-with-logo`] = {
          type: 'Row',
          props: { justifyContent: null, alignItems: 'center', gap: 5, padding: null, flex: null, wrap: null },
          children: [`exp-${i}-logo`, `exp-${i}-company`],
        };
        elements[`exp-${i}-logo`] = {
          type: 'Image',
          props: { src: `https://logo.clearbit.com/${companyDomain}`, width: 12, height: 12, objectFit: 'contain' },
          children: [],
        };
        metaChildren.push(`exp-${i}-company-with-logo`);
      } else if (companyText) {
        metaChildren.push(`exp-${i}-company`);
      }

      if (metaChildren.length > 0) {
        elements[`exp-${i}-meta`] = {
          type: 'Row',
          props: { justifyContent: null, alignItems: 'center', gap: 8, padding: null, flex: null, wrap: null },
          children: metaChildren,
        };
      }
      elements[`exp-${i}-company`] = {
        type: 'Text',
        props: { text: companyText, fontSize: 8, color: colors.text, fontWeight: null, fontStyle: 'italic', align: null, lineHeight: null },
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

      pageChildren.push(`exp-${i}-wrapper`);
      elements[`exp-${i}-spacer`] = { type: 'Spacer', props: { height: 12 }, children: [] };
      pageChildren.push(`exp-${i}-spacer`);
    });

    // Extra spacing after last experience
    elements['spacer-exp-end'] = { type: 'Spacer', props: { height: 8 }, children: [] };
    pageChildren.push('spacer-exp-end');
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
};

export function buildCvSpec(
  data: Partial<ExtractedCV>,
  templateConfig?: Partial<TemplateConfig>,
): Spec {
  const config = { ...DEFAULT_TEMPLATE_CONFIG, ...templateConfig };
  const colors = { ...DEFAULT_TEMPLATE_CONFIG.colors, ...config.colors };
  const logo = { ...DEFAULT_TEMPLATE_CONFIG.logo, ...config.logo };
  const footer = { ...DEFAULT_TEMPLATE_CONFIG.footer, ...config.footer };
  const sections = config.sections ?? DEFAULT_TEMPLATE_CONFIG.sections;

  const elements: Spec['elements'] = {};
  const pageChildren: string[] = [];

  // ═══════════════════════════════════════════════
  // HEADER BAND — full-width dark band with logo
  // ═══════════════════════════════════════════════
  elements['header-band'] = {
    type: 'FixedView',
    props: {
      padding: null, paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0,
      margin: null, backgroundColor: colors.primary,
      borderWidth: null, borderColor: null, borderRadius: null,
      flex: null, alignItems: null, justifyContent: null,
    },
    children: ['header-inner'],
  };
  elements['header-inner'] = {
    type: 'Row',
    props: { justifyContent: 'flex-end', alignItems: 'center', gap: null, padding: 14, flex: null, wrap: null },
    children: ['header-logo'],
  };
  if (logo.url) {
    elements['header-logo'] = {
      type: 'FixedImage',
      props: { src: logo.url, width: logo.width, height: logo.height, objectFit: 'contain' },
      children: [],
    };
  } else {
    elements['header-logo'] = {
      type: 'HimeoLogo',
      props: { width: logo.width, height: logo.height },
      children: [],
    };
  }
  pageChildren.push('header-band');

  elements['spacer-after-header'] = { type: 'Spacer', props: { height: 24 }, children: [] };
  pageChildren.push('spacer-after-header');

  // ═══════════════════════════════════════════════
  // NAME & TITLE — large name, subtle title below
  // ═══════════════════════════════════════════════
  if (data.personalInfo) {
    const pi = data.personalInfo;
    const fullName = `${pi.firstName ?? ''} ${pi.lastName ?? ''}`.trim().toUpperCase();
    if (fullName) {
      elements['name'] = {
        type: 'Heading',
        props: { text: fullName, level: 'h1', color: colors.primary, align: null },
        children: [],
      };
      pageChildren.push('name');
    }
    if (pi.title) {
      elements['title'] = {
        type: 'Text',
        props: { text: pi.title, fontSize: 13, color: colors.lightText, fontWeight: null, fontStyle: null, align: null, lineHeight: null },
        children: [],
      };
      pageChildren.push('title');
    }

    // Thin accent line under the name block
    elements['name-accent'] = {
      type: 'Divider',
      props: { color: colors.secondary, thickness: 2, marginTop: 12, marginBottom: 0 },
      children: [],
    };
    pageChildren.push('name-accent');

    elements['spacer-title'] = { type: 'Spacer', props: { height: 24 }, children: [] };
    pageChildren.push('spacer-title');
  }

  // ═══════════════════════════════════════════════
  // SECTIONS — in configurable order
  // ═══════════════════════════════════════════════
  for (const section of sections) {
    const builder = sectionBuilders[section];
    if (builder) builder(elements, pageChildren, data, colors);
  }

  // ═══════════════════════════════════════════════
  // FIXED FOOTER
  // ═══════════════════════════════════════════════
  elements['footer-wrapper'] = {
    type: 'FixedView',
    props: {
      padding: null, paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0,
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

  // ═══════════════════════════════════════════════
  // DOCUMENT STRUCTURE
  // ═══════════════════════════════════════════════
  elements['doc'] = {
    type: 'Document',
    props: {
      title: data.personalInfo ? `CV ${data.personalInfo.firstName ?? ''} ${data.personalInfo.lastName ?? ''}` : 'CV',
      author: footer.line1.split('–')[0]?.trim() || 'Himeo Group',
      subject: null,
    },
    children: ['page'],
  };
  elements['page'] = {
    type: 'Page',
    props: {
      size: 'A4',
      orientation: null,
      marginTop: 0,
      marginBottom: 40,
      marginLeft: 48,
      marginRight: 48,
      backgroundColor: colors.background,
    },
    children: pageChildren,
  };

  return { root: 'doc', elements };
}
