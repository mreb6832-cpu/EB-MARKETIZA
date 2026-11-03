
import { supabase } from "./supabaseClient.js";

const pagePath = window.location.pathname;

async function recordVisit() {
  try {
    const { error } = await supabase
      .from("site_visits")
      .insert({
        page_path: pagePath
      });

    if (error) {
      console.error("Analytics error:", error.message);
    }
  } catch (error) {
    console.error("Visit tracking failed:", error);
  }
}

recordVisit();
