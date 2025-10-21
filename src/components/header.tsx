import { Logo } from '@/components/logo';

export function Header() {
  return (
    <header className="py-8 text-center">
        <div className="flex flex-col items-center justify-center gap-4 text-center">
            <Logo className="h-12 w-12 text-primary" />
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl font-headline">
              Team Workspace
            </h1>
            <p className="mt-2 text-lg text-muted-foreground max-w-2xl mx-auto">
              Upload your CSV to sort, review, and clean your business leads instantly.
            </p>
        </div>
    </header>
  );
}
