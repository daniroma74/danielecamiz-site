// pagination.js
import { clamp, toInt } from './validators.js';

export function getPagination(query, defaultLimit = 20, maxLimit = 100) {
  const page  = clamp(toInt(query.page ?? 1, 1), 1, 1e9);
  const limit = clamp(toInt(query.limit ?? defaultLimit, defaultLimit), 1, maxLimit);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}