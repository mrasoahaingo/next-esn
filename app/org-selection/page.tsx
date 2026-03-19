import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { OrganizationList } from '@clerk/nextjs'

export default async function OrgSelectionPage() {
  const { orgId } = await auth()

  if (orgId) {
    redirect('/')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-shell">
      <div className="flex flex-col items-center gap-6">
        <div className="text-center">
          <h1 className="text-xl font-bold text-foreground">Bienvenue sur Himeo</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sélectionnez ou créez une organisation pour continuer
          </p>
        </div>
        <OrganizationList
          hidePersonal
          afterCreateOrganizationUrl="/"
          afterSelectOrganizationUrl="/"
        />
      </div>
    </div>
  )
}
