const GEMINI_MODELS = [
    'gemini-2.5-flash-lite',
    'gemini-2.5-flash',
    'gemini-2.0-flash-lite',
    'gemini-2.0-flash',
];

const callGeminiAPI = async (apiKey, modelName, prompt) => {
    const url = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 4096,
            },
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const msg = errorData?.error?.message || response.statusText;
        throw new Error(`[${response.status}] ${modelName}: ${msg}`);
    }

    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
};

export const extractSubjectsFromText = async (pdfText) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('Gemini API key not found. Add VITE_GEMINI_API_KEY to your .env file.');
    }

    const prompt = `You are an expert at analyzing educational documents. Given the following text extracted from a PDF (likely a syllabus, textbook table of contents, or curriculum), extract the subjects and their topics/sub-topics.

Return ONLY a valid JSON array in this exact format, with no extra text or markdown:
[
  {
    "name": "Subject Name",
    "topics": ["Topic 1", "Topic 2", "Topic 3"]
  }
]

Rules:
- Group related topics under meaningful subject names
- Keep topic names concise but descriptive
- If the PDF contains a single subject, still return an array with one item
- If you cannot identify clear subjects, make reasonable groupings from the content
- Maximum 30 topics per subject
- Do NOT include any markdown formatting, code fences, or explanation — return ONLY the JSON array

Here is the PDF text:
---
${pdfText.substring(0, 30000)}
---`;

    const errors = [];

    for (const modelName of GEMINI_MODELS) {
        try {
            console.log(`Trying model: ${modelName}...`);
            let text = await callGeminiAPI(apiKey, modelName, prompt);
            console.log(`✅ Success with: ${modelName}`);

            // Clean up markdown code fences if present
            text = text.trim().replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

            const parsed = JSON.parse(text);

            if (!Array.isArray(parsed)) {
                throw new Error('Response is not an array');
            }

            return parsed.map((item) => ({
                name: String(item.name || 'Unnamed Subject'),
                topics: Array.isArray(item.topics)
                    ? item.topics.map((t) => String(t)).filter(Boolean)
                    : [],
            }));
        } catch (err) {
            console.warn(`❌ ${modelName} failed:`, err.message);
            errors.push(`${modelName}: ${err.message}`);

            // If rate limited, wait and try next model
            if (err.message?.includes('429')) {
                await new Promise((r) => setTimeout(r, 2000));
            }
        }
    }

    console.error('All models failed:', errors);
    throw new Error(`AI extraction failed. Errors:\n${errors.join('\n')}`);
};

export const breakdownTask = async (title, description = '') => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) throw new Error('Gemini API key not found.');

    const prompt = `Break down this task into 3-6 clear, actionable sub-tasks.

Task: "${title}"
${description ? `Description: "${description}"` : ''}

Return ONLY a JSON array of strings, no markdown, no explanation:
["Sub-task 1", "Sub-task 2", "Sub-task 3"]`;

    const errors = [];
    for (const modelName of GEMINI_MODELS) {
        try {
            let text = await callGeminiAPI(apiKey, modelName, prompt);
            text = text.trim().replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
            const parsed = JSON.parse(text);
            if (!Array.isArray(parsed)) throw new Error('Not an array');
            return parsed.map(s => String(s)).filter(Boolean);
        } catch (err) {
            errors.push(`${modelName}: ${err.message}`);
            if (err.message?.includes('429')) await new Promise(r => setTimeout(r, 1500));
        }
    }
    throw new Error('AI breakdown failed. Try again later.');
};

export const generateQuizForTopic = async (topicName, subjectName) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) throw new Error('Gemini API key not found.');

    const prompt = `Generate a 3-question multiple-choice quiz about the educational topic "${topicName}" from the subject "${subjectName}".

Return ONLY a valid JSON array of objects, with no markdown formatting or explanations. Format:
[
  {
    "question": "The question text?",
    "options": ["A", "B", "C", "D"],
    "correctIndex": 0,
    "explanation": "Brief explanation of why this is correct."
  }
]
- Ensure correctIndex is a number between 0 and 3 corresponding to the correct option.
- Make the questions challenging but fair.`;

    const errors = [];
    for (const modelName of GEMINI_MODELS) {
        try {
            let text = await callGeminiAPI(apiKey, modelName, prompt);
            text = text.trim().replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
            const parsed = JSON.parse(text);
            if (!Array.isArray(parsed)) throw new Error('Not an array');
            return parsed;
        } catch (err) {
            errors.push(`${modelName}: ${err.message}`);
            if (err.message?.includes('429')) await new Promise(r => setTimeout(r, 1500));
        }
    }
    throw new Error('AI quiz generation failed. Try again later.');
};

export const generateFullCourse = async (coursePrompt) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) throw new Error('Gemini API key not found.');

    const prompt = `You are an expert curriculum designer. The user wants to learn: "${coursePrompt}".
Create a comprehensive, step-by-step course curriculum for this topic.

Return ONLY a valid JSON object in this exact format, with no markdown formatting or explanations:
{
  "subjectName": "A clear, descriptive title for the course",
  "topics": [
    "Topic 1 (Basics)",
    "Topic 2",
    "Topic 3",
    "Topic 4 (Advanced)"
  ]
}
- Provide around 10 to 15 topics, ordered logically from beginner to advanced.
- Keep topic names concise and actionable.`;

    const errors = [];
    for (const modelName of GEMINI_MODELS) {
        try {
            let text = await callGeminiAPI(apiKey, modelName, prompt);
            text = text.trim().replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
            const parsed = JSON.parse(text);
            if (!parsed.subjectName || !Array.isArray(parsed.topics)) {
                throw new Error('Invalid JSON structure returned');
            }
            return parsed;
        } catch (err) {
            errors.push(`${modelName}: ${err.message}`);
            if (err.message?.includes('429')) await new Promise(r => setTimeout(r, 1500));
        }
    }
    throw new Error('AI course generation failed. Try again later.');
};
