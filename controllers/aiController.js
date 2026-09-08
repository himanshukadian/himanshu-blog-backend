const AppError = require('../utils/appError');
const Article = require('../models/Article');
const axios = require('axios');
const rag = require('../utils/articleRag');

const SYSTEM_PROMPT = "You are Himanshu Chaudhary's AI chat assistant on his portfolio website. Be conversational, helpful, and natural. You help visitors learn about Himanshu, schedule meetings, and provide AI-powered resume customization services.\n\n**Your Capabilities:**\n1. **Portfolio Information** - Answer questions about Himanshu's experience, skills, projects, education\n2. **Resume Customization** - When users provide job descriptions, help them customize resumes (don't output full resumes unless they paste a job description)\n3. **Meeting Scheduling** - Help coordinate meetings and discussions\n4. **Writing/Articles** - Answer questions about Himanshu's blog articles using the retrieved writing context and link to the articles you reference\n\n**About Himanshu:**\n- Software Engineer II at Wayfair (Apr 2023–Present)\n- 4+ years of experience building scalable, distributed backend systems\n- Strong background in microservices architecture, REST APIs, cloud-native development, system design, and data pipelines\n- Previously: Amazon (SDE 1), Mobeology Communications\n- Education: MCA from NIT Warangal (Class Topper), B.Sc CS from University of Delhi\n- Key Projects: AI-powered analytics assistant, Lane Management System, high-throughput monitoring platform\n- Skills: Python, Java, JavaScript, SQL, AWS, Kafka, DynamoDB, Docker, Kubernetes, Generative AI, Large Language Models\n- Contact: himanshu.c.official@gmail.com, https://www.linkedin.com/in/himanshucofficial, https://github.com/himanshukadian, https://portfolio.buildwithhimanshu.com\n- Timezone: IST (Asia/Kolkata). Booking: https://calendly.com/himanshu-c-official/30min\n\n**Meeting Scheduling Rules:**\n- NEVER invent specific free times, weekday availability patterns, or typical hours. If you are given his real open slots, recommend ONLY those exact times.\n- To book, ALWAYS share this exact link: https://calendly.com/himanshu-c-official/30min\n- He is in IST; convert times to the user's zone when they mention it, but keep the same slot.\n\n**Response Style:**\n- Be conversational and friendly (use emojis appropriately)\n- Keep responses focused and under 300 words\n- For resume questions without job descriptions, explain the AI customization service\n- For meeting requests, be enthusiastic about connecting\n- For portfolio questions, provide relevant details naturally\n- Don't output full resume templates unless user provides a job description to customize for";

const CONTEXT_HEADER = "**Relevant writing from Himanshu's blog (use this as context when the question is about his articles/blog/writing):**";

