import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/opportunites")({
  component: Page,
});

const items = [
  { type: "Formation", title: "Gestion administrative des collectivités", deadline: "30 juin 2026" },
  { type: "Emploi", title: "Agent comptable — Mairie d'Adjamé", deadline: "20 juin 2026" },
  { type: "Marché", title: "Fourniture de mobilier — Conseil Régional du Sud-Comoé", deadline: "5 juillet 2026" },
];

function Page() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="container mx-auto max-w-5xl px-4 py-16">
        <h1 className="text-4xl font-bold tracking-tight">Opportunités</h1>
        <p className="mt-3 text-muted-foreground">
          Formations, emplois et marchés publics relayés par la mutuelle.
        </p>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {items.map((i) => (
            <Card key={i.title}>
              <CardContent className="p-6">
                <Badge variant="secondary">{i.type}</Badge>
                <h2 className="mt-3 text-lg font-semibold">{i.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Date limite : <strong>{i.deadline}</strong>
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
