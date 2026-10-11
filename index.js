export default {
  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    const url = new URL(request.url);
    if (url.pathname !== "/api/coach" || request.method !== "POST") {
      return new Response("Not found", { status: 404, headers: cors });
    }
    if (!env.OPENAI_API_KEY) {
      return Response.json({ error: "AI server is not configured." }, { status: 503, headers: cors });
    }
    try {
      const body = await request.json();
      const message = String(body.message || "").slice(0, 4000);
      if (!message.trim()) return Response.json({ error: "Message required." }, { status: 400, headers: cors });
      const profile = body.profile || {};
      const prompt = [
        "أنت مساعد تعليم برمجة لطيف وعملي يتحدث بالعربية المصرية الواضحة.",
        "ساعد المتعلم على بناء خطة واقعية، وراعي أن الدراسة المدرسية قد تكون أولويته.",
        "لا تضع مهامًا تتجاوز الوقت اليومي الذي حدده المتعلم. شجع الفهم والتطبيق والمراجعة المتباعدة.",
        "إذا طلب خطة، اجعلها خطوات قصيرة قابلة للتنفيذ مع تمرين ومشروع مناسب للمستوى.",
        "كن واضحًا بشأن عدم اليقين، ولا تدّعِ أن المستخدم أتقن مهارة دون دليل.",
        `ملف المتعلم: ${JSON.stringify({goals: profile.goals || [], level: profile.level || "beginner", minutes: profile.minutes || 30, customGoal: profile.customGoal || ""})}`,
        `رسالة المتعلم: ${message}`
      ].join("\n\n");
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: env.OPENAI_MODEL || "gpt-4.1-mini",
          input: prompt,
          max_output_tokens: 700
        })
      });
      if (!response.ok) {
        return Response.json({ error: "AI provider request failed." }, { status: 502, headers: cors });
      }
      const data = await response.json();
      const reply = data.output_text || (data.output || []).flatMap(x => x.content || []).map(x => x.text || "").join("\n");
      return Response.json({ reply: reply || "لم أتمكن من صياغة رد هذه المرة." }, { headers: cors });
    } catch (error) {
      return Response.json({ error: "Invalid request." }, { status: 400, headers: cors });
    }
  }
};
