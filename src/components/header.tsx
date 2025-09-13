import { Logo } from '@/components/logo';
import Image from 'next/image';
import placeholderImages from '@/lib/placeholder-images.json';

export function Header() {
  const heroImage = placeholderImages.placeholderImages[0];
  return (
    <header className="relative py-12 px-4 sm:px-6 lg:px-8 bg-card shadow-sm rounded-xl overflow-hidden">
        <div className="absolute inset-0">
            <Image
                src={heroImage.imageUrl}
                alt={heroImage.description}
                fill
                className="object-cover opacity-10"
                data-ai-hint={heroImage.imageHint}
                priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/80 to-transparent" />
        </div>
        <div className="relative flex flex-col items-center justify-center gap-4 text-center">
            <Logo className="h-12 w-12 text-primary" />
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl font-headline">
              LeadSorter Pro
            </h1>
            <p className="mt-2 text-lg text-muted-foreground max-w-2xl mx-auto">
              Upload your CSV to sort, review, and clean your business leads instantly.
            </p>
        </div>
    </header>
  );
}
