import type { Spec } from '@json-render/core';
import type { ExtractedCV } from '@/lib/schema';

const HIMEO_PRIMARY = '#010557';
const HIMEO_SECONDARY = '#9bcaff';
const HIMEO_LIGHT_BG = '#f5f5f4';
const HIMEO_GRAY = '#4b5563';
const HIMEO_LIGHT_GRAY = '#9ca3af';

// Himeo logo SVG encoded as data URI (white version for dark header)
const HIMEO_LOGO_WHITE = `data:image/svg+xml;base64,${Buffer.from(`<svg width="158" height="36" viewBox="0 0 158 36" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M28.7257 0H23.9381V14.9995H4.63563V0H0V13.3159L5.0156 17.2953L0 21.3513V35.0498H4.63563V19.6677H23.9381V35.0498H28.7257V0Z" fill="white"/><rect x="36.3518" y="35.0508" width="35.0498" height="4.55964" transform="rotate(-90 36.3518 35.0508)" fill="white"/><path d="M83.878 34.9729V12.2441L79.0144 20.8918V34.9729H83.878Z" fill="white"/><path d="M83.8747 0.078125V2.14438L67.536 30.5362H64.7242L53.3251 10.9451V35.0514H48.5375V0.078125H52.5652L66.2441 23.8018L79.923 0.078125H83.8747Z" fill="white"/><rect x="91.5039" width="24.1661" height="4.59167" fill="white"/><rect x="91.5039" y="15" width="24.1661" height="4.59167" fill="white"/><rect x="91.5039" y="30.459" width="24.1661" height="4.59167" fill="white"/><path d="M140.648 2.63184C148.825 2.63184 155.483 9.30948 155.484 17.582C155.484 25.8548 148.825 32.5332 140.648 32.5332C132.47 32.533 125.813 25.8547 125.813 17.582C125.813 9.30961 132.47 2.63204 140.648 2.63184Z" stroke="white" stroke-width="5.03319"/></svg>`).toString('base64')}`;

function addSectionHeading(
  elements: Spec['elements'],
  id: string,
  text: string,
  children: string[],
) {
  elements[`${id}-container`] = {
    type: 'View',
    props: {
      padding: null, paddingTop: null, paddingBottom: 4, paddingLeft: null, paddingRight: null,
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
      fontSize: 12,
      color: HIMEO_PRIMARY,
      fontWeight: 'bold',
      fontStyle: null,
      align: null,
      lineHeight: null,
    },
    children: [],
  };
  elements[`${id}-line`] = {
    type: 'Divider',
    props: { color: HIMEO_SECONDARY, thickness: 2, marginTop: 4, marginBottom: 12 },
    children: [],
  };
  children.push(`${id}-container`);
}

