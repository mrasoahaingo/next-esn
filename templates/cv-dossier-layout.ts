import path from 'node:path';
import { pathToFileURL } from 'node:url';

import type { Spec } from '@json-render/core';
import type {
  ExtractedCV,
  TemplateBlock,
  TemplateBlockType,
  TemplateConfig,
} from '@/lib/schema';
import { DEFAULT_TEMPLATE_CONFIG } from '@/lib/schema';
import { mergeTemplateWithDefaults, resolvePdfLogoSrc } from '@/lib/utils/template';

const WORDMARK_FALLBACK_LOGO_SRC = pathToFileURL(
  path.join(process.cwd(), 'public', 'esneo-full.svg'),
).href;

/**
 * Labels de section du CV localisés par langue.
 * Câblé dans les block builders via data.language ?? 'fr'.
 */
export const CV_LABELS: Record<'fr' | 'en', {
  docTitle: string;
  summary: string;
  skills: string;
  experiences: string;
  education: string;
  strengths: string;
  availability: string;
  contact: string;
  poste: string;
  yearsOfExperience: string;
  location: string;
  email: string;
  phone: string;
  summaryHeading: string;
  skillsHeading: string;
  educationHeading: string;
  experiencesHeading: string;
  technologies: string;
  softSkills: string;
  expertises: string;
  methodologies: string;
}> = {
  fr: {
    docTitle: 'Dossier de compétences',
    summary: 'Profil',
    skills: 'Compétences',
    experiences: 'Expériences',
    education: 'Formation',
    strengths: 'Points forts',
    availability: 'Disponibilité',
    contact: 'Contact',
    poste: 'Poste',
    yearsOfExperience: "Années d'expérience",
    location: 'Localisation',
    email: 'Email',
    phone: 'Téléphone',
    summaryHeading: 'Synthèse du profil',
    skillsHeading: 'Compétences',
    educationHeading: 'Formations',
    experiencesHeading: 'Expériences professionnelles',
    technologies: 'Technologies',
    softSkills: 'Soft skills',
    expertises: 'Expertises',
    methodologies: 'Méthodologies',
  },
  en: {
    docTitle: 'Competency Profile',
    summary: 'Profile',
    skills: 'Skills',
    experiences: 'Experience',
    education: 'Education',
    strengths: 'Key Strengths',
    availability: 'Availability',
    contact: 'Contact',
    poste: 'Position',
    yearsOfExperience: 'Years of experience',
    location: 'Location',
    email: 'Email',
    phone: 'Phone',
    summaryHeading: 'Profile Summary',
    skillsHeading: 'Skills',
    educationHeading: 'Education',
    experiencesHeading: 'Professional Experience',
    technologies: 'Technologies',
    softSkills: 'Soft skills',
    expertises: 'Expertise',
    methodologies: 'Methodologies',
  },
};

type CvTemplateTheme = {
  headerBackground: string;
  headerNameColor: string;
  headerMetaColor: string;
  headerPadding: number;
  headerUsesAccentBorder: boolean;

  docTitleFontSize: number;
  docTitleColor: string;
  docTitleRuleColor: string;
  docTitleRuleThickness: number;
  docTitleRuleMarginTop: number;
  spacerAfterDocTitle: number;

  infoTableBorderColor: string;
  infoTableBorderWidth: number;
  infoTableBorderRadius: number;
  infoTableAlternateRowBg: string | null;
  infoTableInnerDividerColor: string;
  infoTableLabelFontSize: number;
  infoTableValueFontSize: number;

  sectionHeadingUppercase: boolean;
  sectionHeadingFontSize: number;
  sectionRuleColor: string;
  sectionRuleThickness: number;
  sectionRuleMarginTop: number;
  sectionBlockPaddingBottom: number;

  summaryFontSize: number;
  summaryLineHeight: number;
  spacerAfterSummary: number;

  spacerAfterSkills: number;
  spacerAfterEducationBlock: number;
  spacerAfterEducationSection: number;

  educationDegreeFontSize: number;
  educationSchoolFontSize: number;
  educationYearFontSize: number;

  experiencePaddingLeft: number;
  experienceLeftBorderWidth: number;
  experienceLeftBorderColor: string;
  experienceRoleFontSize: number;
  experienceDateFontSize: number;
  experienceBetweenBlockPaddingTop: number;
  experienceHeaderPaddingBottom: number;
  listFontSize: number;
  listSpacing: number;
  spacerAfterExperienceBlock: number;
  spacerEndExperiences: number;

  experienceBadgeBg: string;
  experienceBadgeText: string;
  experienceBadgeFontSize: number;

  footerRuleColor: string;
  footerRuleThickness: number;
  footerRuleMarginBottom: number;
  footerLineFontSize: number;

  pageMarginTop: number;
  pageMarginBottom: number;
  pageMarginLeft: number;
  pageMarginRight: number;
};

