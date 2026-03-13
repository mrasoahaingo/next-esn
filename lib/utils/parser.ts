import pdf from 'pdf-parse';
import mammoth from 'mammoth';

export async function parseCVFile(buffer: Buffer, mimetype: string): Promise<string> {
  if (mimetype === 'application/pdf') {
    const data = await pdf(buffer);
    return data.text;
  } else if (
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimetype === 'application/msword'
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } else if (mimetype === 'text/plain') {
    return buffer.toString('utf-8');
  }
  throw new Error('Unsupported file type');
}
