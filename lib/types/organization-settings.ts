/** Row shape for `organization_settings` (Supabase). */
export type OrganizationSettingsRow = {
  org_id: string;
  display_name: string;
  contact_email: string | null;
  website_url: string | null;
  app_logo_url: string | null;
  /** Gabarit PDF global (`templates.id`) choisi pour cette org (super_admin). */
  default_template_id: string | null;
  positioning_brand_context: string | null;
  /** Pondérations matching — voir `lib/config/matching-weights.ts` */
  matching_weights?: unknown | null;
  extra: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};
