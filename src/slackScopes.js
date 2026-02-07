const HISTORY_SURFACE_TO_SCOPE = {
  channels: 'channels:history',
  groups: 'groups:history',
  im: 'im:history',
  mpim: 'mpim:history'
};

const HISTORY_SURFACES = Object.keys(HISTORY_SURFACE_TO_SCOPE);

function parseCommaList(value) {
  if (value === undefined || value === '') {
    return undefined;
  }

  const normalized = String(value).trim();
  if (!normalized) {
    return undefined;
  }

  return normalized
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function parseHistorySurfaces(value) {
  const items = parseCommaList(value);
  if (items === undefined) {
    return undefined;
  }

  if (items.includes('none')) {
    if (items.length > 1) {
      throw new Error('Invalid SLACK_HISTORY_SURFACES: none must be used alone');
    }
    return [];
  }

  const unique = [...new Set(items)];
  const invalid = unique.filter((surface) => !HISTORY_SURFACES.includes(surface));
  if (invalid.length) {
    throw new Error(`Invalid SLACK_HISTORY_SURFACES: ${invalid.join(', ')}`);
  }

  return unique;
}

function buildSlackScopesConfig({ historySurfacesEnv }) {
  const explicitSurfaces = parseHistorySurfaces(historySurfacesEnv);

  const historySurfaces = explicitSurfaces || ['channels', 'groups'];
  const scopes = [
    'chat:write',
    ...historySurfaces.map((surface) => HISTORY_SURFACE_TO_SCOPE[surface]),
    'commands'
  ];

  return { scopes, historySurfaces };
}

function mapMessageChannelTypeToSurface(channelType) {
  if (channelType === 'channel') {
    return 'channels';
  }
  if (channelType === 'group') {
    return 'groups';
  }
  if (channelType === 'im') {
    return 'im';
  }
  if (channelType === 'mpim') {
    return 'mpim';
  }
  return null;
}

module.exports = {
  HISTORY_SURFACE_TO_SCOPE,
  buildSlackScopesConfig,
  mapMessageChannelTypeToSurface
};
