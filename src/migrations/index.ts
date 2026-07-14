import * as migration_20260714_073818_initial from './20260714_073818_initial';

export const migrations = [
  {
    up: migration_20260714_073818_initial.up,
    down: migration_20260714_073818_initial.down,
    name: '20260714_073818_initial'
  },
];
