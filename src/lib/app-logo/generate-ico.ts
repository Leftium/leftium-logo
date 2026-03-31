/**
 * ICO binary container generator.
 *
 * Wraps a single PNG blob in the ICO container format.
 * The ICO format is a simple container; modern browsers accept a single 32x32 PNG inside.
 *
 * ICO file structure (single image):
 *   ICONDIR header  (6 bytes)
 *   ICONDIRENTRY    (16 bytes)
 *   PNG image data  (variable)
 */

/**
 * Wrap a PNG Blob in an ICO container.
 *
 * @param pngBlob - A PNG image blob (should be 32x32 for favicon.ico)
 * @returns ICO file as a Blob
 */
export async function pngToIco(pngBlob: Blob): Promise<Blob> {
	const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());
	const pngSize = pngBytes.byteLength;

	// ICO header: 6 bytes
	//   reserved (2) = 0
	//   type     (2) = 1 (icon)
	//   count    (2) = 1 (number of images)
	const HEADER_SIZE = 6;
	const ENTRY_SIZE = 16;
	const imageOffset = HEADER_SIZE + ENTRY_SIZE;

	const buffer = new ArrayBuffer(imageOffset + pngSize);
	const view = new DataView(buffer);
	const bytes = new Uint8Array(buffer);

	// ICONDIR header
	view.setUint16(0, 0, true); // reserved
	view.setUint16(2, 1, true); // type: 1 = ICO
	view.setUint16(4, 1, true); // image count: 1

	// ICONDIRENTRY (16 bytes at offset 6)
	// width  (1 byte): 0 means 256; use actual size for <=255
	// height (1 byte): same
	// We read actual dimensions from the PNG IHDR chunk (bytes 16-23)
	const width = readPngDimension(pngBytes, 16);
	const height = readPngDimension(pngBytes, 20);

	bytes[6] = width >= 256 ? 0 : width; // width (0 = 256)
	bytes[7] = height >= 256 ? 0 : height; // height (0 = 256)
	bytes[8] = 0; // color count (0 = no palette)
	bytes[9] = 0; // reserved
	view.setUint16(10, 1, true); // color planes
	view.setUint16(12, 32, true); // bits per pixel
	view.setUint32(14, pngSize, true); // size of image data
	view.setUint32(18, imageOffset, true); // offset of image data

	// PNG image data
	bytes.set(pngBytes, imageOffset);

	return new Blob([buffer], { type: 'image/x-icon' });
}

/**
 * Read a 4-byte big-endian uint32 from a Uint8Array at the given offset.
 * Used to extract width/height from the PNG IHDR chunk.
 */
function readPngDimension(bytes: Uint8Array, offset: number): number {
	return (
		((bytes[offset] << 24) |
			(bytes[offset + 1] << 16) |
			(bytes[offset + 2] << 8) |
			bytes[offset + 3]) >>>
		0
	);
}
