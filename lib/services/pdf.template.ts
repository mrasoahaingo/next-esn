import type { Spec } from '@json-render/core';
import type { ExtractedCV } from '@/lib/schema';

const HIMEO_BLUE = '#1E40AF';
const HIMEO_DARK_BLUE = '#1E3A8A';

export function buildCvSpec(data: Partial<ExtractedCV>): Spec {
  const elements: Spec['elements'] = {};
  const pageChildren: string[] = [];

  // Header
  elements['header'] = {
    type: 'Row',
    props: { justifyContent: 'flex-end', padding: null, gap: null, alignItems: null, flex: null, wrap: null },
    children: ['header-logo'],
  };
  elements['header-logo'] = {
    type: 'Text',
    props: { text: 'HIMEO', fontSize: 16, color: HIMEO_BLUE, fontWeight: 'bold', fontStyle: null, align: null, lineHeight: null },
    children: [],
  };
  pageChildren.push('header', 'spacer-header');
  elements['spacer-header'] = { type: 'Spacer', props: { height: 20 }, children: [] };

  // Name & Title
  if (data.personalInfo) {
    const pi = data.personalInfo;
    const fullName = `${pi.firstName ?? ''} ${pi.lastName ?? ''}`.trim().toUpperCase();
    if (fullName) {
      elements['name'] = {
        type: 'Heading',
        props: { text: fullName, level: 'h1', color: HIMEO_DARK_BLUE, align: 'center' },
        children: [],
      };
      pageChildren.push('name');
    }
    if (pi.title) {
      elements['title'] = {
        type: 'Heading',
        props: { text: pi.title, level: 'h2', color: HIMEO_BLUE, align: 'center' },
        children: [],
      };
      pageChildren.push('title');
    }
    pageChildren.push('spacer-title');
    elements['spacer-title'] = { type: 'Spacer', props: { height: 20 }, children: [] };
  }

  // Strengths
  const strengths = (data.strengths ?? []).filter(Boolean);
  if (strengths.length > 0) {
    elements['strengths-heading'] = {
      type: 'Heading',
      props: { text: 'SYNTHÈSE', level: 'h3', color: HIMEO_BLUE, align: null },
      children: [],
    };
    elements['strengths-divider'] = { type: 'Divider', props: { color: HIMEO_BLUE, thickness: 1, marginTop: 2, marginBottom: 8 }, children: [] };
    elements['strengths-list'] = {
      type: 'List',
      props: { items: strengths, ordered: false, fontSize: 10, color: null, spacing: 4 },
      children: [],
    };
    pageChildren.push('strengths-heading', 'strengths-divider', 'strengths-list', 'spacer-strengths');
    elements['spacer-strengths'] = { type: 'Spacer', props: { height: 12 }, children: [] };
  }

  // Summary
  if (data.summary) {
    elements['summary-heading'] = {
      type: 'Heading',
      props: { text: 'RÉSUMÉ PROFESSIONNEL', level: 'h3', color: HIMEO_BLUE, align: null },
      children: [],
    };
    elements['summary-divider'] = { type: 'Divider', props: { color: HIMEO_BLUE, thickness: 1, marginTop: 2, marginBottom: 8 }, children: [] };
    elements['summary-text'] = {
      type: 'Text',
      props: { text: data.summary, fontSize: 10, color: null, fontWeight: null, fontStyle: null, align: null, lineHeight: 1.5 },
      children: [],
    };
    pageChildren.push('summary-heading', 'summary-divider', 'summary-text', 'spacer-summary');
    elements['spacer-summary'] = { type: 'Spacer', props: { height: 12 }, children: [] };
  }

  // Skills
  const skills = (data.skills ?? []).filter(Boolean);
  if (skills.length > 0) {
    elements['skills-heading'] = {
      type: 'Heading',
      props: { text: 'COMPÉTENCES TECHNIQUES', level: 'h3', color: HIMEO_BLUE, align: null },
      children: [],
    };
    elements['skills-divider'] = { type: 'Divider', props: { color: HIMEO_BLUE, thickness: 1, marginTop: 2, marginBottom: 8 }, children: [] };
    elements['skills-text'] = {
      type: 'Text',
      props: { text: skills.join(' • '), fontSize: 10, color: null, fontWeight: 'bold', fontStyle: null, align: null, lineHeight: 1.4 },
      children: [],
    };
    pageChildren.push('skills-heading', 'skills-divider', 'skills-text', 'spacer-skills');
    elements['spacer-skills'] = { type: 'Spacer', props: { height: 12 }, children: [] };
  }

  // Experiences
  const experiences = (data.experiences ?? []).filter(Boolean);
  if (experiences.length > 0) {
    elements['exp-heading'] = {
      type: 'Heading',
      props: { text: 'EXPÉRIENCES PROFESSIONNELLES', level: 'h3', color: HIMEO_BLUE, align: null },
      children: [],
    };
    elements['exp-divider'] = { type: 'Divider', props: { color: HIMEO_BLUE, thickness: 1, marginTop: 2, marginBottom: 8 }, children: [] };
    pageChildren.push('exp-heading', 'exp-divider');

    experiences.forEach((exp, i) => {
      const roleText = `${exp.role ?? ''} @ ${exp.company ?? ''}`;
      const dateText = `${exp.startDate ?? ''} - ${exp.endDate ?? 'Présent'}`;

      elements[`exp-${i}-header`] = {
        type: 'Row',
        props: { justifyContent: 'space-between', alignItems: 'flex-end', gap: 8, padding: null, flex: null, wrap: null },
        children: [`exp-${i}-role`, `exp-${i}-date`],
      };
      elements[`exp-${i}-role`] = {
        type: 'Text',
        props: { text: roleText, fontSize: 11, color: HIMEO_DARK_BLUE, fontWeight: 'bold', fontStyle: null, align: null, lineHeight: null },
        children: [],
      };
      elements[`exp-${i}-date`] = {
        type: 'Text',
        props: { text: dateText, fontSize: 9, color: '#6B7280', fontWeight: null, fontStyle: 'italic', align: null, lineHeight: null },
        children: [],
      };

      const descItems = (exp.description ?? []).filter(Boolean);
      if (descItems.length > 0) {
        elements[`exp-${i}-desc`] = {
          type: 'List',
          props: { items: descItems, ordered: false, fontSize: 9, color: null, spacing: 2 },
          children: [],
        };
        pageChildren.push(`exp-${i}-header`, `exp-${i}-desc`);
      } else {
        pageChildren.push(`exp-${i}-header`);
      }

      elements[`exp-${i}-spacer`] = { type: 'Spacer', props: { height: 8 }, children: [] };
      pageChildren.push(`exp-${i}-spacer`);
    });
  }

  // Education
  const education = (data.education ?? []).filter(Boolean);
  if (education.length > 0) {
    elements['edu-heading'] = {
      type: 'Heading',
      props: { text: 'FORMATIONS', level: 'h3', color: HIMEO_BLUE, align: null },
      children: [],
    };
    elements['edu-divider'] = { type: 'Divider', props: { color: HIMEO_BLUE, thickness: 1, marginTop: 2, marginBottom: 8 }, children: [] };
    pageChildren.push('edu-heading', 'edu-divider');

    education.forEach((edu, i) => {
      const text = `${edu.degree ?? ''} - ${edu.school ?? ''} (${edu.year ?? ''})`;
      elements[`edu-${i}`] = {
        type: 'Text',
        props: { text, fontSize: 10, color: null, fontWeight: null, fontStyle: null, align: null, lineHeight: 1.4 },
        children: [],
      };
      pageChildren.push(`edu-${i}`);
    });
  }

  // Document structure
  elements['doc'] = {
    type: 'Document',
    props: {
      title: data.personalInfo ? `CV ${data.personalInfo.firstName ?? ''} ${data.personalInfo.lastName ?? ''}` : 'CV',
      author: 'Himeo',
      subject: null,
    },
    children: ['page'],
  };
  elements['page'] = {
    type: 'Page',
    props: {
      size: 'A4',
      orientation: null,
      marginTop: 40,
      marginBottom: 40,
      marginLeft: 50,
      marginRight: 50,
      backgroundColor: null,
    },
    children: pageChildren,
  };

  return { root: 'doc', elements };
}
