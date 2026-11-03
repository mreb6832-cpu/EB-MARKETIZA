import { supabase } from "./supabaseClient.js";

async function trackVisitor() {
  try {
    let sessionId = sessionStorage.getItem("eb_analytics_session");

    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem("eb_analytics_session", sessionId);
    }

    const { error } = await supabase
      .from("visitor_events")
      .insert({
        session_id: sessionId,
        page_path: window.location.pathname
      });

    if (error) {
      console.error("Visitor tracking error:", error.message);
    }
  } catch (error) {
    console.error("Analytics error:", error);
  }
}

trackVisitor();