const MEETING_INTENT =
  /(?:let'?s?\s+(?:set\s+up|meet|talk|connect|chat)|(?:set\s+up|schedule|book|reserve|arrange)\s+(?:a\s+)?(?:meeting|call|chat|session|appointment|slot|time)|availab|avail|slot|slots|calendly|timezone|when\s+(?:are|is)\s+(?:you|he)\s+free|free\s+time|coordinat|how\s+can\s+i\s+(?:schedule|book|arrange)|get\s+in\s+touch|reach\s+out|want\s+(?:to\s+)?(?:meet|schedule|book)|need\s+(?:a\s+)?(?:meeting|call|time|slot))/i;

const MEETING_EXCLUDES =
  /(?:articles?|blog|writing|learned|explain|summar|price\s?iq|cli|agent|distributed|post|read|what did|how did|why did)/i;

const isMeetingIntent = (query) => MEETING_INTENT.test(query) && !MEETING_EXCLUDES.test(query);

const GRACEFUL_RESPONSE = "⚠️ My AI service is temporarily unreachable — but I'm still here! Ask me to \"list\" my latest blog articles (e.g. 'all posts'), or browse https://blog.buildwithhimanshu.com. Try again in a moment.";

class AIController {
  constructor() {
    this.apiEndpoint = process.env.GEMINI_API_ENDPOINT || 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
    this.modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    this.fallbackModel = process.env.GEMINI_FALLBACK_MODEL || 'gemini-2.0-flash';
    this.apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    this.axiosConfig = {
      timeout: 40000,
      maxBodyLength: 20000,
      maxContentLength: Infinity,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      }
    };
  }

  buildMessages = (query, chatHistory) => {
    const messages = [{ role: 'system', content: SYSTEM_PROMPT }];
    const sanitizedHistory = (Array.isArray(chatHistory) ? chatHistory : [])
      .map(m => ({
        type: m.type,
        content: String(m.content || '').trim()
      }))
      .filter(m => (m.type === 'user' || m.type === 'assistant') && m.content)
      .map(m => ({ type: m.type, content: m.content.slice(0, 4000).trim() }))
      .filter(m => m.content)
      .slice(-10);

    if (sanitizedHistory.length &&
        sanitizedHistory[sanitizedHistory.length - 1].type === 'user' &&
        sanitizedHistory[sanitizedHistory.length - 1].content === query) {
      sanitizedHistory.pop();
    }

    sanitizedHistory.forEach(m => {
      messages.push({ role: m.type, content: m.content });
    });

    return messages;
  };

  buildContextBlock = (writingSources) => {
    let block = `\n\n${CONTEXT_HEADER}\n`;
    writingSources.forEach((source, i) => {
      block += `\n\nSource ${i + 1}: ${source.title} — ${source.url}\n${source.snippet}`;
    });
    block += '\nIf you use this context, cite the article titles/links naturally.';
    return block;
  };

  buildMeetingContextBlock = async () => {
    try {
      const calendly = require('../utils/calendlyCli');
      const slotsData = await Promise.race([
        calendly.getEventTimesByDuration(7),
        new Promise((_, reject) => setTimeout(() => reject(new Error('slots timeout')), 8000))
      ]);
      const slots = (slotsData && Array.isArray(slotsData.slots) && slotsData.slots) || [];
      if (!slots.length) throw new Error('no open slots');
      const lines = slots.slice(0, 6).map((s, i) => `${i + 1}. ${s.display}`).join('\n');
      return `<availability>\nHimanshu's REAL currently available meeting slots (${slots[0].timezone || 'IST'}):\n${lines}\n</availability>\n\nRecommend ONLY these exact times. To book, share this link: https://calendly.com/himanshu-c-official/30min`;
    } catch (err) {
      return `<availability>\nHimanshu's live calendar could not be fetched right now, so do NOT state any specific free times. Direct the visitor to his Calendly to pick a real slot: https://calendly.com/himanshu-c-official/30min (he's in IST).\n</availability>`;
    }
  };

  extractSources = (writingSources) => {
    return writingSources.map(s => ({ title: s.title, slug: s.slug, url: s.url, snippet: s.snippet }));
  };

  keepRelevant = (writingSources) => {
    const MIN_SCORE = 30;
    if (!Array.isArray(writingSources)) return [];
    return writingSources.filter((s) => (typeof s.score === 'number' ? s.score : 0) >= MIN_SCORE);
  };

  callAI = async (messages, model, stream) => {
    const response = await axios.post(this.apiEndpoint, {
      model,
      messages,
      temperature: 0.7,
      max_tokens: 800,
      top_p: 0.9,
      stream: stream || false
    }, {
      ...this.axiosConfig,
      responseType: stream ? 'stream' : 'json'
    });
    return response;
  };

  gracefulFailure = (writingSources) => {
    return {
      status: 'success',
      data: {
        response: GRACEFUL_RESPONSE,
        model: 'fallback',
        contextUsed: writingSources.length > 0,
        writingSources: this.extractSources(writingSources),
        retrievedCount: writingSources.length
      }
    };
  };

  generateResponse = async (req, res, next) => {
    const start = Date.now();
    let modelUsed = 'none';
    let errCode = 'none';

    try {
      const query = String(req.body.query || '').trim();
      if (!query) {
        return next(new AppError('Query is required', 400));
      }
      if (query.length > 4000) {
        return next(new AppError('Query is too long (max 4000 characters)', 400));
      }
      const chatHistory = req.body.chatHistory;

      const listIntent = (
        ((/(^|\b)(all|list|show|see|browse|view)\b[^?.]{0,50}\b(blogs?|articles?|writing|writings|posts?)\b/i.test(query)) ||
         (/^(what have you written|your blog posts|blog posts|all your writing|blogs you've written)$/i.test(query))) &&
        !/(explain|summar|tell me about|what is |what's |how |why |read|viewed|understood)/i.test(query)
      );

      if (listIntent) {
        let articles = [];
        try {
          articles = await Article.find({ status: 'published' })
            .select('title slug excerpt tags publishedAt')
            .populate('tags', 'name')
            .sort({ publishedAt: -1 })
            .limit(10)
            .lean();
        } catch (e) {
          articles = [];
        }
        modelUsed = 'writing-index';
        if (articles.length === 0) {
          console.log(`[halo] query="${query.slice(0, 120)}" sources=0 model=${modelUsed} ms=${Date.now() - start} err=empty-list`);
          return res.status(200).json({
            status: 'success',
            data: {
              response: "📭 I don't have any published writing yet — check back soon!",
              model: 'writing-index',
              contextUsed: false,
              writingSources: [],
              retrievedCount: 0
            }
          });
        }
        const lines = articles.map((a, i) => {
          const when = a.publishedAt
            ? new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(new Date(a.publishedAt))
            : '—';
          const tags = Array.isArray(a.tags) && a.tags.length ? a.tags.map(t => t.name).join(', ') : '';
          return `**${i + 1}. ${a.title}**\nhttps://blog.buildwithhimanshu.com/${a.slug}\n${when}${tags ? ' · ' + tags : ''}`;
        });
        const response = `📚 **Here are Himanshu's latest writing pieces:**\n\n${lines.join('\n\n')}\n\n**Tip:** ask me to *summarize* any of them, e.g. "summarize the AI agents article".`;
        const writingSources = articles.map(a => ({
          title: a.title,
          slug: a.slug,
          url: 'https://blog.buildwithhimanshu.com/' + a.slug,
          snippet: (a.excerpt || '').slice(0, 280)
        }));
        console.log(`[halo] query="${query.slice(0, 120)}" sources=${writingSources.length} model=${modelUsed} ms=${Date.now() - start} err=none`);
        return res.status(200).json({
          status: 'success',
          data: { response, model: 'writing-index', contextUsed: false, writingSources, retrievedCount: writingSources.length }
        });
      }

      if (!this.apiKey) {
        console.log('[halo] AI not configured, returning graceful failure');
        console.log(`[halo] query="${query.slice(0, 120)}" sources=0 model=fallback ms=${Date.now() - start} err=not-configured`);
        return res.status(200).json(this.gracefulFailure([]));
      }

      const messages = this.buildMessages(query, chatHistory);

      let writingSources = [];
      const meetingIntent = isMeetingIntent(query);
      try {
        writingSources = meetingIntent
          ? []
          : this.keepRelevant(await rag.retrieve(query, 4));
      } catch (e) {
        writingSources = [];
      }

      if (writingSources.length > 0) {
        const contextBlock = this.buildContextBlock(writingSources);
        messages.splice(1, 0, { role: 'system', content: contextBlock });
      }

      if (meetingIntent) {
        const meetingBlock = await this.buildMeetingContextBlock();
        messages.splice(1, 0, { role: 'system', content: meetingBlock });
      }

      messages.push({ role: 'user', content: query });

      let aiResponse;
      let actualModel;
      try {
        const response = await this.callAI(messages, this.modelName, false);
        actualModel = this.modelName;
        aiResponse = response.data.choices?.[0]?.message?.content;
      } catch (e) {
        const status = e.response ? e.response.status : 0;
        const code = e.code || '';
        const isHttpError = status >= 400 && status <= 599;
        const isNetworkError = code === 'ETIMEDOUT' || code === 'ECONNREFUSED' || code === 'ECONNABORTED' || !e.response;
        if (isNetworkError) {
          errCode = code || 'network-error';
          console.error(`[halo] AI network error code=${code} status=${status}`);
          console.log(`[halo] query="${query.slice(0, 120)}" sources=${writingSources.length} model=fallback ms=${Date.now() - start} err=${errCode}`);
          return res.status(200).json(this.gracefulFailure(writingSources));
        }
        if (isHttpError) {
          errCode = `http-${status}`;
          if (status === 401 || status === 403) {
            console.error(`[halo] AI auth error status=${status} — logging loudly`);
          }
          try {
            const retryResponse = await this.callAI(messages, this.fallbackModel, false);
            actualModel = this.fallbackModel;
            aiResponse = retryResponse.data.choices?.[0]?.message?.content;
          } catch (retryErr) {
            console.error(`[halo] AI fallback failed code=${retryErr.code} status=${retryErr.response ? retryErr.response.status : 0}`);
            console.log(`[halo] query="${query.slice(0, 120)}" sources=${writingSources.length} model=fallback ms=${Date.now() - start} err=${errCode}`);
            return res.status(200).json(this.gracefulFailure(writingSources));
          }
        } else {
          errCode = code || 'unknown';
          console.log(`[halo] query="${query.slice(0, 120)}" sources=${writingSources.length} model=fallback ms=${Date.now() - start} err=${errCode}`);
          return res.status(200).json(this.gracefulFailure(writingSources));
        }
      }

      if (!aiResponse) {
        errCode = 'empty-response';
        console.log(`[halo] query="${query.slice(0, 120)}" sources=${writingSources.length} model=fallback ms=${Date.now() - start} err=${errCode}`);
        return res.status(200).json(this.gracefulFailure(writingSources));
      }

      modelUsed = actualModel;
      console.log(`[halo] query="${query.slice(0, 120)}" sources=${writingSources.length} model=${actualModel} ms=${Date.now() - start} err=none`);

      res.status(200).json({
        status: 'success',
        data: {
          response: aiResponse,
          model: actualModel,
          contextUsed: writingSources.length > 0,
          writingSources: this.extractSources(writingSources),
          retrievedCount: writingSources.length
        }
      });
    } catch (error) {
      const code = error.code || error.response ? `http-${error.response.status}` : 'unknown';
      console.error('[halo] AI Controller Error:', error);
      if (!res.headersSent) {
        console.log(`[halo] query="${String(req.body.query || '').slice(0, 120)}" sources=0 model=fallback ms=${Date.now() - start} err=${code}`);
        return res.status(200).json(this.gracefulFailure([]));
      }
    }
  };

  stream = async (req, res, next) => {
    const start = Date.now();
    let modelUsed = this.modelName;

    try {
      const query = String(req.body.query || '').trim();
      if (!query) {
        return next(new AppError('Query is required', 400));
      }
      if (query.length > 4000) {
        return next(new AppError('Query is too long (max 4000 characters)', 400));
      }
      const chatHistory = req.body.chatHistory;

      const listIntent = (
        ((/(^|\b)(all|list|show|see|browse|view)\b[^?.]{0,50}\b(blogs?|articles?|writing|writings|posts?)\b/i.test(query)) ||
         (/^(what have you written|your blog posts|blog posts|all your writing|blogs you've written)$/i.test(query))) &&
        !/(explain|summar|tell me about|what is |what's |how |why |read|viewed|understood)/i.test(query)
      );

      let writingSources = [];

      if (listIntent) {
        let articles = [];
        try {
          articles = await Article.find({ status: 'published' })
            .select('title slug excerpt tags publishedAt')
            .populate('tags', 'name')
            .sort({ publishedAt: -1 })
            .limit(10)
            .lean();
        } catch (e) {
          articles = [];
        }
        modelUsed = 'writing-index';
        if (articles.length === 0) {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no'
          });
          res.flushHeaders();
          const emptyList = "📭 I don't have any published writing yet — check back soon!";
          res.write(`data: ${JSON.stringify({ type: 'start', sources: [] })}\n\n`);
          res.write(`data: ${JSON.stringify({ type: 'delta', text: emptyList })}\n\n`);
          res.write(`data: ${JSON.stringify({ type: 'done', sources: [] })}\n\n`);
          res.end();
          return;
        }
        const lines = articles.map((a, i) => {
          const when = a.publishedAt
            ? new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(new Date(a.publishedAt))
            : '—';
          const tags = Array.isArray(a.tags) && a.tags.length ? a.tags.map(t => t.name).join(', ') : '';
          return `**${i + 1}. ${a.title}**\nhttps://blog.buildwithhimanshu.com/${a.slug}\n${when}${tags ? ' · ' + tags : ''}`;
        });
        const fullList = `📚 **Here are Himanshu's latest writing pieces:**\n\n${lines.join('\n\n')}\n\n**Tip:** ask me to *summarize* any of them, e.g. "summarize the AI agents article".`;
        const sources = articles.map(a => ({
          title: a.title,
          slug: a.slug,
          url: 'https://blog.buildwithhimanshu.com/' + a.slug,
          snippet: (a.excerpt || '').slice(0, 280)
        }));
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no'
        });
        res.flushHeaders();
        res.write(`data: ${JSON.stringify({ type: 'start', sources: [] })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: 'delta', text: fullList })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: 'done', sources: [] })}\n\n`);
        res.end();
        return;
      }

      if (!this.apiKey) {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no'
        });
        res.flushHeaders();
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'AI service temporarily unavailable' })}\n\n`);
        res.end();
        return;
      }

      const messages = this.buildMessages(query, chatHistory);

      writingSources = [];
      const meetingIntent = isMeetingIntent(query);
      try {
        writingSources = meetingIntent
          ? []
          : this.keepRelevant(await rag.retrieve(query, 4));
      } catch (e) {
        writingSources = [];
      }

      if (writingSources.length > 0) {
        const contextBlock = this.buildContextBlock(writingSources);
        messages.splice(1, 0, { role: 'system', content: contextBlock });
      }

      if (meetingIntent) {
        const meetingBlock = await this.buildMeetingContextBlock();
        messages.splice(1, 0, { role: 'system', content: meetingBlock });
      }

      messages.push({ role: 'user', content: query });

      const sources = this.extractSources(writingSources);

      let controller = new AbortController();
      let closed = false;

      req.on('close', () => {
        closed = true;
        if (controller) controller.abort();
      });

      const headers = {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
      };
      res.writeHead(200, headers);
      res.flushHeaders();

      res.write(`data: ${JSON.stringify({ type: 'start', model: modelUsed, sources })}\n\n`);

      try {
        const response = await axios.post(this.apiEndpoint, {
          model: this.modelName,
          messages,
          temperature: 0.7,
          max_tokens: 800,
          top_p: 0.9,
          stream: true
        }, {
          ...this.axiosConfig,
          responseType: 'stream',
          signal: controller.signal
        });

        const readline = require('readline');
        const rl = readline.createInterface({ input: response.data });

        rl.on('line', (line) => {
          if (closed) return;
          const trimmed = String(line).trim();
          if (!trimmed.startsWith('data:')) return;
          const payload = trimmed.slice(5).trim();
          if (payload === '[DONE]') return;
          try {
            const json = JSON.parse(payload);
            const delta = json.choices && json.choices[0] && json.choices[0].delta && json.choices[0].delta.content;
            if (delta) {
              res.write(`data: ${JSON.stringify({ type: 'delta', text: delta })}\n\n`);
            }
          } catch (e) {
            // ignore malformed lines
          }
        });

        await new Promise((resolve, reject) => {
          rl.on('close', resolve);
          rl.on('error', reject);
          response.data.on('error', reject);
        });

        if (closed) return;

        res.write(`data: ${JSON.stringify({ type: 'done', sources })}\n\n`);
        res.end();

        console.log(`[halo] stream query="${query.slice(0, 120)}" sources=${writingSources.length} model=${modelUsed} ms=${Date.now() - start} err=none`);
      } catch (e) {
        const code = e.code || (e.response ? `http-${e.response.status}` : 'error');
        console.error(`[halo] stream AI error code=${code}`);
        console.log(`[halo] stream query="${query.slice(0, 120)}" sources=${writingSources.length} model=${modelUsed} ms=${Date.now() - start} err=${code}`);
        if (!closed) {
          res.write(`data: ${JSON.stringify({ type: 'error', message: 'AI service temporarily unavailable' })}\n\n`);
          res.end();
        }
      }
    } catch (error) {
      if (!res.headersSent) {
        return next(new AppError('Failed to process stream request', 500));
      }
      res.end();
    }
  };

  retrieveArticles = async (req, res, next) => {
    const { query } = req.body;

    if (!query || !query.trim()) {
      return next(new AppError('Query is required', 400));
    }

    const results = await rag.retrieve(query, 8);

    res.status(200).json({
      status: 'success',
      data: {
        query,
        results
      }
    });
  };

  healthCheck = async (req, res, next) => {
    const isConfigured = !!this.apiKey;

    res.status(200).json({
      status: 'success',
      data: {
        aiServiceConfigured: isConfigured,
        model: this.modelName,
        ready: isConfigured
      }
    });
  };
}

module.exports = new AIController();
