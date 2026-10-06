import * as migration_20260714_073818_initial from './20260714_073818_initial';
import * as migration_20261006_141717_payload_3_90 from './20261006_141717_payload_3_90';

export const migrations = [
  {
    up: migration_20260714_073818_initial.up,
    down: migration_20260714_073818_initial.down,
    name: '20260714_073818_initial',
  },
  {
    up: migration_20261006_141717_payload_3_90.up,
    down: migration_20261006_141717_payload_3_90.down,
    name: '20261006_141717_payload_3_90'
  },
];
