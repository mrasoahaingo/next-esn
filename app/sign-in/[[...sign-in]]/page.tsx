import { SignIn } from '@clerk/nextjs'
import { AuthBrandLogo } from '@/components/auth-brand-logo'

export default function SignInPage() {
  return (
    <div className="app-surface flex min-h-full flex-col items-center justify-center px-4 py-10">
      <AuthBrandLogo />
      <SignIn />
    </div>
  )
}
