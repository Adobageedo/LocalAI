import type { VercelRequest, VercelResponse } from '@vercel/node';
import llmClient, { ChatMessage, LLMRequest } from './utils/llmClient';

interface Attachment {
  filename: string;
  content: string;  // Base64 encoded
  mime_type?: string;
  size?: number;
}

interface StreamRequest {
  prompt?: string;
  messages?: ChatMessage[];
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  rag?: boolean;           // <-- new flag
  ragCollection?: string;  // optional collection for RAG search
  topK?: number;           // optional top_k for RAG
  model?: string;
  useMcpTools?: boolean;   // <-- flag to enable/disable MCP tools (default: true)
  attachments?: Attachment[];  // <-- File attachments for backend processing
}

interface RagDoc {
  page_content: string;
  path: string;
}

const DEFAULT_USER_STYLE = `
L’analyse du style d’écriture de cet utilisateur révèle un profil marqué par une communication à la fois professionnelle, concise mais aussi chaleureuse et attentive. Globalement, ses mails adoptent une structure claire, organisée en paragraphes courts et fluides, qui facilitent la lecture et la compréhension rapide des messages. La longueur moyenne de ses messages oscille souvent entre une et deux phrases principales, complétée par des formules de politesse simples mais efficaces, telles que « bonne journée », « merci » ou « bonne fin de journée », témoignant d’un souci d’entretien relationnel sans tomber dans l’excès de formules formelles. La signature, systématiquement présente, reprend une formule standard avec ses coordonnées complètes, ce qui renforce une image professionnelle, accessible et à l’écoute.

Son vocabulaire s’inscrit dans un registre principalement technique et administratif, utilisant des termes précis et adaptés à un contexte industriel ou de gestion de projets. Il privilégie la simplicité et la sobriété, évitant les tournures trop sophistiquées ou le jargon trop spécifique, mais sait aussi adapter ses expressions selon la situation, en étant parfois plus détaillé lorsqu’il s’agit d’expliciter une démarche ou une demande précise. La ponctuation est généralement sobre, mais il n’hésite pas à employer des points pour séparer clairement les idées ou les étapes, ou des virgules pour fluidifier ses phrases. L’usage de formules de politesse en début ou en fin d’échange est systématique, ce qui confère à sa communication un ton respectueux, poli mais naturel, évitant toute froideur.

L’utilisateur sait également moduler son style en fonction des interlocuteurs ou du contexte : pour ses échanges internes, avec des collègues proches ou des partenaires réguliers, il privilégie la simplicité, la rapidité et une certaine familiarité dans ses formules, tout en maintenant un certain niveau de courtoisie. Par exemple, il peut commencer par un simple « Bonjour » ou « Salut », et conclure par « Bonne journée » ou « Bonne fin de journée », sans recours systématique à des formules élaborées. Lorsqu’il s’agit de contacts plus hiérarchiquement éloignés ou de partenaires externes, il adopte un ton plus formel, souvent en utilisant « Bonjour » ou « Bonjour Monsieur/Madame » en début de mail, et en terminant par une formule de politesse plus soutenue, comme « Cordialement » ou « Bien à vous ». La tonalité reste respectueuse et professionnelle, mais il sait aussi faire preuve d’une certaine chaleur relationnelle, notamment par des expressions telles que « merci » ou « bonne journée », qui témoignent de sa volonté de maintenir une relation cordiale.

En matière de réactivité, il privilégie la précision et la clarté. Dans ses réponses rapides ou lors des relances, il va droit au but, en précisant ses demandes ou en apportant les éléments indispensables, tout en restant poli. Lorsqu’il doit argumenter ou justifier une position, il n’hésite pas à fournir des détails ou à expliquer la démarche, ce qui montre une attitude transparente et orientée vers la résolution. Il paraît également attentif à la relation, évitant toute forme de ton agressif ou de critique ouverte, préférant insister sur la nécessité d’échanges constructifs ou de clarifications, tout en restant courtois.

Sa manière d’adapter son style selon les situations est particulièrement significative : en contexte interne ou avec des partenaires de confiance, il peut user d’un ton plus direct, voire décontracté, tout en conservant la politesse. En revanche, pour des échanges formels ou avec de nouveaux contacts, il privilégie un ton plus protocolaire, avec des formules de politesse complètes et une attention accrue à la clarté. La longueur de ses mails varie peu, mais il sait, quand la situation le demande, étoffer ses messages pour apporter des justifications ou des précisions, évitant ainsi toute ambiguïté ou incompréhension.

Il laisse également transparaître une volonté d’être efficace, ne surchargeant pas ses messages d’informations superflues, mais sans pour autant négliger la précision et la politesse. La tendance est à la recherche d’un équilibre subtil entre concision et courtoisie, avec un souci constant de maintenir de bonnes relations tout en étant clair et précis dans ses demandes ou ses réponses. En résumé, ce style témoigne d’un professionnel rigoureux, respectueux, adaptable et soucieux de préserver une relation cordiale avec ses interlocuteurs, tout en restant efficace et pragmatique dans sa communication écrite.
`;


