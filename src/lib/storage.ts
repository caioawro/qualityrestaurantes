import { supabase } from './supabase';

export async function uploadPhoto(
  bucket: 'processing-before' | 'processing-after',
  file: File,
): Promise<string | null> {
  const ext = file.name.split('.').pop() || 'jpg';
  const fileName = `${bucket}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(fileName, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    console.error('Upload error:', error);
    return null;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
  return data.publicUrl;
}
