/* Hallmark · genre: modern-minimal · macrostructure: Workbench · design-system: DESIGN.md · designed-as-app · critique: P4 H4 E4 S4 R4 V3 · v2 */
'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Briefcase, Plus, RotateCcw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/app/page-header';
import { Panel, PanelBody, PanelHeader } from '@/components/app/panel';
import { PanelEmpty } from '@/components/dashboard/panel-empty';
import { NewMissionDialog } from '@/components/new-mission-dialog';
import { useDemoModeStore } from '@/lib/stores/demo-mode.store';
import { useMissions, usePositionings } from '@/lib/queries';
import { MissionsSkeleton } from '@/components/missions/missions-skeleton';
import { MissionsTable } from '@/components/missions/missions-table';
import { MissionsToolbar } from '@/components/missions/missions-toolbar';
import {
  countMissionsByFilter,
  filterMissions,
  missionsCountLabel,
  type MissionFilter,
  type MissionListItem,
  type MissionListPositioning,
} from '@/components/missions/missions-list';

/**
 * Liste des fiches de mission : recherche, filtres par état de l'analyse,
 * tableau, création d'une mission. La liste s'affiche toujours, même avec une
 * seule mission : plus de redirection automatique vers le détail.
 */
export default function MissionsIndexPage(): React.JSX.Element {
  const isDemoMode = useDemoModeStore((s) => s.isDemoMode);
  const {
    data: missionsData,
    isLoading: isLoadingMissions,
    isError: isMissionsError,
    error: missionsError,
    refetch: refetchMissions,
  } = useMissions();
  const { data: positioningsData, refetch: refetchPositionings } = usePositionings();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<MissionFilter>('all');
  const [showNewMission, setShowNewMission] = useState(false);

  const missions: MissionListItem[] = useMemo(
    () => (isDemoMode ? [] : Array.isArray(missionsData) ? (missionsData as MissionListItem[]) : []),
    [isDemoMode, missionsData],
  );
  const positionings: MissionListPositioning[] = useMemo(
    () => (isDemoMode ? [] : Array.isArray(positioningsData) ? (positioningsData as MissionListPositioning[]) : []),
    [isDemoMode, positioningsData],
  );
  const visible = useMemo(() => filterMissions(missions, { query, filter }), [missions, query, filter]);
  const counts = useMemo(() => countMissionsByFilter(missions, query), [missions, query]);

  const isLoading = !isDemoMode && isLoadingMissions;
  const total = missions.length;

  const newMissionButton = (
    <Button type="button" onClick={() => setShowNewMission(true)}>
      <Plus data-icon="inline-start" />
      Nouvelle mission
    </Button>
  );

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-6">
      <PageHeader
        title="Missions"
        description={isLoading ? 'Chargement des missions…' : missionsCountLabel(total)}
        actions={isLoading || isMissionsError || total === 0 ? undefined : newMissionButton}
      />

      {isLoading ? (
        <MissionsSkeleton />
      ) : isMissionsError ? (
        <Alert variant="destructive" className="border-destructive/40 bg-panel p-4">
          <AlertTriangle />
          <AlertTitle>La liste des missions n&rsquo;a pas pu être chargée.</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <p>Vérifiez votre connexion, puis réessayez.</p>
            {missionsError instanceof Error && missionsError.message ? (
              <p className="font-mono text-xs text-muted-foreground">{missionsError.message}</p>
            ) : null}
            <div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  void refetchMissions();
                  void refetchPositionings();
                }}
              >
                <RotateCcw />
                Réessayer
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : total === 0 ? (
        <Panel aria-labelledby="missions-empty-title">
          <PanelHeader id="missions-empty-title" icon={Briefcase} title="Fiches de mission" count={0} />
          <PanelBody padded={false}>
            <PanelEmpty
              icon={Briefcase}
              title="Aucune fiche de mission."
              description={
                isDemoMode
                  ? 'Mode démo : les données de l’organisation sont masquées.'
                  : 'Une fiche de mission décrit le poste à pourvoir ; l’IA l’analyse, puis vous y positionnez des CV.'
              }
              action={
                <Button type="button" size="sm" onClick={() => setShowNewMission(true)}>
                  <Plus data-icon="inline-start" />
                  Créer une mission
                </Button>
              }
            />
          </PanelBody>
        </Panel>
      ) : (
        <div className="flex flex-col gap-4">
          <MissionsToolbar query={query} onQueryChange={setQuery} filter={filter} onFilterChange={setFilter} counts={counts} />
          <MissionsTable
            missions={visible}
            positionings={positionings}
            totalCount={total}
            onClearFilters={() => {
              setQuery('');
              setFilter('all');
            }}
          />
        </div>
      )}

      <NewMissionDialog open={showNewMission} onOpenChange={setShowNewMission} />
    </div>
  );
}
