import chunk from 'chunk-text';
import { PhotosPhotoSizes, WallWallpostAttachment, PhotosPhoto } from '@vkontakte/api-schema-typescript';

export const getMediumSizeUrl = (sizes: PhotosPhotoSizes[]): string => {
  const SMALL_SIZES = ['m', 's'];
  const MEDIUM_SIZES = ['y', 'r', 'q', 'p', ...SMALL_SIZES];
  const LARGE_SIZES = ['w', 'z', ...MEDIUM_SIZES];
  if (!sizes) {
    return null;
  }
  return MEDIUM_SIZES.map((sizeType) => sizes.find((size) => size.type === sizeType)).filter(Boolean)[0].url;
};

export const getPhotosUrlFromAttachments = (attachments: WallWallpostAttachment[]): string[] => {
  return attachments
    .filter((attachment) => attachment.type === 'photo')
    .map((attachment) => getMediumSizeUrl(attachment.photo.sizes));
};

export const chunkSubstr = (str: string, size: number, firstElementSize?: number): string[] => {
  str = str.trim();
  if (firstElementSize) {
    const firstElementSizeChunks = chunk(str, firstElementSize);
    const mainChunks = chunk(firstElementSizeChunks.slice(1).join(' '), size);
    return [firstElementSizeChunks[0], ...mainChunks];
  }
  return chunk(str, size);
};
