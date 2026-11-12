// Les seules pièces du kit stageshow dont la visite a besoin, importées fichier
// par fichier : le point d'entrée du kit (kit/index.ts) charge le CSS de toutes
// ses pièces (téléphones, messages, clavier…), inutile sur la landing.
export { Stage } from '@/components/stageshow/kit/stage';
export type { Act } from '@/components/stageshow/kit/act';
export { Window, Bar } from '@/components/stageshow/kit/window';
export { Collapse } from '@/components/stageshow/kit/motion/Collapse';
export { Connector } from '@/components/stageshow/kit/motion/Connector';
export { Count } from '@/components/stageshow/kit/motion/Count';
export { Fly } from '@/components/stageshow/kit/motion/Fly';
export { Roll } from '@/components/stageshow/kit/motion/Roll';
export { States } from '@/components/stageshow/kit/motion/States';
export { Stream } from '@/components/stageshow/kit/motion/Stream';
export { Avatar } from '@/components/stageshow/kit/parts/Avatar';
export { Check } from '@/components/stageshow/kit/parts/Check';
export { Meter } from '@/components/stageshow/kit/parts/Meter';
export { Badge } from '@/components/stageshow/kit/controls/Badge';
