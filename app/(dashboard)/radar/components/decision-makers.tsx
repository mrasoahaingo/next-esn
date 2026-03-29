'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Contact } from '@/lib/radar/schemas';

function ContactRow({ contact }: { contact: Contact }) {
  return (
    <div className="flex items-center gap-3 border-b border-border/60 py-3 last:border-0">
      {contact.profilePicture ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={contact.profilePicture}
          alt={contact.name}
          className="h-9 w-9 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-800 dark:bg-blue-950 dark:text-blue-200">
          {contact.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{contact.name}</p>
        <p className="truncate text-xs text-muted-foreground">{contact.title}</p>
        {contact.city ? <p className="text-xs text-muted-foreground">{contact.city}</p> : null}
      </div>
      <a
        href={contact.linkedinUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 rounded-md border border-border/60 bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        LinkedIn →
      </a>
    </div>
  );
}

export function DecisionMakers({
  companyId,
  contacts,
}: {
  companyId: string;
  contacts: Contact[];
}) {
  const [loading, setLoading] = useState(false);
  const [localContacts, setLocalContacts] = useState(contacts);
  const [error, setError] = useState<string | null>(null);

  async function handleEnrich() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/radar/prospects/${companyId}/enrich`, { method: 'POST' });
      if (!response.ok) {
        const body = await response.json();
        setError(body.error ?? 'Erreur inconnue');
        return;
      }
      // Recharger la page pour voir les nouveaux contacts
      window.location.reload();
    } catch {
      setError('Erreur réseau');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
          Décideurs
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={handleEnrich}
          disabled={loading}
        >
          {loading ? 'Recherche…' : localContacts.length > 0 ? 'Actualiser' : 'Trouver les contacts'}
        </Button>
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="text-xs text-destructive">{error}</p>
        ) : localContacts.length > 0 ? (
          localContacts.map((contact) => (
            <ContactRow key={contact.linkedinUrl} contact={contact} />
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            Aucun décideur trouvé. Cliquez sur &quot;Trouver les contacts&quot; pour rechercher DSI, CTO, DRH sur LinkedIn.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
