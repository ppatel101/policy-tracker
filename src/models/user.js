/**
 * Profile Model and Mappers
 */

export function mapRowToProfile(row) {
  if (!row) return null;
  return {
    id: row.id,
    fullName: row.full_name || '',
    email: row.email || '',
    phone: row.phone || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapProfileToRow(profile) {
  if (!profile) return null;
  const row = {
    full_name: profile.fullName || '',
    email: profile.email || '',
    phone: profile.phone || null,
  };
  if (profile.id) row.id = profile.id;
  if (profile.createdAt) row.created_at = profile.createdAt;
  if (profile.updatedAt) row.updated_at = profile.updatedAt;
  return row;
}
