import pdfParse from 'pdf-parse';
import { HumanMessage } from '@langchain/core/messages';
import { extractionModel } from '../config/llm';
import { downloadFromStorage } from '../services/storageService';

export interface PitchDeckContent {
  rawText: string;
  pages: number;
  sections: Record<string, string>;
  source: 'text' | 'vision';
}

/**
 * Extract text from a PDF. Falls back to AI Vision if text extraction
 * yields less than 200 characters per page (image-heavy slide decks).
 */
export async function parsePDF(
  storageKeyOrUrl: string,
  fileUrl?: string
): Promise<PitchDeckContent> {
  const buffer = await downloadFromStorage(storageKeyOrUrl || fileUrl || '');

  const resolvedUrl = fileUrl || storageKeyOrUrl;

  let data: pdfParse.Result;
  try {
    data = await pdfParse(buffer);
  } catch {
    // Vision fallback for corrupt/image-only PDFs
    return visionExtract(resolvedUrl, 0, '');
  }

  const avgCharsPerPage = data.text.length / Math.max(data.numpages, 1);

  if (avgCharsPerPage < 200) {
    // Image-heavy deck — use vision
    return visionExtract(resolvedUrl, data.numpages, data.text);
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

  try {
    const message = new HumanMessage({
      content: [
        { type: 'text', text: prompt },
        ...(pdfUrl ? [{ type: 'image_url' as const, image_url: { url: pdfUrl } }] : []),
      ],
    });

    const response = await extractionModel.invoke([message]);
    const extracted =
      typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content) || fallbackText;

    return {
      rawText: extracted,
      pages,
      sections: parseSections(extracted),
      source: 'vision',
    };
  } catch (err: unknown) {
    console.warn('[pdfParser] Vision extraction failed, using fallback text:', err);
    return {
      rawText: fallbackText,
      pages,
      sections: parseSections(fallbackText),
      source: 'text',
    };
  }
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