export function buildCvSpec(data: Partial<ExtractedCV>): Spec {
  const elements: Spec['elements'] = {};
  const pageChildren: string[] = [];

  // ═══════════════════════════════════════════════
  // FIXED HEADER — repeats on every page
  // Dark blue band with logo on the right
  // ═══════════════════════════════════════════════
  elements['header-band'] = {
    type: 'FixedView',
    props: {
      padding: null, paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0,
      margin: null, backgroundColor: HIMEO_PRIMARY,
      borderWidth: null, borderColor: null, borderRadius: null,
      flex: null, alignItems: null, justifyContent: null,
    },
    children: ['header-inner'],
  };
  elements['header-inner'] = {
    type: 'Row',
    props: {
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: null,
      padding: 12,
      flex: null,
      wrap: null,
    },
    children: ['header-logo'],
  };
  elements['header-logo'] = {
    type: 'Image',
    props: { src: HIMEO_LOGO_WHITE, width: 90, height: 20, objectFit: 'contain' },
    children: [],
  };
  pageChildren.push('header-band');

  // Spacer after fixed header to push content down
  elements['spacer-after-header'] = { type: 'Spacer', props: { height: 16 }, children: [] };
  pageChildren.push('spacer-after-header');

  // ═══════════════════════════════════════════════
  // NAME & TITLE — first page only
  // ═══════════════════════════════════════════════
  if (data.personalInfo) {
    const pi = data.personalInfo;
    const fullName = `${pi.firstName ?? ''} ${pi.lastName ?? ''}`.trim().toUpperCase();
    if (fullName) {
      elements['name'] = {
        type: 'Heading',
        props: { text: fullName, level: 'h1', color: HIMEO_PRIMARY, align: null },
        children: [],
      };
      pageChildren.push('name');
    }
    if (pi.title) {
      elements['title'] = {
        type: 'Text',
        props: { text: pi.title, fontSize: 14, color: HIMEO_GRAY, fontWeight: null, fontStyle: null, align: null, lineHeight: null },
        children: [],
      };
      pageChildren.push('title');
    }
    elements['spacer-title'] = { type: 'Spacer', props: { height: 20 }, children: [] };
    pageChildren.push('spacer-title');
  }

  // ═══════════════════════════════════════════════
  // SYNTHÈSE
  // ═══════════════════════════════════════════════
  const strengths = (data.strengths ?? []).filter(Boolean);
  if (strengths.length > 0) {
    addSectionHeading(elements, 'strengths', 'Synthèse', pageChildren);
    elements['strengths-list'] = {
      type: 'List',
      props: { items: strengths, ordered: false, fontSize: 10, color: HIMEO_GRAY, spacing: 4 },
      children: [],
    };
    pageChildren.push('strengths-list');
    elements['spacer-strengths'] = { type: 'Spacer', props: { height: 18 }, children: [] };
    pageChildren.push('spacer-strengths');
  }

  // ═══════════════════════════════════════════════
  // RÉSUMÉ PROFESSIONNEL
  // ═══════════════════════════════════════════════
  if (data.summary) {
    addSectionHeading(elements, 'summary', 'Résumé Professionnel', pageChildren);
    elements['summary-text'] = {
      type: 'Text',
      props: { text: data.summary, fontSize: 10, color: HIMEO_GRAY, fontWeight: null, fontStyle: null, align: null, lineHeight: 1.6 },
      children: [],
    };
    pageChildren.push('summary-text');
    elements['spacer-summary'] = { type: 'Spacer', props: { height: 18 }, children: [] };
    pageChildren.push('spacer-summary');
  }

  // ═══════════════════════════════════════════════
  // COMPÉTENCES TECHNIQUES
  // ═══════════════════════════════════════════════
  const skills = (data.skills ?? []).filter(Boolean);
  if (skills.length > 0) {
    addSectionHeading(elements, 'skills', 'Compétences Techniques', pageChildren);
    elements['skills-container'] = {
      type: 'View',
      props: {
        padding: null, paddingTop: 10, paddingBottom: 10, paddingLeft: 14, paddingRight: 14,
        margin: null, backgroundColor: HIMEO_LIGHT_BG,
        borderWidth: null, borderColor: null, borderRadius: 4,
        flex: null, alignItems: null, justifyContent: null,
      },
      children: ['skills-text'],
    };
    elements['skills-text'] = {
      type: 'Text',
      props: { text: skills.join('  •  '), fontSize: 10, color: HIMEO_PRIMARY, fontWeight: 'bold', fontStyle: null, align: null, lineHeight: 1.6 },
      children: [],
    };
    pageChildren.push('skills-container');
    elements['spacer-skills'] = { type: 'Spacer', props: { height: 18 }, children: [] };
    pageChildren.push('spacer-skills');
  }

  // ═══════════════════════════════════════════════
  // EXPÉRIENCES PROFESSIONNELLES
  // ═══════════════════════════════════════════════
  const experiences = (data.experiences ?? []).filter(Boolean);
  if (experiences.length > 0) {
    addSectionHeading(elements, 'exp', 'Expériences Professionnelles', pageChildren);

    experiences.forEach((exp, i) => {
      const roleText = exp.role ?? '';
      const companyText = (exp.company ?? '').toUpperCase();
      const dateText = `${exp.startDate ?? ''} – ${exp.endDate ?? 'Présent'}`;
      const companyDomain = exp.companyDomain?.trim();

      // Role title (bold, primary color)
      elements[`exp-${i}-role`] = {
        type: 'Text',
        props: { text: roleText, fontSize: 11, color: HIMEO_PRIMARY, fontWeight: 'bold', fontStyle: null, align: null, lineHeight: null },
        children: [],
      };
      pageChildren.push(`exp-${i}-role`);

      // Company + date row (with optional logo)
      const metaChildren: string[] = [];

      if (companyDomain) {
        // Company info with logo
        elements[`exp-${i}-company-with-logo`] = {
          type: 'Row',
          props: { justifyContent: null, alignItems: 'center', gap: 6, padding: null, flex: null, wrap: null },
          children: [`exp-${i}-logo`, `exp-${i}-company`],
        };
        elements[`exp-${i}-logo`] = {
          type: 'Image',
          props: {
            src: `https://logo.clearbit.com/${companyDomain}`,
            width: 14,
            height: 14,
            objectFit: 'contain',
          },
          children: [],
        };
        metaChildren.push(`exp-${i}-company-with-logo`);
      } else {
        metaChildren.push(`exp-${i}-company`);
      }
      metaChildren.push(`exp-${i}-date`);

      elements[`exp-${i}-meta`] = {
        type: 'Row',
        props: { justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: null, flex: null, wrap: null },
        children: metaChildren,
      };
      elements[`exp-${i}-company`] = {
        type: 'Text',
        props: { text: companyText, fontSize: 9, color: HIMEO_GRAY, fontWeight: null, fontStyle: 'italic', align: null, lineHeight: null },
        children: [],
      };
      elements[`exp-${i}-date`] = {
        type: 'Text',
        props: { text: dateText, fontSize: 9, color: HIMEO_LIGHT_GRAY, fontWeight: null, fontStyle: null, align: null, lineHeight: null },
        children: [],
      };
      pageChildren.push(`exp-${i}-meta`);

      // Description bullets
      const descItems = (exp.description ?? []).filter(Boolean);
      if (descItems.length > 0) {
        elements[`exp-${i}-desc`] = {
          type: 'List',
          props: { items: descItems, ordered: false, fontSize: 9, color: HIMEO_GRAY, spacing: 3 },
          children: [],
        };
        pageChildren.push(`exp-${i}-desc`);
      }

      // Spacing between experiences
      elements[`exp-${i}-spacer`] = { type: 'Spacer', props: { height: 14 }, children: [] };
      pageChildren.push(`exp-${i}-spacer`);
    });
  }

  // ═══════════════════════════════════════════════
  // FORMATIONS
  // ═══════════════════════════════════════════════
  const education = (data.education ?? []).filter(Boolean);
  if (education.length > 0) {
    addSectionHeading(elements, 'edu', 'Formations', pageChildren);

    education.forEach((edu, i) => {
      elements[`edu-${i}-row`] = {
        type: 'Row',
        props: { justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: null, flex: null, wrap: null },
        children: [`edu-${i}-degree`, `edu-${i}-year`],
      };
      elements[`edu-${i}-degree`] = {
        type: 'Text',
        props: { text: `${edu.degree ?? ''} – ${edu.school ?? ''}`, fontSize: 10, color: HIMEO_GRAY, fontWeight: 'bold', fontStyle: null, align: null, lineHeight: 1.5 },
        children: [],
      };
      elements[`edu-${i}-year`] = {
        type: 'Text',
        props: { text: edu.year ?? '', fontSize: 9, color: HIMEO_LIGHT_GRAY, fontWeight: null, fontStyle: null, align: null, lineHeight: null },
        children: [],
      };
      pageChildren.push(`edu-${i}-row`);
    });

    elements['spacer-edu'] = { type: 'Spacer', props: { height: 18 }, children: [] };
    pageChildren.push('spacer-edu');
  }

  // ═══════════════════════════════════════════════
  // FIXED FOOTER — repeats on every page
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
    props: { color: HIMEO_SECONDARY, thickness: 1, marginTop: 0, marginBottom: 8 },
    children: [],
  };
  elements['footer-content'] = {
    type: 'Column',
    props: { gap: 2, alignItems: 'center', justifyContent: null, padding: null, flex: null },
    children: ['footer-line1', 'footer-line2'],
  };
  elements['footer-line1'] = {
    type: 'Text',
    props: { text: 'Himeo Group – Solutions humaines & digitales', fontSize: 8, color: HIMEO_PRIMARY, fontWeight: 'bold', fontStyle: null, align: 'center', lineHeight: null },
    children: [],
  };
  elements['footer-line2'] = {
    type: 'Text',
    props: { text: 'contact@himeo.fr – www.himeo.fr', fontSize: 8, color: HIMEO_LIGHT_GRAY, fontWeight: null, fontStyle: null, align: 'center', lineHeight: null },
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
      author: 'Himeo Group',
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
      marginLeft: 40,
      marginRight: 40,
      backgroundColor: '#ffffff',
    },
    children: pageChildren,
  };

  return { root: 'doc', elements };
}
