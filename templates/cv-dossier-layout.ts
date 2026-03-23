import type { Spec } from '@json-render/core';
import type { ExtractedCV, TemplateConfig } from '@/lib/schema';
import { DEFAULT_TEMPLATE_CONFIG } from '@/lib/schema';

// ─── Thème visuel (tous les choix hors `TemplateConfig.colors` de l’org) ───

export type CvDossierResolvedTheme = {
  headerBackground: string;
  headerNameColor: string;
  headerPadding: number;
  headerFallbackWordmarkColor: string;

  spacerAfterHeader: number;

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
  educationRowGapSpacer: number;

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

  pageMarginTop: number;
  pageMarginBottom: number;
  pageMarginLeft: number;
  pageMarginRight: number;

  footerRuleColor: string;
  footerRuleThickness: number;
  footerRuleMarginBottom: number;
  footerLine1FontSize: number;
  footerLine2FontSize: number;
};

function resolveHimeoTheme(colors: TemplateConfig['colors']): CvDossierResolvedTheme {
  return {
    headerBackground: colors.primary,
    headerNameColor: '#ffffff',
    headerPadding: 14,
    headerFallbackWordmarkColor: '#ffffff',

    spacerAfterHeader: 47,

    docTitleFontSize: 12,
    docTitleColor: colors.primary,
    docTitleRuleColor: colors.secondary,
    docTitleRuleThickness: 2,
    docTitleRuleMarginTop: 8,
    spacerAfterDocTitle: 16,

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
    sectionBlockPaddingBottom: 8,

    summaryFontSize: 9,
    summaryLineHeight: 1.7,
    spacerAfterSummary: 20,

    spacerAfterSkills: 20,
    spacerAfterEducationBlock: 6,
    spacerAfterEducationSection: 14,
    educationDegreeFontSize: 9,
    educationSchoolFontSize: 8,
    educationYearFontSize: 8,
    educationRowGapSpacer: 6,

    experiencePaddingLeft: 12,
    experienceLeftBorderWidth: 0,
    experienceLeftBorderColor: colors.secondary,
    experienceRoleFontSize: 10,
    experienceDateFontSize: 8,
    experienceBetweenBlockPaddingTop: 30,
    experienceHeaderPaddingBottom: 15,
    listFontSize: 8,
    listSpacing: 2,
    spacerAfterExperienceBlock: 12,
    spacerEndExperiences: 8,

    experienceBadgeBg: '#deeeff',
    experienceBadgeText: colors.primary,
    experienceBadgeFontSize: 7,

    pageMarginTop: 56,
    pageMarginBottom: 45,
    pageMarginLeft: 48,
    pageMarginRight: 48,

    footerRuleColor: colors.secondary,
    footerRuleThickness: 0.5,
    footerRuleMarginBottom: 8,
    footerLine1FontSize: 7,
    footerLine2FontSize: 7,
  };
}

/** Esneo : surfaces claires façon shadcn — texte foncé sur fonds neutres / violet très léger. */
function resolveEsneoTheme(colors: TemplateConfig['colors']): CvDossierResolvedTheme {
  return {
    headerBackground: '#f5f3ff',
    headerNameColor: colors.text,
    headerPadding: 16,
    headerFallbackWordmarkColor: colors.primary,

    spacerAfterHeader: 40,

    docTitleFontSize: 13,
    docTitleColor: colors.text,
    docTitleRuleColor: colors.secondary,
    docTitleRuleThickness: 2,
    docTitleRuleMarginTop: 10,
    spacerAfterDocTitle: 20,

    infoTableBorderColor: '#e4e4e7',
    infoTableBorderWidth: 1,
    infoTableBorderRadius: 8,
    infoTableAlternateRowBg: '#fafafa',
    infoTableInnerDividerColor: '#e4e4e7',
    infoTableLabelFontSize: 8,
    infoTableValueFontSize: 9,

    sectionHeadingUppercase: false,
    sectionHeadingFontSize: 11,
    sectionRuleColor: colors.secondary,
    sectionRuleThickness: 2,
    sectionRuleMarginTop: 6,
    sectionBlockPaddingBottom: 10,

    summaryFontSize: 9,
    summaryLineHeight: 1.75,
    spacerAfterSummary: 22,

    spacerAfterSkills: 22,
    spacerAfterEducationBlock: 8,
    spacerAfterEducationSection: 16,
    educationDegreeFontSize: 10,
    educationSchoolFontSize: 8,
    educationYearFontSize: 8,
    educationRowGapSpacer: 8,

    experiencePaddingLeft: 14,
    experienceLeftBorderWidth: 3,
    experienceLeftBorderColor: colors.secondary,
    experienceRoleFontSize: 10,
    experienceDateFontSize: 8,
    experienceBetweenBlockPaddingTop: 28,
    experienceHeaderPaddingBottom: 12,
    listFontSize: 8,
    listSpacing: 3,
    spacerAfterExperienceBlock: 14,
    spacerEndExperiences: 10,

    experienceBadgeBg: '#d1fae5',
    experienceBadgeText: '#047857',
    experienceBadgeFontSize: 7,

    pageMarginTop: 52,
    pageMarginBottom: 48,
    pageMarginLeft: 44,
    pageMarginRight: 44,

    footerRuleColor: '#e4e4e7',
    footerRuleThickness: 1,
    footerRuleMarginBottom: 10,
    footerLine1FontSize: 7,
    footerLine2FontSize: 7,
  };
}

