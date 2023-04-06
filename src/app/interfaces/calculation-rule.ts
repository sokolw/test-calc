export interface CalculationRule {
  type: string;
  key: string;
  name: string;
  min?: number;
  max?: number;
  step?: number;
  value?: number;
}
