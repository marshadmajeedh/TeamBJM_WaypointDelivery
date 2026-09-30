export const SYSTEM_CONSTANTS = {
  APP_NAME: 'Waypoint Delivery Planning System',
  API_PREFIX: '/api',
  MAX_TRIPS_PER_VEHICLE_PER_DAY: 2,
} as const;

export const SEED_ACCOUNTS = {
  STORE_MANAGER: 'storemanager@waypoint.local',
  DISPATCHER: 'dispatcher@waypoint.local',
  LOADER: 'loader@waypoint.local',
  DRIVER: 'driver@waypoint.local',
} as const;

export const TEMPERATURE_CAPABILITIES = {
  REEFER: ['CHILLED', 'FROZEN', 'AMBIENT'] as const,
  AMBIENT: ['AMBIENT'] as const,
};