function resolveTheme(colors: TemplateConfig['colors']): CvTemplateTheme {
  return {
    headerBackground: colors.primary,
    headerNameColor: '#ffffff',
    headerMetaColor: '#e2e8f0',
    headerPadding: 14,
    headerUsesAccentBorder: false,
    docTitleFontSize: 12,
    docTitleColor: colors.primary,
    docTitleRuleColor: colors.secondary,
    docTitleRuleThickness: 2,
    docTitleRuleMarginTop: 8,
    spacerAfterDocTitle: 28,
    infoTableBorderColor: '#E2E8F0',
    infoTableBorderWidth: 0.5,
    infoTableBorderRadius: 6,
    infoTableAlternateRowBg: '#F8FAFC',
    infoTableInnerDividerColor: '#E2E8F0',
    infoTableLabelFontSize: 8,
    infoTableValueFontSize: 9,
    sectionHeadingUppercase: true,
    sectionHeadingFontSize: 10,
    sectionRuleColor: colors.secondary,
    sectionRuleThickness: 1.5,
    sectionRuleMarginTop: 4,
    sectionBlockPaddingBottom: 18,
    summaryFontSize: 9,
    summaryLineHeight: 1.7,
    spacerAfterSummary: 34,
    spacerAfterSkills: 34,
    spacerAfterEducationBlock: 6,
    spacerAfterEducationSection: 26,
    educationDegreeFontSize: 9,
    educationSchoolFontSize: 8,
    educationYearFontSize: 8,
    experiencePaddingLeft: 12,
    experienceLeftBorderWidth: 0,
    experienceLeftBorderColor: colors.secondary,
    experienceRoleFontSize: 10,
    experienceDateFontSize: 8,
    experienceBetweenBlockPaddingTop: 30,
    experienceHeaderPaddingBottom: 4,
    listFontSize: 8,
    listSpacing: 2,
    spacerAfterExperienceBlock: 24,
    spacerEndExperiences: 18,
    experienceBadgeBg: '#deeeff',
    experienceBadgeText: colors.primary,
    experienceBadgeFontSize: 7,
    footerRuleColor: colors.secondary,
    footerRuleThickness: 0.5,
    footerRuleMarginBottom: 8,
    footerLineFontSize: 7,
    pageMarginTop: 100,
    pageMarginBottom: 69,
    pageMarginLeft: 48,
    pageMarginRight: 48,
  };
}

