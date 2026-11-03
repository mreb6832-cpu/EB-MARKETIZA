
import { supabase } from "./supabaseClient.js";

// EB-MARKETIZA LIVE ANALYTICS

const SESSION_KEY = "eb_analytics_session";
const TRACKED_KEY = "eb_analytics_tracked_pages";

async function trackVisitor() {
  try {
    // Check browser session
    let sessionId = sessionStorage.getItem(SESSION_KEY);

    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, sessionId);
    }

    // Get current page
    const pagePath = window.location.pathname || "/";

    // Prevent duplicate tracking on refresh
    let trackedPages = [];

    try {
      trackedPages = JSON.parse(
        sessionStorage.getItem(TRACKED_KEY) || "[]"
      );
    } catch {
      trackedPages = [];
    }

    if (trackedPages.includes(pagePath)) {
      return;
    }

    // Save visit to Supabase
    const { error } = await supabase
      .from("visitor_events")
      .insert({
        session_id: sessionId,
        page_path: pagePath
      });

    if (error) {
      console.error("EB Analytics error:", error.message);
      return;
    }

    // Mark page as tracked after successful insert
    trackedPages.push(pagePath);

    sessionStorage.setItem(
      TRACKED_KEY,
      JSON.stringify(trackedPages)
    );

    console.log("EB-MARKETIZA: Visit recorded successfully.");

  } catch (error) {
    console.error("EB Analytics failed:", error);
  }
}

trackVisitor();
