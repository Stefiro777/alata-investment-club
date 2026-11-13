import sharp from 'sharp'

/**
 * The portrait a member uploads is re-encoded before it is stored: at most 800px on the
 * long side, WebP at quality 82. It also checks that the file really is an image (the
 * content type sent by the browser is not trusted), turns a phone photo the right way up
 * (EXIF orientation) and drops the metadata, GPS position included.
 */

export const PROFILE_PHOTO_MAX_SIDE = 800
export const PROFILE_PHOTO_QUALITY = 82
/** Refuses images that would decode to more than this (a 4 MB file can hold far more). */
const MAX_INPUT_PIXELS = 64_000_000

export type PreparedPhoto = {
  buffer: Buffer
  contentType: 'image/webp'
  ext: 'webp'
  width: number
  height: number
}

/** Throws when the input is not a decodable image. Smaller images are not enlarged. */
export async function prepareProfilePhoto(input: Buffer): Promise<PreparedPhoto> {
  const { data, info } = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })
    .rotate()
    .resize({ width: PROFILE_PHOTO_MAX_SIDE, height: PROFILE_PHOTO_MAX_SIDE, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: PROFILE_PHOTO_QUALITY })
    .toBuffer({ resolveWithObject: true })
  return { buffer: data, contentType: 'image/webp', ext: 'webp', width: info.width, height: info.height }
}
