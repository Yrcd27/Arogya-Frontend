import { NoTranslate } from '../NoTranslate';
import { displayNameParts, type StaffKind, type StaffProfile } from '../../utils/staffProfile';

export function StaffName({ profile, kind }: { profile: StaffProfile; kind: StaffKind }) {
  const { prefix, name } = displayNameParts(profile, kind);
  return <>{prefix}<NoTranslate>{name}</NoTranslate></>;
}