export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { 
      prompt, 
      messages, 
      systemPrompt, 
      maxTokens = 500, 
      temperature = 0.7,
      rag = false,
      ragCollection="edoardo",
      model = "gpt-4o-mini",
      useMcpTools = false,  // default to using MCP tools
      attachments  // File attachments
    } = req.body as StreamRequest;
    
    // Use a mutable variable for model selection downstream
    let modelToUse = model;

    if (!messages && (!prompt || !prompt.trim())) {
      res.status(400).json({ error: 'Either messages array or prompt is required' });
      return;
    }
    // Build conversation messages
    let conversationMessages: ChatMessage[] = messages ?? [
      ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt + DEFAULT_USER_STYLE }] : []),
      { role: 'user' as const, content: prompt! }
    ];

    // =====================
    // Attachment processing
    // =====================
    // Helpers for optional parsing of PDF and DOCX
    const extractPdfText = async (b64: string): Promise<string> => {
      try {
        // Dynamic import so function works even if dependency isn't present locally
        const pdfParse = await import('pdf-parse').catch(() => null as any);
        if (!pdfParse) {
          console.warn('ℹ️ [Vercel promptLLM] pdf-parse not installed, skipping PDF extraction');
          return '';
        }
        const buffer = Buffer.from(b64, 'base64');
        const res: any = await (pdfParse as any).default(buffer);
        return (res && res.text) ? String(res.text) : '';
      } catch (err) {
        console.warn('⚠️ [Vercel promptLLM] PDF extraction failed:', err);
        return '';
      }
    };

    // Optional: Convert PDF (base64) to PNG base64 images using pdf2pic
    const convertPdfToPngBase64 = async (b64: string): Promise<string[]> => {
      try {
        const pdf2pic = await import('pdf2pic').catch(() => null as any);
        if (!pdf2pic) {
          console.warn('ℹ️ [Vercel promptLLM] pdf2pic not installed, skipping PDF->image conversion');
          return [];
        }
        const { fromBuffer } = (pdf2pic as any);
        const buffer = Buffer.from(b64, 'base64');
        const options = {
          density: 200,
          format: 'png',
          width: 1600,
          height: 1600,
          savePath: undefined,
        };
        const convert = fromBuffer(buffer, options);
        // Convert only first page to minimize cost/time; extend to more if needed
        const result = await convert(1, { responseType: 'base64' }).catch(() => null as any);
        if (result?.base64) {
          const base64 = String(result.base64).replace(/\s/g, '');
          console.log('✅ [Vercel promptLLM] PDF->image conversion succeeded (page 1)');
          return [base64];
        }
        console.warn('⚠️ [Vercel promptLLM] PDF->image conversion returned no base64');
        return [];
      } catch (err) {
        console.warn('⚠️ [Vercel promptLLM] PDF->image conversion failed:', (err as any)?.message || err);
        return [];
      }
    };

    const extractDocxText = async (b64: string): Promise<string> => {
      try {
        const mammoth = await import('mammoth').catch(() => null as any);
        if (!mammoth) {
          console.warn('ℹ️ [Vercel promptLLM] mammoth not installed, skipping DOCX extraction');
          return '';
        }
        const buffer = Buffer.from(b64, 'base64');
        const result: any = await (mammoth as any).extractRawText({ buffer });
        return (result && result.value) ? String(result.value) : '';
      } catch (err) {
        console.warn('⚠️ [Vercel promptLLM] DOCX extraction failed:', err);
        return '';
      }
    };

    const isTextBased = (filename?: string, mime?: string) => {
      const ext = (filename || '').toLowerCase();
      const m = (mime || '').toLowerCase();
      const textExts = ['.txt', '.md', '.csv', '.json', '.xml', '.log', '.rtf'];
      const textMimes = ['text/plain', 'text/markdown', 'text/csv', 'application/json', 'application/xml', 'text/xml'];
      return textExts.some(e => ext.endsWith(e)) || textMimes.includes(m);
    };

    const isImage = (filename?: string, mime?: string) => {
      const ext = (filename || '').toLowerCase();
      const m = (mime || '').toLowerCase();
      const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
      return imageExts.some(e => ext.endsWith(e)) || m.startsWith('image/');
    };

    const base64ToUtf8 = (b64: string) => {
      try {
        return Buffer.from(b64, 'base64').toString('utf8');
      } catch (e) {
        console.warn('⚠️ [Vercel promptLLM] Failed to decode base64 to UTF-8');
        return '';
      }
    };

    if (attachments && attachments.length > 0) {
      console.log('🔄 [Vercel promptLLM] Processing attachments on Node side...');

      const textParts: string[] = [];
      const imageDataUrls: string[] = [];

      for (const att of attachments) {
        const fname = att.filename || 'unknown-file';
        const mime = att.mime_type || '';

        if (isTextBased(fname, mime)) {
          const decoded = base64ToUtf8(att.content || '');
          if (decoded) {
            textParts.push(`\n--- Content from ${fname} ---\n${decoded}`);
            console.log(`📄 [Vercel promptLLM] Added text from ${fname} (${decoded.length} chars)`);
          } else {
            console.log(`⚠️ [Vercel promptLLM] Empty/undecodable text for ${fname}`);
          }
        } else if (fname.toLowerCase().endsWith('.pdf') || mime === 'application/pdf') {
          const pdfText = await extractPdfText(att.content || '');
          if (pdfText) {
            textParts.push(`\n--- Content from ${fname} (PDF) ---\n${pdfText}`);
            console.log(`📄 [Vercel promptLLM] Extracted PDF text from ${fname} (${pdfText.length} chars)`);
          } else {
            console.log(`ℹ️ [Vercel promptLLM] PDF had no extractable text: ${fname}. Trying PDF->image conversion...`);
            const images = await convertPdfToPngBase64(att.content || '');
            if (images.length > 0) {
              // Push as PNG data URLs for Vision
              for (const img of images) {
                imageDataUrls.push(`data:image/png;base64,${img}`);
              }
              console.log(`✅ [Vercel promptLLM] Attached ${images.length} image(s) converted from PDF`);
            } else {
              console.log(`ℹ️ [Vercel promptLLM] PDF->image conversion not available/failed for ${fname}`);
              textParts.push(`\n--- Attachment notice ---\nA PDF named "${fname}" was attached but could not be rendered as an image for Vision. Consider providing a renderable image or a text-based version.`);
            }
          }
        } else if (fname.toLowerCase().endsWith('.docx') || mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          const docxText = await extractDocxText(att.content || '');
          if (docxText) {
            textParts.push(`\n--- Content from ${fname} (DOCX) ---\n${docxText}`);
            console.log(`📄 [Vercel promptLLM] Extracted DOCX text from ${fname} (${docxText.length} chars)`);
          } else {
            console.log(`ℹ️ [Vercel promptLLM] DOCX had no extractable text: ${fname}`);
          }
        } else if (isImage(fname, mime)) {
          const dataUrl = `data:${mime || 'image/jpeg'};base64,${att.content}`;
          imageDataUrls.push(dataUrl);
          console.log(`🖼️ [Vercel promptLLM] Prepared image for GPT-Vision: ${fname}`);
        } else {
          console.log(`ℹ️ [Vercel promptLLM] Unsupported file type for inline processing: ${fname} (${mime}). Skipping extraction.`);
        }
      }

      // Inject text parts into system message (prepend or create one)
      if (textParts.length > 0) {
        const contextText = `\n\n## Attached Documents:\n${textParts.join('\n')}`;
        const sysIdx = conversationMessages.findIndex(m => m.role === 'system');
        if (sysIdx >= 0) {
          const original = typeof conversationMessages[sysIdx].content === 'string' ? conversationMessages[sysIdx].content as string : '';
          conversationMessages[sysIdx] = {
            role: 'system',
            content: `${original}${contextText}`,
          } as ChatMessage;
        } else {
          conversationMessages.unshift({ role: 'system', content: (systemPrompt || '') + DEFAULT_USER_STYLE + contextText } as ChatMessage);
        }
        console.log(`✅ [Vercel promptLLM] Injected ${textParts.length} text file(s) into system context`);
      }

      // Attach images to the last user message as multimodal for GPT-Vision
      if (imageDataUrls.length > 0) {
        // find last user message
        for (let i = conversationMessages.length - 1; i >= 0; i--) {
          if (conversationMessages[i].role === 'user') {
            const currentContent = conversationMessages[i].content;
            const multimodal: any[] = [
              { type: 'text', text: typeof currentContent === 'string' ? currentContent : JSON.stringify(currentContent) },
              ...imageDataUrls.map(url => ({ type: 'image_url', image_url: { url, detail: 'high' } }))
            ];
            (conversationMessages[i] as any).content = multimodal;
            console.log(`✅ [Vercel promptLLM] Attached ${imageDataUrls.length} image(s) to last user message for GPT-Vision`);
            break;
          }
        }

        // Ensure a Vision-capable model (only if we actually attached images)
        if (!String(modelToUse).includes('gpt-4')) {
          console.log(`🔄 [Vercel promptLLM] Switching model to gpt-4o for Vision support`);
          modelToUse = 'gpt-4o';
        }
      }
    }
    // --- RAG Integration ---
    if (rag) {
      try {
        console.log(`📨 rag: Received ${prompt}`);
        let topK = 100;
        const ragResponse = await fetch(
          `${process.env.RAG_API_URL || 'https://easier-snappily-ansley.ngrok-free.dev/api/rag/search'}`,
          {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'x-api-key': process.env.RAG_API_KEY || 'W1eqZEROOsKw9gphfEYPvPYlHqS0lSAELjbYJCWqCxFl831wqSmwlXTht6t4ABO0'  // <-- add API key header
            },

            body: JSON.stringify({
              query: prompt || "default query",
              collection: "TEST_BAUX_Vincent", //ragCollection || "edoardo",
              top_k: topK,
              split_prompt: false,
              rerank: false,
              use_hyde: false
            })
          }
        );

        if (!ragResponse.ok) {
          console.warn('RAG API returned error', await ragResponse.text());
        } else {
          const ragData: any = await ragResponse.json();
          const docs: RagDoc[] = ragData.documents ?? [];

          // Prepend RAG content as a system message for context
          if (docs.length > 0) {
            const contextText = docs.map((d, i) => `Document ${i + 1} "${d.path.split('/').pop()}" : ${d.page_content}`).join('\n\n');
            console.log(`RAG context: ${contextText}`);
            conversationMessages = [
              { role: 'system' as const, content: `Utilise prioritairement les documents RAG fournis, qui portent sur l’administration de biens (baux, gestion locative, obligations des parties, etc.), pour répondre à la requête de l’utilisateur.
Lorsque tu utilises une information provenant d’un document RAG, cite explicitement le nom du fichier ou de la source RAG en utilisant le nom du fichier ex "nom du fichier.pdf".

Si les documents RAG ne suffisent pas à répondre complètement, tu peux compléter avec des informations externes fiables.
Dans ce cas, tu dois obligatoirement citer clairement la source externe (ex. : code civil, service public, etc.).

N’invente aucune information. Si une réponse complète n’est pas possible malgré l’usage du RAG et des sources externes, indique ce qui manque.:\n\n${contextText}` },
              ...conversationMessages
            ];
          }
        }
      } catch (err) {
        console.error('RAG API call failed', err);
      }
    }

    // Set headers for SSE streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let fullText = '';
    let chunkNumber = 0;

    // Fetch MCP tools if enabled
    console.log("use mcp tool =", useMcpTools);
    let mcpTools: any[] | null = null;
    if (useMcpTools) {
      // dynamic import — works in CommonJS, ESM, Vercel, Railway
      const { getMcpTools } = await import("./utils/mcp");
      mcpTools = await getMcpTools();
    }

    // --- TWO-HOP FLOW: First non-streaming to detect tool calls ---
    if (mcpTools && mcpTools.length > 0) {
      console.log('🔍 First hop: checking for tool calls...');
      
      const firstResponse = await llmClient.generateWithTools({
        model: modelToUse,
        messages: conversationMessages,
        temperature,
        maxTokens,
        tools: mcpTools,
      });

      // If LLM decided to call tools, execute them
      if (firstResponse.tool_calls && firstResponse.tool_calls.length > 0) {
        console.log(`🔧 LLM wants to call ${firstResponse.tool_calls.length} tool(s)`);
        
        // Add the assistant's message with tool_calls to conversation
        conversationMessages.push({
          role: 'assistant',
          content: firstResponse.message?.content || '',
          ...(firstResponse.tool_calls && { tool_calls: firstResponse.tool_calls })
        } as any);

        // Execute each tool call and add results
        const { executeMcpTool } = await import('./utils/mcp');
        
        for (const toolCall of firstResponse.tool_calls) {
          const toolName = toolCall.function.name;
          const toolArgs = JSON.parse(toolCall.function.arguments);
          
          try {
            const toolResult = await executeMcpTool(toolName, toolArgs);
            
            // Add tool result to conversation
            conversationMessages.push({
              role: 'tool',
              content: JSON.stringify(toolResult),
              tool_call_id: toolCall.id,
              name: toolName
            });
          } catch (toolError) {
            console.error(`❌ Tool execution failed:`, toolError);
            conversationMessages.push({
              role: 'tool',
              content: JSON.stringify({ error: toolError instanceof Error ? toolError.message : 'Unknown error' }),
              tool_call_id: toolCall.id,
              name: toolName
            });
          }
        }

        console.log('✅ All tools executed, now streaming final response...');
      } else {
        console.log('💬 No tool calls, streaming direct response...');
      }
    }

    // --- SECOND HOP: Stream the final response ---
    for await (const chunk of llmClient.generateStream({
      model: modelToUse,
      messages: conversationMessages,
      temperature,
      maxTokens,
      tools: undefined,  // Don't offer tools again in final response
    })) {
      chunkNumber++;

      if (chunk.delta) {
        fullText += chunk.delta;

        res.write(`data: ${JSON.stringify({
          type: 'chunk',
          chunkNumber,
          delta: chunk.delta,
          done: false
        })}\n\n`);
      }

      if (chunk.done) {
        res.write(`data: ${JSON.stringify({
          type: 'done',
          chunkNumber,
          fullText
        })}\n\n`);
        res.end();
      }
    }

  } catch (error) {
    console.error('Streaming error:', error);
    res.write(`data: ${JSON.stringify({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    })}\n\n`);
    res.end();
  }
}
