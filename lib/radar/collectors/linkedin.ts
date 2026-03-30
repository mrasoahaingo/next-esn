import { z } from 'zod';
import { RawSignalSchema, type ApiCall, type RawSignal } from '@/lib/radar/schemas';

const PROXYCURL_BASE = 'https://nubela.co/proxycurl/api';

const EmployeeSchema = z.object({
  headline: z.string().nullable().optional(),
  company_name: z.string().nullable().optional(),
});

const EmployeesResponseSchema = z.object({
  employees: z.array(EmployeeSchema).default([]),
});

const CompanyResponseSchema = z.object({
  name: z.string().nullable().optional(),
  company_size_on_linkedin: z.number().nullable().optional(),
  website: z.string().nullable().optional(),
  siren: z.string().nullable().optional(),
});

const JobListingSchema = z.object({
  job_title: z.string().nullable().optional(),
  job_location: z.string().nullable().optional(),
  job_description_snippet: z.string().nullable().optional(),
  job_type: z.string().nullable().optional(),
  skills: z.array(z.string()).default([]),
});

const JobListingsResponseSchema = z.object({
  job: z.array(JobListingSchema).default([]),
});

function logLinkedInCall(event: string, payload: Record<string, unknown>) {
  console.info('[radar][linkedin]', event, payload);
}

