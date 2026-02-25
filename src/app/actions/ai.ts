'use server'

/**
 * AI Content Translation Mock
 * 
 * In a real-world scenario, this would connect to an LLM provider
 * (like OpenAI, Google Gemini, or Anthropic) or a dedicated translation API
 * like Google Cloud Translation.
 */
export async function translateContent(htmlContent: string, targetLang: string) {
    if (!htmlContent) return { text: '' }

    // Simulate network delay for realistic UX testing
    await new Promise(resolve => setTimeout(resolve, 800))

    // Simple mock logic: inject a notification block into the HTML
    const translatedHtml = `
        <div class="mb-2 px-2 py-1 bg-indigo-50 border-l-2 border-indigo-400 text-[11px] text-indigo-700 italic rounded-r align-middle flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
            Translation Mock (${targetLang})
        </div>
        ${htmlContent}
    `

    return { text: translatedHtml }
}
