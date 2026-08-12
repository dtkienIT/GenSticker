import { ValidationResult, GenerateResult } from '../types';

const API_BASE = 'http://localhost:8000';

export const validateImage = async (imageBase64: string, mimeType: string): Promise<ValidationResult> => {
  try {
    const res = await fetch(`${API_BASE}/api/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_base64: imageBase64, mime_type: mimeType })
    });
    if (!res.ok) {
      return { valid: false, error_message: `Server error (${res.status})` };
    }
    return res.json();
  } catch (e) {
    return { valid: false, error_message: 'Connection error. Is the backend running?' };
  }
};

export const generatePack = (
  imageBase64: string, 
  mimeType: string,
  onSticker: (result: GenerateResult) => void,
  onDone: () => void,
  onError: (error: string) => void
): (() => void) => {
  const controller = new AbortController();
  
  fetch(`${API_BASE}/api/generate-pack`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_base64: imageBase64, mime_type: mimeType }),
    signal: controller.signal
  }).then(async (response) => {
    if (!response.ok) {
      onError(`Server error (${response.status})`);
      return;
    }
    if (!response.body) throw new Error('No response body');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          try {
            const data = JSON.parse(trimmed.substring(6));
            // Backend sends {"done": true} as the final event
            if (data.done === true) {
              onDone();
            } else if (data.success === false && !data.filtered) {
              // Non-filtered failure — report as error
              onError(data.error || 'Generation failed');
            } else {
              // Successful sticker or filtered sticker
              onSticker(data as GenerateResult);
            }
          } catch (e) {
            console.error('SSE Parse Error', e);
          }
        }
      }
    }
    // If stream ends without a done event, trigger done
    onDone();
  }).catch(e => {
    if (e.name !== 'AbortError') onError(e.message);
  });

  return () => controller.abort();
};
