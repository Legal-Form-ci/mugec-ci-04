import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/actualites")({
  component: Page,
});

const news = [
  { date: "12 mai 2026", title: "Lancement officiel de la plateforme MUGEC-CI", excerpt: "La mutuelle franchit un nouveau cap avec sa plateforme numérique de gestion en ligne." },
  { date: "28 avril 2026", title: "Assemblée Générale 2026 — Convocation", excerpt: "L'AG ordinaire se tiendra le 15 juin à Abidjan. Inscriptions ouvertes." },
  { date: "10 avril 2026", title: "Nouveau partenariat avec Orange Money", excerpt: "Le paiement des cotisations devient encore plus simple." },
];

function Page() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="container mx-auto max-w-5xl px-4 py-16">
        <h1 className="text-4xl font-bold tracking-tight">Actualités & Annonces</h1>
        <p className="mt-3 text-muted-foreground">Informations officielles publiées par la MUGEC-CI.</p>
        <div className="mt-10 space-y-4">
          {news.map((n) => (
            <Card key={n.title}>
              <CardContent className="p-6">
                <div className="text-xs font-medium uppercase text-accent">{n.date}</div>
                <h2 className="mt-1 text-xl font-semibold">{n.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{n.excerpt}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
