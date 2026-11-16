export type SearchSort = 'relevance' | 'date' | 'distance'

export interface SearchParams {
  q: string
  from?: string
  to?: string
  maxPrice?: number
  location?: { lat: number; lng: number; radiusMi: number }
  sort: SearchSort
}

export type ParseResult =
  | { ok: true; params: SearchParams }
  | { ok: false; error: string }

export const DEFAULT_RADIUS_MI = 25
export const MAX_RADIUS_MI = 500
export const MAX_QUERY_LENGTH = 200

const DECIMAL = /^-?\d+(\.\d+)?$/
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function text(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

function isRealDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false
  const d = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value
}

function number(name: string, raw: string): number | string {
  if (!DECIMAL.test(raw)) return `${name} must be a number`
  return Number(raw)
}

export function parseSearchQuery(query: Record<string, unknown>): ParseResult {
  const q = text(query.q) ?? ''
  if (q.length > MAX_QUERY_LENGTH) {
    return { ok: false, error: `q must be ${MAX_QUERY_LENGTH} characters or fewer` }
  }

  const from = text(query.from)
  const to = text(query.to)
  if (from && !isRealDate(from)) {
    return { ok: false, error: 'from must be a date in YYYY-MM-DD format' }
  }
  if (to && !isRealDate(to)) {
    return { ok: false, error: 'to must be a date in YYYY-MM-DD format' }
  }
  if (from && to && from > to) {
    return { ok: false, error: 'from must be on or before to' }
  }

  let maxPrice: number | undefined
  const rawPrice = text(query.max_price)
  if (rawPrice !== undefined) {
    const n = number('max_price', rawPrice)
    if (typeof n === 'string') return { ok: false, error: n }
    if (n < 0) return { ok: false, error: 'max_price must be 0 or more' }
    maxPrice = n
  }

  let location: SearchParams['location']
  const rawLat = text(query.lat)
  const rawLng = text(query.lng)
  if (rawLat !== undefined || rawLng !== undefined) {
    if (rawLat === undefined || rawLng === undefined) {
      return { ok: false, error: 'lat and lng must be provided together' }
    }
    const lat = number('lat', rawLat)
    if (typeof lat === 'string') return { ok: false, error: lat }
    const lng = number('lng', rawLng)
    if (typeof lng === 'string') return { ok: false, error: lng }
    if (lat < -90 || lat > 90) {
      return { ok: false, error: 'lat must be between -90 and 90' }
    }
    if (lng < -180 || lng > 180) {
      return { ok: false, error: 'lng must be between -180 and 180' }
    }

    let radiusMi = DEFAULT_RADIUS_MI
    const rawRadius = text(query.radius_mi)
    if (rawRadius !== undefined) {
      const r = number('radius_mi', rawRadius)
      if (typeof r === 'string') return { ok: false, error: r }
      if (r <= 0 || r > MAX_RADIUS_MI) {
        return {
          ok: false,
          error: `radius_mi must be greater than 0 and at most ${MAX_RADIUS_MI}`,
        }
      }
      radiusMi = r
    }
    location = { lat, lng, radiusMi }
  }

  const requested = text(query.sort)
  if (requested && !['relevance', 'date', 'distance'].includes(requested)) {
    return { ok: false, error: 'sort must be relevance, date or distance' }
  }
  const fallback: SearchSort = q ? 'relevance' : location ? 'distance' : 'date'
  let sort = (requested as SearchSort | undefined) ?? fallback
  if (sort === 'relevance' && !q) sort = fallback
  if (sort === 'distance' && !location) sort = fallback

  return { ok: true, params: { q, from, to, maxPrice, location, sort } }
}