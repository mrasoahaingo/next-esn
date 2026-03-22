import { EsneoFullLogo } from '@/components/esneo-full-logo';

export function AuthBrandLogo() {
  return (
    <div className="mb-8 flex w-full justify-center px-4">
      <EsneoFullLogo className="h-auto w-[min(100%,240px)] select-none" title="Esneo" />
    </div>
  );
}
