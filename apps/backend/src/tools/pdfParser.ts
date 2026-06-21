import pdfParse from 'pdf-parse';
import { openaiClient } from '../config/llm';
import { downloadFromStorage } from '../services/storageService';

export interface PitchDeckContent {
  rawText: string;
  pages: number;
  sections: Record<string, string>;
  source: 'text' | 'vision';
}

/**
 * Extract text from a PDF. Falls back to GPT-4o Vision if text extraction
 * yields less than 200 characters per page (image-heavy slide decks).
 */
export async function parsePDF(
  s3Key: string,
  signedUrl: string
): Promise<PitchDeckContent> {
  const buffer = await downloadFromStorage(s3Key);

  let data: pdfParse.Result;
  try {
    data = await pdfParse(buffer);
  } catch {
    // Vision fallback for corrupt/image-only PDFs
    return visionExtract(signedUrl, 0, '');
  }

  const avgCharsPerPage = data.text.length / Math.max(data.numpages, 1);

  if (avgCharsPerPage < 200) {
    // Image-heavy deck — use vision
    return visionExtract(signedUrl, data.numpages, data.text);
  }

  return {
    rawText: data.text,
    pages: data.numpages,
    sections: parseSections(data.text),
    source: 'text',
  };
}

async function visionExtract(
  pdfUrl: string,
  pages: number,
  fallbackText: string
): Promise<PitchDeckContent> {
  const prompt = `You are analyzing a startup pitch deck PDF. Extract all meaningful content and structure it.
  
The PDF is available at: ${pdfUrl}

Please extract and return:
1. Company name and tagline
2. Problem being solved
3. Solution overview
4. Market size (TAM/SAM/SOM)
5. Business model and revenue streams
6. Financial information (revenue, burn rate, runway, growth)
7. Team information
8. Traction and key metrics
9. Ask/funding round details

Return as structured text with clear section headers.`;

  const response = await openaiClient.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          ...(pdfUrl ? [{ type: 'image_url' as const, image_url: { url: pdfUrl } }] : []),
        ],
      },
    ],
    max_tokens: 4000,
  });

  const extracted = response.choices[0].message.content ?? fallbackText;

  return {
    rawText: extracted,
    pages,
    sections: parseSections(extracted),
    source: 'vision',
  };
}

function parseSections(text: string): Record<string, string> {
  const sectionPatterns = [
    'problem', 'solution', 'market', 'business model', 'financials',
    'team', 'traction', 'competition', 'ask', 'product', 'technology',
  ];

  const sections: Record<string, string> = {};
  const lower = text.toLowerCase();

  for (const section of sectionPatterns) {
    const idx = lower.indexOf(section);
    if (idx !== -1) {
      const start = idx;
      const end = Math.min(start + 2000, text.length);
      sections[section] = text.slice(start, end).trim();
    }
  }

  return sections;
}
