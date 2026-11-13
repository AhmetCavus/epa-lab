import { AuthorizationError } from '../common/errors/authorization-error';

export type ClientProfileId = 'epa-par' | 'playground-standard';

interface ProfileSettings {
  readonly issuer: string;
  readonly clientId: string;
  readonly clientSecret: string;
  readonly defaultRedirectUri: string;
  readonly allowedRedirectUris: readonly string[];
}

export interface EpaClientProfile extends ProfileSettings {
  readonly id: 'epa-par';
  readonly authorizationMode: 'par';
  readonly scope: 'openid';
}

export interface StandardClientProfile extends ProfileSettings {
  readonly id: 'playground-standard';
  readonly authorizationMode: 'direct';
  readonly scope: 'openid demo.fhir.read';
  readonly applicationOrigin: string;
  readonly resourceUrl: string;
}

export type ClientProfile = EpaClientProfile | StandardClientProfile;

export interface ProfileConfiguration extends ProfileSettings {
  readonly standardProfile: StandardClientProfile | undefined;
}

export function clientProfile(config: ProfileConfiguration, id: 'epa-par'): EpaClientProfile;
export function clientProfile(
  config: ProfileConfiguration,
  id: 'playground-standard',
): StandardClientProfile;
export function clientProfile(config: ProfileConfiguration, id: ClientProfileId): ClientProfile;
export function clientProfile(config: ProfileConfiguration, id: ClientProfileId): ClientProfile {
  if (id === 'epa-par') {
    return Object.freeze({
      id,
      authorizationMode: 'par',
      issuer: config.issuer,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      defaultRedirectUri: config.defaultRedirectUri,
      allowedRedirectUris: Object.freeze([...config.allowedRedirectUris]),
      scope: 'openid',
    });
  }

  if (id === 'playground-standard' && config.standardProfile) {
    return config.standardProfile;
  }

  throw new AuthorizationError(
    { status: 403, code: 'invalAuth' },
    'Client profile is unavailable.',
  );
}
