import { Screen, FlowHeader } from '@/src/components';
import { FirstStepsCard } from '@/src/components/FirstStepsCard';

export default function GettingStartedRoute() {
  return <Screen scroll><FlowHeader title="Getting started" /><FirstStepsCard standalone /></Screen>;
}
