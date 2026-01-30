import { PropDefinition } from '@/config/components';

export interface InteractivePropsPlaygroundProps {
  props: PropDefinition[];
  onPropsChange: (props: Record<string, unknown>) => void;
  currentProps: Record<string, unknown>;
  componentName: string;
}

export interface ControlProps {
  prop: PropDefinition;
  value: unknown;
  onChange: (name: string, value: unknown) => void;
}
