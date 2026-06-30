import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { OrganizationList } from '@clerk/nextjs'
import { AuthBrandLogo } from '@/components/auth-brand-logo'

export default async function OrgSelectionPage() {
  const { orgId } = await auth()

  if (orgId) {
    redirect('/dashboard')
  }

  return (
    <div className="app-surface flex min-h-full flex-col items-center justify-center px-4 py-10">
      <AuthBrandLogo />
      <div className="flex flex-col items-center gap-6">
        <div className="text-center">
          <h1 className="text-xl font-bold text-foreground">Bienvenue</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sélectionnez ou créez une organisation pour continuer
          </p>
        </div>
        <OrganizationList
          hidePersonal
          afterCreateOrganizationUrl="/dashboard"
          afterSelectOrganizationUrl="/dashboard"
        />
      </div>
    </div>
  )
}