export async function collectLinkedInSignals(companyUrls: string[]): Promise<{ signals: RawSignal[]; calls: ApiCall[] }> {
  const apiKey = process.env.PROXYCURL_API_KEY;
  if (!apiKey) return { signals: [], calls: [] };

  const headers = { Authorization: `Bearer ${apiKey}` };
  const signals: RawSignal[] = [];
  const calls: ApiCall[] = [];

  for (const url of companyUrls) {
    try {
      const employeesResponse = await fetch(
        `${PROXYCURL_BASE}/linkedin/company/employees?${new URLSearchParams({
          url,
          keyword_regex: 'consultant|prestataire|freelance|externe',
          page_size: '50',
        })}`,
        { headers },
      );

      logLinkedInCall('employees_response', {
        companyUrl: url,
        status: employeesResponse.status,
        ok: employeesResponse.ok,
      });

      if (!employeesResponse.ok) {
        calls.push({
          endpoint: `${PROXYCURL_BASE}/linkedin/company/employees`,
          status: employeesResponse.status,
          ok: false,
          responseData: { errorSnippet: String(employeesResponse.status) },
        });
        console.error('collectLinkedInSignals employees:', employeesResponse.status);
        continue;
      }

      const employeesJson = await employeesResponse.json();
      calls.push({
        endpoint: `${PROXYCURL_BASE}/linkedin/company/employees`,
        status: employeesResponse.status,
        ok: true,
        responseData: { employeeCount: employeesJson.employees?.length ?? 0 },
      });
      const employeesParsed = EmployeesResponseSchema.safeParse(employeesJson);
      if (!employeesParsed.success) {
        logLinkedInCall('employees_parse_failed', {
          companyUrl: url,
          issueCount: employeesParsed.error.issues.length,
        });
        continue;
      }

      const externals = employeesParsed.data.employees.filter((employee) =>
        /consultant|prestataire|freelance|esn|ssii|externe/i.test(employee.headline ?? ''),
      );

      logLinkedInCall('employees_parsed', {
        companyUrl: url,
        employeeCount: employeesParsed.data.employees.length,
        externalCount: externals.length,
      });

      if (externals.length < 2) {
        logLinkedInCall('skipped_not_enough_externals', {
          companyUrl: url,
          externalCount: externals.length,
        });
        continue;
      }

      const companyResponse = await fetch(
        `${PROXYCURL_BASE}/linkedin/company?url=${encodeURIComponent(url)}`,
        { headers },
      );

      logLinkedInCall('company_response', {
        companyUrl: url,
        status: companyResponse.status,
        ok: companyResponse.ok,
      });

      const companyJson = companyResponse.ok ? await companyResponse.json() : {};
      calls.push({
        endpoint: `${PROXYCURL_BASE}/linkedin/company`,
        status: companyResponse.status,
        ok: companyResponse.ok,
        responseData: companyResponse.ok
          ? { name: companyJson.name ?? null }
          : { errorSnippet: String(companyResponse.status) },
      });
      const companyParsed = CompanyResponseSchema.safeParse(companyJson);

      const esnCounts = Object.entries(
        externals.reduce<Record<string, number>>((accumulator, employee) => {
          const key = employee.company_name?.trim();
          if (key) accumulator[key] = (accumulator[key] ?? 0) + 1;
          return accumulator;
        }, {}),
      ).sort(([, a], [, b]) => b - a);

      const companyName = companyParsed.success ? companyParsed.data.name || url : url;

      // Signal 1 : présence de consultants externes (preuve d'habitude d'externalisation)
      const externalSignal = RawSignalSchema.safeParse({
        source: 'linkedin',
        title: `${externals.length} consultants externes identifies`,
        rawContent: JSON.stringify({ externals: externals.slice(0, 10), esnCounts }),
        weight: externals.length >= 5 ? 20 : 15,
        metadata: {
          signalType: 'external_consultants',
          externalCount: externals.length,
          esnSources: Object.fromEntries(esnCounts.slice(0, 5)),
          linkedinUrl: url,
          headcount: companyParsed.success ? companyParsed.data.company_size_on_linkedin : null,
        },
        companyName,
        companySiren: companyParsed.success ? companyParsed.data.siren ?? undefined : undefined,
      });

      if (externalSignal.success) {
        signals.push(externalSignal.data);
        logLinkedInCall('signal_created', {
          companyUrl: url,
          companyName: externalSignal.data.companyName,
          externalCount: externals.length,
        });
      }

      // Signal 2 : offres d'emploi actives (détection de besoins IT en cours)
      const jobListingsResponse = await fetch(
        `${PROXYCURL_BASE}/linkedin/company/job/?${new URLSearchParams({
          url,
          search_keyword: 'développeur consultant IT cloud data',
        })}`,
        { headers },
      );

      logLinkedInCall('job_listings_response', {
        companyUrl: url,
        status: jobListingsResponse.status,
        ok: jobListingsResponse.ok,
      });

      if (!jobListingsResponse.ok) {
        calls.push({
          endpoint: `${PROXYCURL_BASE}/linkedin/company/job/`,
          status: jobListingsResponse.status,
          ok: false,
          responseData: { errorSnippet: String(jobListingsResponse.status) },
        });
      } else {
        const jobsJson = await jobListingsResponse.json();
        calls.push({
          endpoint: `${PROXYCURL_BASE}/linkedin/company/job/`,
          status: jobListingsResponse.status,
          ok: true,
          responseData: { jobCount: jobsJson.job?.length ?? 0 },
        });
        const jobsParsed = JobListingsResponseSchema.safeParse(jobsJson);

        if (jobsParsed.success && jobsParsed.data.job.length > 0) {
          const techJobs = jobsParsed.data.job.filter((job) =>
            /développeur|ingénieur|architect|devops|cloud|data|consultant|lead/i.test(job.job_title ?? ''),
          );

          if (techJobs.length > 0) {
            const allSkills = [...new Set(techJobs.flatMap((job) => job.skills))];
            const jobTitles = techJobs.slice(0, 5).map((job) => job.job_title).filter(Boolean);

            const jobSignal = RawSignalSchema.safeParse({
              source: 'linkedin',
              title: `${techJobs.length} offres IT actives sur LinkedIn`,
              rawContent: JSON.stringify(techJobs.slice(0, 5)),
              weight: techJobs.length >= 5 ? 20 : techJobs.length >= 3 ? 18 : 15,
              metadata: {
                signalType: 'active_job_postings',
                jobCount: techJobs.length,
                technologies: allSkills.slice(0, 10),
                jobTitles,
                linkedinUrl: url,
              },
              companyName,
              companySiren: companyParsed.success ? companyParsed.data.siren ?? undefined : undefined,
            });

            if (jobSignal.success) {
              signals.push(jobSignal.data);
              logLinkedInCall('job_signal_created', {
                companyUrl: url,
                jobCount: techJobs.length,
                technologies: allSkills.slice(0, 5),
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('collectLinkedInSignals:', error);
    }
  }

  return { signals, calls };
}