function addSectionHeading(
  elements: Spec['elements'],
  id: string,
  text: string,
  children: string[],
  colors: TemplateConfig['colors'],
  theme: CvTemplateTheme,
) {
  const label = theme.sectionHeadingUppercase ? text.toUpperCase() : text;
  elements[`${id}-container`] = {
    type: 'View',
    props: {
      paddingBottom: theme.sectionBlockPaddingBottom,
    },
    children: [`${id}-heading`, `${id}-line`],
  };
  elements[`${id}-heading`] = {
    type: 'Text',
    props: {
      text: label,
      fontSize: theme.sectionHeadingFontSize + 0.5,
      color: colors.primary,
      fontWeight: 'bold',
    },
    children: [],
  };
  elements[`${id}-line`] = {
    type: 'Divider',
    props: {
      color: theme.sectionRuleColor,
      thickness: theme.sectionRuleThickness,
      marginTop: theme.sectionRuleMarginTop,
      marginBottom: 0,
    },
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
  theme: CvTemplateTheme,
) {
  if (rows.length === 0) return;

  const tableChildren: string[] = [];
  rows.forEach((row, i) => {
    elements[`${id}-row-${i}`] = {
      type: 'Row',
      props: {
        alignItems: 'flex-start',
        gap: 12,
      },
      children: [`${id}-labelcol-${i}`, `${id}-valuecol-${i}`],
    };
    elements[`${id}-labelcol-${i}`] = {
      type: 'Column',
      props: {
        justifyContent: 'center',
        flex: 0.2,
      },
      children: [`${id}-label-${i}`],
    };
    elements[`${id}-valuecol-${i}`] = {
      type: 'Column',
      props: {
        justifyContent: 'center',
        flex: 0.8,
      },
      children: [`${id}-value-${i}`],
    };
    elements[`${id}-rowwrap-${i}`] = {
      type: 'View',
      props: {
        paddingTop: 7,
        paddingBottom: 7,
        paddingLeft: 14,
        paddingRight: 14,
        backgroundColor: theme.infoTableAlternateRowBg != null && i % 2 === 0 ? theme.infoTableAlternateRowBg : null,
      },
      children: [`${id}-row-${i}`],
    };
    elements[`${id}-label-${i}`] = {
      type: 'Text',
      props: {
        text: row.label,
        fontSize: theme.infoTableLabelFontSize,
        color: colors.primary,
        fontWeight: 'bold',
      },
      children: [],
    };
    elements[`${id}-value-${i}`] = {
      type: 'Text',
      props: {
        text: row.value,
        fontSize: theme.infoTableValueFontSize,
        color: colors.text,
        lineHeight: 1.5,
      },
      children: [],
    };
    tableChildren.push(`${id}-rowwrap-${i}`);

    if (i < rows.length - 1) {
      elements[`${id}-div-${i}`] = {
        type: 'Divider',
        props: { color: theme.infoTableInnerDividerColor, thickness: 0.5, marginTop: 0, marginBottom: 0 },
        children: [],
      };
      tableChildren.push(`${id}-div-${i}`);
    }
  });

  elements[`${id}-table`] = {
    type: 'View',
    props: {
      borderWidth: theme.infoTableBorderWidth,
      borderColor: theme.infoTableBorderColor,
      borderRadius: theme.infoTableBorderRadius,
    },
    children: tableChildren,
  };
  children.push(`${id}-table`);
}

type BlockBuilder = (
  elements: Spec['elements'],
  pageChildren: string[],
  data: Partial<ExtractedCV>,
  block: TemplateBlock,
  colors: TemplateConfig['colors'],
  theme: CvTemplateTheme,
) => void;

function addProfileInfoBlock(
  elements: Spec['elements'],
  pageChildren: string[],
  data: Partial<ExtractedCV>,
  block: TemplateBlock,
  colors: TemplateConfig['colors'],
  theme: CvTemplateTheme,
) {
  if (!data.personalInfo) return;
  const lang = data.language ?? 'fr';
  const L = CV_LABELS[lang];
  const pi = data.personalInfo;
  const rows: { label: string; value: string }[] = [];
  if (pi.title) rows.push({ label: L.poste, value: pi.title });
  if (pi.yearsOfExperience) rows.push({ label: L.yearsOfExperience, value: pi.yearsOfExperience });
  if (pi.location) rows.push({ label: L.location, value: pi.location });
  if (pi.availability) rows.push({ label: L.availability, value: pi.availability });
  if (pi.email && block.variant === 'detailed') rows.push({ label: L.email, value: pi.email });
  if (pi.phone && block.variant === 'detailed') rows.push({ label: L.phone, value: pi.phone });
  addInfoTable(elements, 'info', rows, pageChildren, colors, theme);
  elements['spacer-info'] = { type: 'Spacer', props: { height: 34 }, children: [] };
  pageChildren.push('spacer-info');
}

function addSummaryBlock(
  elements: Spec['elements'],
  pageChildren: string[],
  data: Partial<ExtractedCV>,
  _block: TemplateBlock,
  colors: TemplateConfig['colors'],
  theme: CvTemplateTheme,
) {
  if (!data.summary) return;
  const lang = data.language ?? 'fr';
  const L = CV_LABELS[lang];
  addSectionHeading(elements, 'summary', L.summaryHeading, pageChildren, colors, theme);
  elements['summary-text'] = {
    type: 'RichText',
    props: {
      text: data.summary,
      fontSize: theme.summaryFontSize,
      color: colors.text,
      lineHeight: theme.summaryLineHeight,
    },
    children: [],
  };
  pageChildren.push('summary-text');
  elements['spacer-summary'] = {
    type: 'Spacer',
    props: { height: theme.spacerAfterSummary + (data.sectionSpacing?.summary ?? 0) },
    children: [],
  };
  pageChildren.push('spacer-summary');
}

function addSkillsBlock(
  elements: Spec['elements'],
  pageChildren: string[],
  data: Partial<ExtractedCV>,
  block: TemplateBlock,
  colors: TemplateConfig['colors'],
  theme: CvTemplateTheme,
) {
  const skills = data.skills;
  if (!skills) return;

  const lang = data.language ?? 'fr';
  const L = CV_LABELS[lang];

  const cats: { key: keyof typeof skills; label: string }[] = [
    { key: 'technologies', label: L.technologies },
    { key: 'softSkills', label: L.softSkills },
    { key: 'expertises', label: L.expertises },
    { key: 'methodologies', label: L.methodologies },
  ];

  const categoryRows = cats
    .map(({ key, label }) => {
      const rawItems = (skills[key] ?? []).filter(Boolean);
      const names = rawItems
        .filter((item) => typeof item === 'string' || item.added !== false)
        .map((item) => (typeof item === 'string' ? item : item.name))
        .filter(Boolean);
      if (block.variant === 'compact' && names.length > 5) {
        return { label, value: names.slice(0, 5).join(', ') };
      }
      if (names.length > 0) return { label, value: names.join(', ') };
      return null;
    })
    .filter((row): row is { label: string; value: string } => row !== null);

  if (categoryRows.length === 0) return;

  addSectionHeading(elements, 'skills', L.skillsHeading, pageChildren, colors, theme);
  addInfoTable(elements, 'skills', categoryRows, pageChildren, colors, theme);
  elements['spacer-skills'] = {
    type: 'Spacer',
    props: { height: theme.spacerAfterSkills + (data.sectionSpacing?.skills ?? 0) },
    children: [],
  };
  pageChildren.push('spacer-skills');
}

function addEducationBlock(
  elements: Spec['elements'],
  pageChildren: string[],
  data: Partial<ExtractedCV>,
  block: TemplateBlock,
  colors: TemplateConfig['colors'],
  theme: CvTemplateTheme,
) {
  const education = (data.education ?? []).filter(Boolean);
  if (education.length === 0) return;
  const lang = data.language ?? 'fr';
  const L = CV_LABELS[lang];
  addSectionHeading(elements, 'edu', L.educationHeading, pageChildren, colors, theme);

  const visibleEducation = block.variant === 'compact' ? education.slice(0, 2) : education;
  const itemHeadingColor = colors.text;

  visibleEducation.forEach((edu, i) => {
    elements[`edu-${i}-row`] = {
      type: 'Row',
      props: { justifyContent: 'space-between', alignItems: 'center', gap: 8 },
      children: [`edu-${i}-info`, `edu-${i}-year`],
    };
    elements[`edu-${i}-info`] = {
      type: 'Column',
      props: { gap: 1 },
      children: [`edu-${i}-degree`, `edu-${i}-school`],
    };
    elements[`edu-${i}-degree`] = {
      type: 'Text',
      props: {
        text: edu.degree ?? '',
        fontSize: theme.educationDegreeFontSize,
        color: itemHeadingColor,
        fontWeight: 'bold',
      },
      children: [],
    };
    elements[`edu-${i}-school`] = {
      type: 'Text',
      props: {
        text: edu.school ?? '',
        fontSize: theme.educationSchoolFontSize,
        color: colors.text,
        fontStyle: 'italic',
      },
      children: [],
    };
    elements[`edu-${i}-year`] = {
      type: 'Text',
      props: {
        text: edu.year ?? '',
        fontSize: theme.educationYearFontSize,
        color: colors.lightText,
      },
      children: [],
    };
    pageChildren.push(`edu-${i}-row`);
    elements[`edu-${i}-spacer`] = {
      type: 'Spacer',
      props: { height: theme.spacerAfterEducationBlock + (edu.spacingAfter ?? 0) },
      children: [],
    };
    pageChildren.push(`edu-${i}-spacer`);
  });

  elements['spacer-edu'] = { type: 'Spacer', props: { height: theme.spacerAfterEducationSection }, children: [] };
  pageChildren.push('spacer-edu');
}

function addExperiencesBlock(
  elements: Spec['elements'],
  pageChildren: string[],
  data: Partial<ExtractedCV>,
  block: TemplateBlock,
  colors: TemplateConfig['colors'],
  theme: CvTemplateTheme,
) {
  const experiences = (data.experiences ?? []).filter(Boolean);
  if (experiences.length === 0) return;
  const lang = data.language ?? 'fr';
  const L = CV_LABELS[lang];
  addSectionHeading(elements, 'exp', L.experiencesHeading, pageChildren, colors, theme);
  const itemHeadingColor = colors.text;

  experiences.forEach((exp, i) => {
    const companyText = (exp.company ?? '').toUpperCase();
    const roleText = exp.role ?? '';
    const dateText = `${exp.startDate ?? ''} - ${exp.endDate ?? 'Present'}`;
    const expSkills = block.variant === 'compact' ? [] : (exp.skills ?? []).filter(Boolean);
    const descriptions =
      block.variant === 'compact' ? (exp.description ?? []).filter(Boolean).slice(0, 3) : (exp.description ?? []).filter(Boolean);

    const expInnerChildren = [
      `exp-${i}-header-wrap`,
      ...(descriptions.length > 0 ? [`exp-${i}-desc-spacer`, `exp-${i}-desc`] : []),
      ...(expSkills.length > 0 ? [`exp-${i}-skills-spacer`, `exp-${i}-skills`] : []),
    ];

    if (theme.experienceLeftBorderWidth > 0) {
      elements[`exp-${i}-wrapper`] = {
        type: 'Row',
        props: { alignItems: 'stretch', gap: 10 },
        children: [`exp-${i}-accent`, `exp-${i}-col`],
      };
      elements[`exp-${i}-accent`] = {
        type: 'CvAccentBar',
        props: {
          width: theme.experienceLeftBorderWidth,
          backgroundColor: theme.experienceLeftBorderColor,
          borderRadius: 1,
        },
        children: [],
      };
      elements[`exp-${i}-col`] = {
        type: 'Column',
        props: { flex: 1 },
        children: expInnerChildren,
      };
    } else {
      elements[`exp-${i}-wrapper`] = {
        type: 'View',
        props: {
          paddingLeft: theme.experiencePaddingLeft,
        },
        children: expInnerChildren,
      };
    }

    elements[`exp-${i}-header-wrap`] = {
      type: 'View',
      props: {
        paddingTop: i === 0 ? 0 : theme.experienceBetweenBlockPaddingTop,
        paddingBottom: theme.experienceHeaderPaddingBottom,
      },
      children: [`exp-${i}-header`],
    };

    elements[`exp-${i}-header`] = {
      type: 'Row',
      props: { justifyContent: 'space-between', alignItems: 'flex-end', gap: 8 },
      children: [
        `exp-${i}-heading-left`,
        `exp-${i}-date`,
      ],
    };

    elements[`exp-${i}-heading-left`] = {
      type: 'Row',
      props: { alignItems: 'center', gap: 4 },
      children: [
        `exp-${i}-role`,
        ...(companyText ? [`exp-${i}-company`] : []),
      ],
    };

    elements[`exp-${i}-role`] = {
      type: 'Text',
      props: {
        text: roleText,
        fontSize: theme.experienceRoleFontSize,
        color: itemHeadingColor,
        fontWeight: 'bold',
      },
      children: [],
    };
    if (companyText) {
      elements[`exp-${i}-company`] = {
        type: 'Text',
        props: {
          text: `- ${companyText}`,
          fontSize: theme.experienceRoleFontSize,
          color: colors.lightText,
          fontWeight: null,
        },
        children: [],
      };
    }
    elements[`exp-${i}-date`] = {
      type: 'Text',
      props: {
        text: dateText,
        fontSize: theme.experienceDateFontSize,
        color: colors.lightText,
      },
      children: [],
    };

    if (descriptions.length > 0) {
      elements[`exp-${i}-desc-spacer`] = { type: 'Spacer', props: { height: 4 }, children: [] };
      elements[`exp-${i}-desc`] = {
        type: 'List',
        props: {
          items: descriptions,
          ordered: false,
          fontSize: theme.listFontSize,
          color: colors.text,
          spacing: theme.listSpacing,
        },
        children: [],
      };
    }

    if (expSkills.length > 0) {
      elements[`exp-${i}-skills-spacer`] = { type: 'Spacer', props: { height: 10 }, children: [] };
      elements[`exp-${i}-skills`] = {
        type: 'BadgeList',
        props: {
          items: expSkills,
          bgColor: theme.experienceBadgeBg,
          textColor: theme.experienceBadgeText,
          fontSize: theme.experienceBadgeFontSize,
        },
        children: [],
      };
    }

    pageChildren.push(`exp-${i}-wrapper`);
    elements[`exp-${i}-spacer`] = {
      type: 'Spacer',
      props: { height: theme.spacerAfterExperienceBlock + (exp.spacingAfter ?? 0) },
      children: [],
    };
    pageChildren.push(`exp-${i}-spacer`);
  });

  elements['spacer-exp-end'] = { type: 'Spacer', props: { height: theme.spacerEndExperiences }, children: [] };
  pageChildren.push('spacer-exp-end');
}

const blockBuilders: Record<TemplateBlockType, BlockBuilder> = {
  'profile-info': addProfileInfoBlock,
  summary: addSummaryBlock,
  skills: addSkillsBlock,
  education: addEducationBlock,
  experiences: addExperiencesBlock,
};

function buildActiveBlocks(config: TemplateConfig): TemplateBlock[] {
  return config.blocks.filter((block) => block.enabled);
}

export function buildCvDossierLayoutSpec(
  data: Partial<ExtractedCV>,
  templateConfig?: Partial<TemplateConfig>,
): Spec {
  const config = mergeTemplateWithDefaults(templateConfig);
  const colors = {
    ...DEFAULT_TEMPLATE_CONFIG.colors,
    ...config.colors,
  };
  const theme = resolveTheme(colors);
  const blocks = buildActiveBlocks(config);

  const elements: Spec['elements'] = {};
  const pageChildren: string[] = [];
  const consultantName = data.personalInfo
    ? `${data.personalInfo.firstName ?? ''} ${data.personalInfo.lastName ?? ''}`.trim()
    : '';
  const headerTextColor = theme.headerNameColor;
  const companyName = config.header.companyName.trim();
  const lang = (data.language as 'fr' | 'en') ?? 'fr';
  const isDefaultTitle = config.header.documentTitle === DEFAULT_TEMPLATE_CONFIG.header.documentTitle;
  const documentTitle = (!config.header.documentTitle.trim() || isDefaultTitle)
    ? CV_LABELS[lang].docTitle
    : config.header.documentTitle.trim();

  elements['header-band'] = {
    type: 'FixedView',
    props: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: theme.headerBackground,
      ...(theme.headerUsesAccentBorder
        ? {
            borderWidth: 1,
            borderColor: colors.secondary,
          }
        : {}),
    },
    children: ['header-inner'],
  };
  elements['header-inner'] = {
    type: 'Row',
    props: {
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: theme.headerPadding,
      gap: 16,
    },
    children: ['header-left', 'header-right'],
  };

  elements['header-left'] = {
    type: 'Column',
    props: {
      gap: 2,
      flex: 1,
    },
    children: config.header.showCandidateName && consultantName ? ['header-name'] : [],
  };
  if (config.header.showCandidateName && consultantName) {
    elements['header-name'] = {
      type: 'Text',
      props: {
        text: consultantName.toUpperCase(),
        fontSize: 10,
        color: headerTextColor,
        fontWeight: 'bold',
      },
      children: [],
    };
  }

  const headerRightChildren = ['header-brand-top'];
  if (config.header.tagLine.trim()) headerRightChildren.push('header-brand-tagline');
  if (config.header.metaLine.trim()) headerRightChildren.push('header-brand-meta');

  elements['header-right'] = {
    type: 'Column',
    props: {
      gap: 2,
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
    children: headerRightChildren,
  };
  elements['header-brand-top'] = {
    type: 'Row',
    props: {
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 8,
    },
    children: ['header-brand-name', 'header-logo'],
  };
  elements['header-brand-name'] = {
    type: 'Text',
    props: {
      text: companyName || '',
      fontSize: 9,
      color: headerTextColor,
      fontWeight: 'bold',
      align: 'right',
    },
    children: [],
  };

  const logoSrc = resolvePdfLogoSrc(config.logo, WORDMARK_FALLBACK_LOGO_SRC);
  elements['header-logo'] = {
    type: 'FixedImage',
    props: {
      src: logoSrc,
      width: config.logo.width,
      height: config.logo.height,
      objectFit: 'contain',
    },
    children: [],
  };

  if (config.header.tagLine.trim()) {
    elements['header-brand-tagline'] = {
      type: 'Text',
      props: {
        text: config.header.tagLine.trim(),
        fontSize: 7,
        color: theme.headerMetaColor,
        align: 'right',
      },
      children: [],
    };
  }
  if (config.header.metaLine.trim()) {
    elements['header-brand-meta'] = {
      type: 'Text',
      props: {
        text: config.header.metaLine.trim(),
        fontSize: 7,
        color: theme.headerMetaColor,
        align: 'right',
      },
      children: [],
    };
  }
  pageChildren.push('header-band');

  elements['doc-title'] = {
    type: 'Text',
    props: {
      text: documentTitle,
      fontSize: theme.docTitleFontSize,
      color: theme.docTitleColor,
      fontWeight: 'bold',
      align: 'center',
    },
    children: [],
  };
  pageChildren.push('doc-title');

  elements['doc-title-accent'] = {
    type: 'Divider',
    props: {
      color: theme.docTitleRuleColor,
      thickness: theme.docTitleRuleThickness,
      marginTop: theme.docTitleRuleMarginTop,
      marginBottom: 0,
    },
    children: [],
  };
  pageChildren.push('doc-title-accent');

  elements['spacer-doc-title'] = { type: 'Spacer', props: { height: theme.spacerAfterDocTitle }, children: [] };
  pageChildren.push('spacer-doc-title');

  for (const block of blocks) {
    blockBuilders[block.type]?.(elements, pageChildren, data, block, colors, theme);
  }

  // Remove trailing spacers to prevent a blank last page
  while (pageChildren.length > 0 && elements[pageChildren[pageChildren.length - 1]]?.type === 'Spacer') {
    pageChildren.pop();
  }

  elements['footer-wrapper'] = {
    type: 'FixedView',
    props: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      paddingTop: 10,
      paddingBottom: 12,
      paddingLeft: theme.pageMarginLeft,
      paddingRight: theme.pageMarginRight,
    },
    children: ['footer-divider', 'footer-content'],
  };
  elements['footer-divider'] = {
    type: 'Divider',
    props: {
      color: theme.footerRuleColor,
      thickness: theme.footerRuleThickness,
      marginTop: 0,
      marginBottom: theme.footerRuleMarginBottom,
    },
    children: [],
  };
  elements['footer-content'] = {
    type: 'Row',
    props: { justifyContent: 'space-between', alignItems: 'center', gap: 12 },
    children: ['footer-left', 'footer-center', 'footer-right'],
  };

  const footerLines: Array<{ id: string; text: string; align: 'left' | 'center' | 'right'; color: string; weight?: 'bold' }> = [
    { id: 'footer-left', text: config.footer.leftText, align: 'left', color: colors.primary, weight: 'bold' },
    { id: 'footer-center', text: config.footer.centerText, align: 'center', color: colors.lightText },
    { id: 'footer-right', text: config.footer.rightText, align: 'right', color: colors.lightText },
  ];
  footerLines.forEach((line) => {
    elements[line.id] = {
      type: 'Text',
      props: {
        text: line.text,
        fontSize: theme.footerLineFontSize,
        color: line.color,
        fontWeight: line.weight,
        align: line.align,
      },
      children: [],
    };
  });
  pageChildren.push('footer-wrapper');

  elements['doc'] = {
    type: 'Document',
    props: {
      title: consultantName ? `CV ${consultantName}` : 'CV',
      author: companyName || config.footer.leftText || 'CV',
      subject: documentTitle,
    },
    children: ['page'],
  };
  elements['page'] = {
    type: 'Page',
    props: {
      backgroundColor: colors.background,
      marginTop: theme.pageMarginTop,
      marginBottom: theme.pageMarginBottom,
      marginLeft: theme.pageMarginLeft,
      marginRight: theme.pageMarginRight,
      size: 'A4',
    },
    children: pageChildren,
  };

  return { root: 'doc', elements };
}
