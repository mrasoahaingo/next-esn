import Image from 'next/image';

export function AuthBrandLogo() {
  return (
    <div className="mb-8 flex w-full justify-center px-4">
      <Image
        src="/esneo-full.svg"
        alt="Esneo"
        width={2816}
        height={1572}
        className="h-auto w-[min(100%,240px)] select-none"
        priority
        unoptimized
      />
    </div>
  );
}