/** Variantes de marque pour la même trame « dossier de compétences » (Himeo vs Esneo). */
export type CvDossierLayoutVariant = {
  docTitle: string;
  documentSubject: string;
  /** Sans `logo.url` dans le template : composant Himeo SVG vs texte Esneo */
  headerLogoFallback: 'himeo' | 'esneo';
  /**
   * Couleurs par défaut pour ce gabarit (avant fusion avec `templateConfig.colors` de l’org).
   * L’org peut toujours surcharger via le template en base.
   */
  defaultColorOverrides?: Partial<TemplateConfig['colors']>;
  resolveTheme: (colors: TemplateConfig['colors']) => CvDossierResolvedTheme;
};

export const HIMEO_DOSSIER_VARIANT: CvDossierLayoutVariant = {
  docTitle: 'DOSSIER DE COMPÉTENCES TECHNIQUES',
  documentSubject: 'Dossier de compétences techniques',
  headerLogoFallback: 'himeo',
  resolveTheme: resolveHimeoTheme,
};

/**
 * Esneo : palette claire type shadcn (`background`, `border` zinc-200, `foreground` / `muted-foreground`),
 * primary violet et secondary émeraude lisibles sur fond clair.
 */
export const ESNEO_DOSSIER_VARIANT: CvDossierLayoutVariant = {
  docTitle: 'Dossier de compétences',
  documentSubject: 'Dossier de compétences techniques — Esneo',
  headerLogoFallback: 'esneo',
  defaultColorOverrides: {
    primary: '#6d28d9',
    secondary: '#10b981',
    background: '#fafafa',
    text: '#18181b',
    lightText: '#71717a',
  },
  resolveTheme: resolveEsneoTheme,
};

// ─── Helpers ────────────────────────────────────────────────────

