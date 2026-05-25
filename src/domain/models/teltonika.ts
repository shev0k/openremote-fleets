export type TeltonikaAttributeValue = string | number | boolean | { latitude: number; longitude: number };

export interface TeltonikaAttributeSample<TValue extends TeltonikaAttributeValue = TeltonikaAttributeValue> {
  avlId: string;
  attributeName: string;
  displayName: string;
  value: TValue;
  unit?: string;
  parameterGroup: string;
  timestampIso: string;
}

export interface TeltonikaTrackerSnapshot {
  imei: string;
  model: string;
  protocol: string;
  codec: string;
  timestampIso: string;
  attributes: Record<string, TeltonikaAttributeSample>;
}
