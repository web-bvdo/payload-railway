import * as migration_20260714_073818_initial from './20260714_073818_initial';
import * as migration_20261006_141717_payload_3_90 from './20261006_141717_payload_3_90';
import * as migration_20261015_071124_mcp_api_keys from './20261015_071124_mcp_api_keys';
import * as migration_20261015_091114_content_history from './20261015_091114_content_history';
import * as migration_20261030_123101_media_objectkey from './20261030_123101_media_objectkey';

export const migrations = [
  {
    up: migration_20260714_073818_initial.up,
    down: migration_20260714_073818_initial.down,
    name: '20260714_073818_initial',
  },
  {
    up: migration_20261006_141717_payload_3_90.up,
    down: migration_20261006_141717_payload_3_90.down,
    name: '20261006_141717_payload_3_90',
  },
  {
    up: migration_20261015_071124_mcp_api_keys.up,
    down: migration_20261015_071124_mcp_api_keys.down,
    name: '20261015_071124_mcp_api_keys',
  },
  {
    up: migration_20261015_091114_content_history.up,
    down: migration_20261015_091114_content_history.down,
    name: '20261015_091114_content_history',
  },
  {
    up: migration_20261030_123101_media_objectkey.up,
    down: migration_20261030_123101_media_objectkey.down,
    name: '20261030_123101_media_objectkey',
  },
];