function addSectionHeading(
  elements: Spec['elements'],
  id: string,
  text: string,
  children: string[],
  colors: TemplateConfig['colors'],
  theme: CvDossierResolvedTheme,
) {
  const label = theme.sectionHeadingUppercase ? text.toUpperCase() : text;
  elements[`${id}-container`] = {
    type: 'View',
    props: {
      padding: null,
      paddingTop: null,
      paddingBottom: theme.sectionBlockPaddingBottom,
      paddingLeft: null,
      paddingRight: null,
      margin: null,
      backgroundColor: null,
      borderWidth: null,
      borderColor: null,
      borderRadius: null,
      flex: null,
      alignItems: null,
      justifyContent: null,
    },
    children: [`${id}-heading`, `${id}-line`],
  };
  elements[`${id}-heading`] = {
    type: 'Text',
    props: {
      text: label,
      fontSize: theme.sectionHeadingFontSize,
      color: colors.primary,
      fontWeight: 'bold',
      fontStyle: null,
      align: null,
      lineHeight: null,
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
  theme: CvDossierResolvedTheme,
) {
  if (rows.length === 0) return;

  const tableChildren: string[] = [];
  rows.forEach((row, i) => {
    elements[`${id}-row-${i}`] = {
      type: 'Row',
      props: {
        justifyContent: null,
        alignItems: 'flex-start',
        gap: 12,
        padding: null,
        flex: null,
        wrap: null,
      },
      children: [`${id}-labelcol-${i}`, `${id}-valuecol-${i}`],
    };
    elements[`${id}-labelcol-${i}`] = {
      type: 'Column',
      props: {
        gap: null,
        alignItems: null,
        justifyContent: 'center',
        padding: null,
        flex: 0.2,
      },
      children: [`${id}-label-${i}`],
    };
    elements[`${id}-valuecol-${i}`] = {
      type: 'Column',
      props: {
        gap: null,
        alignItems: null,
        justifyContent: 'center',
        padding: null,
        flex: 0.8,
      },
      children: [`${id}-value-${i}`],
    };
    const altBg = theme.infoTableAlternateRowBg;
    elements[`${id}-rowwrap-${i}`] = {
      type: 'View',
      props: {
        padding: null,
        paddingTop: 7,
        paddingBottom: 7,
        paddingLeft: 14,
        paddingRight: 14,
        margin: null,
        backgroundColor: altBg != null && i % 2 === 0 ? altBg : null,
        borderWidth: null,
        borderColor: null,
        borderRadius: null,
        flex: null,
        alignItems: null,
        justifyContent: null,
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
        fontStyle: null,
        align: null,
        lineHeight: null,
      },
      children: [],
    };
    elements[`${id}-value-${i}`] = {
      type: 'Text',
      props: {
        text: row.value,
        fontSize: theme.infoTableValueFontSize,
        color: colors.text,
        fontWeight: null,
        fontStyle: null,
        align: null,
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
      padding: null,
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0,
      margin: null,
      backgroundColor: null,
      borderWidth: theme.infoTableBorderWidth,
      borderColor: theme.infoTableBorderColor,
      borderRadius: theme.infoTableBorderRadius,
      flex: null,
      alignItems: null,
      justifyContent: null,
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
  theme: CvDossierResolvedTheme,
) => void;

function createSectionBuilders(): Record<string, SectionBuilder> {
  return {
    summary(elements, pageChildren, data, colors, theme) {
      if (!data.summary) return;
      addSectionHeading(elements, 'summary', 'Synthèse du profil', pageChildren, colors, theme);
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
      elements['spacer-summary'] = { type: 'Spacer', props: { height: theme.spacerAfterSummary + (data.sectionSpacing?.summary ?? 0) }, children: [] };
      pageChildren.push('spacer-summary');
    },

    skills(elements, pageChildren, data, colors, theme) {
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

      addSectionHeading(elements, 'skills', 'Compétences', pageChildren, colors, theme);
      addInfoTable(elements, 'skills', categoryRows, pageChildren, colors, theme);
      elements['spacer-skills'] = { type: 'Spacer', props: { height: theme.spacerAfterSkills + (data.sectionSpacing?.skills ?? 0) }, children: [] };
      pageChildren.push('spacer-skills');
    },

    education(elements, pageChildren, data, colors, theme) {
      const education = (data.education ?? []).filter(Boolean);
      if (education.length === 0) return;
      addSectionHeading(elements, 'edu', 'Formations', pageChildren, colors, theme);

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
          props: {
            text: edu.degree ?? '',
            fontSize: theme.educationDegreeFontSize,
            color: colors.primary,
            fontWeight: 'bold',
            fontStyle: null,
            align: null,
            lineHeight: null,
          },
          children: [],
        };
        elements[`edu-${i}-school`] = {
          type: 'Text',
          props: {
            text: edu.school ?? '',
            fontSize: theme.educationSchoolFontSize,
            color: colors.text,
            fontWeight: null,
            fontStyle: 'italic',
            align: null,
            lineHeight: null,
          },
          children: [],
        };
        elements[`edu-${i}-year`] = {
          type: 'Text',
          props: {
            text: edu.year ?? '',
            fontSize: theme.educationYearFontSize,
            color: colors.lightText,
            fontWeight: null,
            fontStyle: null,
            align: null,
            lineHeight: null,
          },
          children: [],
        };
        pageChildren.push(`edu-${i}-row`);
        elements[`edu-${i}-spacer`] = { type: 'Spacer', props: { height: theme.spacerAfterEducationBlock + (edu.spacingAfter ?? 0) }, children: [] };
        pageChildren.push(`edu-${i}-spacer`);
      });

      elements['spacer-edu'] = { type: 'Spacer', props: { height: theme.spacerAfterEducationSection }, children: [] };
      pageChildren.push('spacer-edu');
    },

    experiences(elements, pageChildren, data, colors, theme) {
      const experiences = (data.experiences ?? []).filter(Boolean);
      if (experiences.length === 0) return;
      addSectionHeading(elements, 'exp', 'Expériences professionnelles', pageChildren, colors, theme);

      experiences.forEach((exp, i) => {
        const roleText = exp.role ?? '';
        const companyText = (exp.company ?? '').toUpperCase();
        const dateText = `${exp.startDate ?? ''} – ${exp.endDate ?? 'Présent'}`;
        const companyDomain = exp.companyDomain?.trim();
        const expSkills = (exp.skills ?? []).filter(Boolean);

        const expInnerChildren = [
          `exp-${i}-header-wrap`,
          ...((exp.description ?? []).filter(Boolean).length > 0 ? [`exp-${i}-desc-spacer`, `exp-${i}-desc`] : []),
          ...(expSkills.length > 0 ? [`exp-${i}-skills-spacer`, `exp-${i}-skills`] : []),
        ];

        if (theme.experienceLeftBorderWidth > 0) {
          elements[`exp-${i}-wrapper`] = {
            type: 'Row',
            props: {
              justifyContent: null,
              alignItems: 'stretch',
              gap: 10,
              padding: null,
              flex: null,
              wrap: null,
            },
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
            props: {
              gap: null,
              flex: 1,
              alignItems: null,
              justifyContent: null,
              padding: null,
            },
            children: expInnerChildren,
          };
        } else {
          elements[`exp-${i}-wrapper`] = {
            type: 'View',
            props: {
              padding: null,
              paddingTop: 0,
              paddingBottom: 0,
              paddingLeft: theme.experiencePaddingLeft,
              paddingRight: 0,
              margin: null,
              backgroundColor: null,
              borderWidth: null,
              borderColor: theme.experienceLeftBorderColor,
              borderRadius: null,
              flex: null,
              alignItems: null,
              justifyContent: null,
            },
            children: expInnerChildren,
          };
        }

        elements[`exp-${i}-header-wrap`] = {
          type: 'View',
          props: {
            padding: null,
            paddingTop: i === 0 ? 0 : theme.experienceBetweenBlockPaddingTop,
            paddingBottom: theme.experienceHeaderPaddingBottom,
            paddingLeft: 0,
            paddingRight: 0,
            margin: null,
            backgroundColor: null,
            borderWidth: null,
            borderColor: null,
            borderRadius: null,
            flex: null,
            alignItems: null,
            justifyContent: null,
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
          props: {
            text: roleWithCompany,
            fontSize: theme.experienceRoleFontSize,
            color: colors.primary,
            fontWeight: 'bold',
            fontStyle: null,
            align: null,
            lineHeight: null,
          },
          children: [],
        };
        elements[`exp-${i}-date`] = {
          type: 'Text',
          props: {
            text: dateText,
            fontSize: theme.experienceDateFontSize,
            color: colors.lightText,
            fontWeight: null,
            fontStyle: null,
            align: null,
            lineHeight: null,
          },
          children: [],
        };

        const descItems = (exp.description ?? []).filter(Boolean);
        if (descItems.length > 0) {
          elements[`exp-${i}-desc-spacer`] = { type: 'Spacer', props: { height: 4 }, children: [] };
          elements[`exp-${i}-desc`] = {
            type: 'List',
            props: {
              items: descItems,
              ordered: false,
              fontSize: theme.listFontSize,
              color: colors.text,
              spacing: theme.listSpacing,
            },
            children: [],
          };
        }

        if (expSkills.length > 0) {
          elements[`exp-${i}-skills-spacer`] = { type: 'Spacer', props: { height: 6 }, children: [] };
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
        elements[`exp-${i}-spacer`] = { type: 'Spacer', props: { height: theme.spacerAfterExperienceBlock + (exp.spacingAfter ?? 0) }, children: [] };
        pageChildren.push(`exp-${i}-spacer`);
      });

      elements['spacer-exp-end'] = { type: 'Spacer', props: { height: theme.spacerEndExperiences }, children: [] };
      pageChildren.push('spacer-exp-end');
    },
  };
}

const sectionBuilders = createSectionBuilders();

export function buildCvDossierLayoutSpec(
  data: Partial<ExtractedCV>,
  templateConfig: Partial<TemplateConfig> | undefined,
  variant: CvDossierLayoutVariant,
): Spec {
  const config = { ...DEFAULT_TEMPLATE_CONFIG, ...templateConfig };
  const colors = {
    ...DEFAULT_TEMPLATE_CONFIG.colors,
    ...(variant.defaultColorOverrides ?? {}),
    ...(templateConfig?.colors ?? {}),
  };
  const theme = variant.resolveTheme(colors);
  const logo = { ...DEFAULT_TEMPLATE_CONFIG.logo, ...config.logo };
  const footer = { ...DEFAULT_TEMPLATE_CONFIG.footer, ...config.footer };
  const sections = config.sections ?? DEFAULT_TEMPLATE_CONFIG.sections;

  const elements: Spec['elements'] = {};
  const pageChildren: string[] = [];

  elements['header-band'] = {
    type: 'FixedView',
    props: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      padding: null,
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0,
      margin: null,
      backgroundColor: theme.headerBackground,
      borderWidth: null,
      borderColor: null,
      borderRadius: null,
      flex: null,
      alignItems: null,
      justifyContent: null,
    },
    children: ['header-inner'],
  };
  const consultantName = data.personalInfo
    ? `${data.personalInfo.firstName ?? ''} ${data.personalInfo.lastName ?? ''}`.trim()
    : '';
  elements['header-inner'] = {
    type: 'Row',
    props: {
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: null,
      padding: theme.headerPadding,
      flex: null,
      wrap: null,
    },
    children: ['header-name', 'header-logo'],
  };
  elements['header-name'] = {
    type: 'Text',
    props: {
      text: consultantName.toUpperCase(),
      fontSize: 10,
      color: theme.headerNameColor,
      fontWeight: 'bold',
      fontStyle: null,
      align: null,
      lineHeight: null,
    },
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
        color: theme.headerFallbackWordmarkColor,
        fontWeight: 'bold',
        fontStyle: null,
        align: 'right',
        lineHeight: null,
      },
      children: [],
    };
  }
  pageChildren.push('header-band');

  elements['spacer-after-header'] = { type: 'Spacer', props: { height: theme.spacerAfterHeader }, children: [] };
  pageChildren.push('spacer-after-header');

  elements['doc-title'] = {
    type: 'Text',
    props: {
      text: variant.docTitle,
      fontSize: theme.docTitleFontSize,
      color: theme.docTitleColor,
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

  if (data.personalInfo) {
    const pi = data.personalInfo;
    const infoRows: { label: string; value: string }[] = [];
    if (pi.title) infoRows.push({ label: 'Poste', value: pi.title });
    if (pi.yearsOfExperience) infoRows.push({ label: "Années d'expérience", value: pi.yearsOfExperience });
    if (pi.location) infoRows.push({ label: 'Localisation', value: pi.location });
    if (pi.availability) infoRows.push({ label: 'Disponibilité', value: pi.availability });

    addInfoTable(elements, 'info', infoRows, pageChildren, colors, theme);

    elements['spacer-info'] = { type: 'Spacer', props: { height: 20 }, children: [] };
    pageChildren.push('spacer-info');
  }

  for (const section of sections) {
    const builder = sectionBuilders[section];
    if (builder) builder(elements, pageChildren, data, colors, theme);
  }

  elements['footer-wrapper'] = {
    type: 'FixedView',
    props: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: null,
      paddingTop: 10,
      paddingBottom: 12,
      paddingLeft: theme.pageMarginLeft,
      paddingRight: theme.pageMarginRight,
      margin: null,
      backgroundColor: null,
      borderWidth: null,
      borderColor: null,
      borderRadius: null,
      flex: null,
      alignItems: null,
      justifyContent: null,
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
    props: { justifyContent: 'space-between', alignItems: 'center', gap: null, padding: null, flex: null, wrap: null },
    children: ['footer-line1', 'footer-line2'],
  };
  elements['footer-line1'] = {
    type: 'Text',
    props: {
      text: footer.line1,
      fontSize: theme.footerLine1FontSize,
      color: colors.primary,
      fontWeight: 'bold',
      fontStyle: null,
      align: null,
      lineHeight: null,
    },
    children: [],
  };
  elements['footer-line2'] = {
    type: 'Text',
    props: {
      text: footer.line2,
      fontSize: theme.footerLine2FontSize,
      color: colors.lightText,
      fontWeight: null,
      fontStyle: null,
      align: null,
      lineHeight: null,
    },
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
      marginTop: theme.pageMarginTop,
      marginBottom: theme.pageMarginBottom,
      marginLeft: theme.pageMarginLeft,
      marginRight: theme.pageMarginRight,
      backgroundColor: colors.background,
    },
    children: pageChildren,
  };

  return { root: 'doc', elements };
}
