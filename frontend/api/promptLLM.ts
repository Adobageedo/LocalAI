import type { VercelRequest, VercelResponse } from '@vercel/node';
import llmClient, { ChatMessage, LLMRequest } from './utils/llmClient';
import { processAttachments } from './utils/attachmentPipeline';

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
  metadata: Record<string, any>;
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

    if (attachments && attachments.length > 0) {
      const result = await processAttachments({
        attachments,
        conversationMessages,
        systemPrompt,
        defaultUserStyle: DEFAULT_USER_STYLE,
        model: modelToUse,
      });
      conversationMessages = result.conversationMessages;
      modelToUse = result.modelToUse;
    }

    // --- RAG Integration ---
    if (rag) {
      try {
        console.log(`📨 rag: Received ${prompt}`);
        let topK=10
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
              collection: ragCollection || "edoardo",
              top_k: topK,
              split_prompt: true,
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
            const contextText = docs.map((d, i) => `Document ${i + 1}: ${d.page_content}`).join('\n\n');
            conversationMessages = [
              { role: 'system' as const, content: `Use the following RAG documents to answer the user query:\n\n${contextText}` },
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
      const { getMcpTools } = await import("./utils/mcp.js");
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
