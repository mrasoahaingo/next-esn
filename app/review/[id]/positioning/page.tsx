'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Search,
  Loader2,
  Target,
  Plus,
  Briefcase,
  Building2,
  FileText,
  ChevronRight,
  Users,
} from 'lucide-react';

interface Mission {
  id: string;
  title: string;
  company: string | null;
  job_description: string;
  positioning_count: number;
  created_at: string;
}

export default function PositioningNewPage() {
  const params = useParams();
  const router = useRouter();
  const candidateId = params?.id as string;

  const [missions, setMissions] = useState<Mission[]>([]);
  const [isLoadingMissions, setIsLoadingMissions] = useState(true);
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // New mission dialog
  const [showNewMission, setShowNewMission] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newJobDescription, setNewJobDescription] = useState('');
  const [isCreatingMission, setIsCreatingMission] = useState(false);

  useEffect(() => {
    fetch('/api/missions')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setMissions(data);
      })
      .catch(console.error)
      .finally(() => setIsLoadingMissions(false));
  }, []);

  const handleCreateMission = async () => {
    if (!newTitle.trim() || !newJobDescription.trim()) return;
    setIsCreatingMission(true);
    try {
      const res = await fetch('/api/missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          company: newCompany || null,
          jobDescription: newJobDescription,
        }),
      });
      const mission = await res.json();
      if (mission.id) {
        setMissions((prev) => [{ ...mission, positioning_count: 0 }, ...prev]);
        setSelectedMissionId(mission.id);
        setShowNewMission(false);
        setNewTitle('');
        setNewCompany('');
        setNewJobDescription('');
      }
    } finally {
      setIsCreatingMission(false);
    }
  };

  const handleStartPositioning = async () => {
    if (!selectedMissionId) return;
    setIsCreating(true);
    try {
      const res = await fetch('/api/positioning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId, missionId: selectedMissionId }),
      });
      const data = await res.json();
      if (data.id) {
        router.push(`/review/${candidateId}/positioning/${data.id}`);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const selectedMission = missions.find((m) => m.id === selectedMissionId);

  return (
    <div className="h-full bg-background text-foreground overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">
        {/* Back button */}
        <div className="mb-6">
          <Button variant="outline" onClick={() => router.push(`/review/${candidateId}`)}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Retour au CV
          </Button>
        </div>

        {/* Header */}
        <div className="glass-panel rounded-2xl p-8 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet/20 text-violet neon-ring">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold title-gradient">Nouveau positionnement</h1>
              <p className="text-sm text-muted-foreground">
                Sélectionnez une fiche de mission ou créez-en une nouvelle
              </p>
            </div>
          </div>
        </div>

        {/* Mission selection */}
        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-violet" />
              Fiches de mission
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNewMission(true)}
              className="border-violet/30 text-violet hover:bg-violet/10"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Nouvelle mission
            </Button>
          </div>

          {isLoadingMissions ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span className="text-sm">Chargement des missions...</span>
            </div>
          ) : missions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card/50">
                <Briefcase className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">Aucune fiche de mission</p>
              <p className="text-xs text-muted-foreground mb-4">
                Créez votre première mission pour commencer le positionnement
              </p>
              <Button
                onClick={() => setShowNewMission(true)}
                className="bg-violet hover:bg-violet/90"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Créer une mission
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {missions.map((mission) => {
                const isSelected = selectedMissionId === mission.id;
                const previewLines = mission.job_description.split('\n').slice(1, 4).join(' ').trim();
                const preview = previewLines.length > 140 ? previewLines.slice(0, 137) + '...' : previewLines;

                return (
                  <button
                    key={mission.id}
                    onClick={() => setSelectedMissionId(isSelected ? null : mission.id)}
                    className={`group w-full text-left rounded-xl p-4 transition-all duration-200 ${
                      isSelected
                        ? 'bg-violet/10 border border-violet/30 violet-ring'
                        : 'bg-white/[0.03] border border-white/[0.06] hover:border-violet/20 hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Selection indicator */}
                      <div
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                          isSelected
                            ? 'border-violet bg-violet'
                            : 'border-white/20 group-hover:border-violet/40'
                        }`}
                      >
                        {isSelected && (
                          <div className="h-2 w-2 rounded-full bg-white" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-sm font-semibold ${isSelected ? 'text-foreground' : 'text-foreground/90'}`}>
                            {mission.title}
                          </span>
                          {mission.company && (
                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Building2 className="h-3 w-3" />
                              {mission.company}
                            </span>
                          )}
                        </div>

                        {preview && (
                          <p className="text-xs text-muted-foreground/70 line-clamp-2 mb-2">
                            {preview}
                          </p>
                        )}

                        <div className="flex items-center gap-3">
                          {mission.positioning_count > 0 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              <Users className="mr-1 h-2.5 w-2.5" />
                              {mission.positioning_count} positionnement{mission.positioning_count > 1 ? 's' : ''}
                            </Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground/50">
                            {new Date(mission.created_at).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
                        </div>
                      </div>

                      <ChevronRight
                        className={`h-4 w-4 shrink-0 mt-1 transition-all ${
                          isSelected
                            ? 'text-violet rotate-90'
                            : 'text-muted-foreground/30 group-hover:text-muted-foreground/60'
                        }`}
                      />
                    </div>

                    {/* Expanded job description preview */}
                    {isSelected && (
                      <div className="mt-3 ml-8 rounded-lg bg-black/20 border border-white/[0.04] p-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <FileText className="h-3 w-3 text-violet/60" />
                          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                            Fiche de poste
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground/80 whitespace-pre-wrap line-clamp-6">
                          {mission.job_description}
                        </p>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Action bar */}
          {missions.length > 0 && (
            <div className="mt-6 flex items-center justify-between border-t border-white/[0.06] pt-5">
              <p className="text-xs text-muted-foreground">
                {selectedMission
                  ? <>Mission sélectionnée : <span className="text-foreground font-medium">{selectedMission.title}</span></>
                  : 'Sélectionnez une mission pour continuer'
                }
              </p>
              <Button
                onClick={handleStartPositioning}
                disabled={!selectedMissionId || isCreating}
              >
                {isCreating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                Analyser le matching
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* New mission dialog */}
      <Dialog open={showNewMission} onOpenChange={setShowNewMission}>
        <DialogContent className="sm:max-w-2xl bg-panel border-white/10">
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet/20 text-violet">
              <Plus className="h-4 w-4" />
            </div>
            Nouvelle fiche de mission
          </DialogTitle>

          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mission-title">Intitulé du poste *</Label>
                <Input
                  id="mission-title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Développeur Full-Stack Senior"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mission-company">Entreprise / Client</Label>
                <Input
                  id="mission-company"
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  placeholder="Ex: BNP Paribas"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mission-desc">Description du poste *</Label>
              <Textarea
                id="mission-desc"
                value={newJobDescription}
                onChange={(e) => setNewJobDescription(e.target.value)}
                placeholder="Collez ici la fiche de poste complète..."
                className="min-h-[300px] max-h-[60vh] text-sm"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowNewMission(false)}
              >
                Annuler
              </Button>
              <Button
                onClick={handleCreateMission}
                disabled={!newTitle.trim() || !newJobDescription.trim() || isCreatingMission}
                className="bg-violet hover:bg-violet/90"
              >
                {isCreatingMission ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Créer la mission
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
