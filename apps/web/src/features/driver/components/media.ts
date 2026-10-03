export async function readPhoto(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw new Error('Choose a JPEG, PNG or WebP photo.');
  if (file.size > 2_000_000) throw new Error('Choose a photo under 2 MB.');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Unable to read photo.'));
    reader.readAsDataURL(file);
  });
}
