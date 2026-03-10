import { Types } from 'mongoose'

interface ContentSponsorshipInput {
  isSponsored?: boolean
  sponsoredBy?: string | Types.ObjectId | null
}

type ContentSponsorshipPatch = {
  isSponsored?: boolean
  sponsoredBy?: string | Types.ObjectId | null
}

const hasOwnKey = (payload: ContentSponsorshipInput, key: keyof ContentSponsorshipInput): boolean =>
  Object.prototype.hasOwnProperty.call(payload, key)

const normalizeSponsoredBy = (
  value: ContentSponsorshipInput['sponsoredBy']
): string | Types.ObjectId | null => {
  if (value === null || value === undefined) return null
  if (value instanceof Types.ObjectId) return value
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

export const resolveContentSponsorshipPatch = (
  input: ContentSponsorshipInput
): ContentSponsorshipPatch => {
  const hasIsSponsored = typeof input.isSponsored === 'boolean'
  const hasSponsoredBy = hasOwnKey(input, 'sponsoredBy')

  if (hasIsSponsored && input.isSponsored === false) {
    return {
      isSponsored: false,
      sponsoredBy: null,
    }
  }

  if (hasSponsoredBy) {
    const sponsoredBy = normalizeSponsoredBy(input.sponsoredBy)
    if (sponsoredBy) {
      return {
        isSponsored: true,
        sponsoredBy,
      }
    }
    return {
      isSponsored: false,
      sponsoredBy: null,
    }
  }

  if (hasIsSponsored) {
    return {
      isSponsored: true,
    }
  }

  return {}
}

