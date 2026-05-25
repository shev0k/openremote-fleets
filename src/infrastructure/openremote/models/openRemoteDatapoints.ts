import type { AssetDatapoint, ValueDatapoint } from "@openremote/model";

export type DatapointLike = AssetDatapoint | (ValueDatapoint<unknown> & { attributeName?: string; assetId?: string });

export type OpenRemoteDatapointHistory = Record<string, DatapointLike[]>;
