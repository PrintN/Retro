// Webamp
import "./assets/webamp.js";

const webamp = new Webamp({
  initialTracks: [
    {
      metaData: {},
      url: "https://raw.githubusercontent.com/captbaritone/webamp-music/4b556fbf/Diablo_Swing_Orchestra_-_01_-_Heroines.mp3",
    },
    {
      metaData: {},
      url: "https://raw.githubusercontent.com/captbaritone/webamp-music/4b556fbf/Eclectek_-_02_-_We_Are_Going_To_Eclecfunk_Your_Ass.mp3",
    },
    {
      metaData: {},
      url: "https://ftp.pieter.com/MP3/DNB/1991 - Pleasure.mp3",
    },
    {
      metaData: {},
      url: "https://ftp.pieter.com/MP3/DNB/1991 - Chant.mp3",
    },
  ],
});
webamp.renderWhenReady(document.querySelector(".webamp"));


// Hit Counter + Guestbook with Supabase
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Sign in anonymously
async function ensureAuthenticated() {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error("Error checking session:", sessionError.message);
      throw sessionError;
    }

    if (session && session.user) {
      return session.user;
    }

    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    return data.user;
  } catch (error) {
    console.error("Error during authentication:", error.message);
    alert("Authentication failed. Please try again.");
    return null;
  }
}

// Hit Counter
async function fetchCurrentCount() {
  try {
    const { data, error } = await supabase.rpc("get_hit_counter");
    if (error) throw error;
    return data || 0;
  } catch (error) {
    console.error("Error fetching count:", error.message);
    alert("Failed to fetch counter. Please try again later.");
    return 0;
  }
}

async function updateCounter() {
  const counterElement = document.getElementById("hit-counter");
  try {
    const user = await ensureAuthenticated();
    if (!user) throw new Error("No authenticated user");
    const { data, error } = await supabase.rpc("increment_hit_counter");
    if (error) throw error;
    counterElement.textContent = data;
  } catch (error) {
    console.error("Error updating counter:", error);
    const count = await fetchCurrentCount();
    counterElement.textContent = count;
  }
}

// Guestbook
document.getElementById("guestbook-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const nameInput = document.getElementById("name");
  const messageInput = document.getElementById("message");
  const name = nameInput.value.trim();
  const message = messageInput.value.trim();

  // Client-side validation
  if (!name || name.length > 50 || !message || message.length > 500) {
    alert("Name must be 1-50 characters and message must be 1-500 characters.");
    return;
  }

  try {
    const user = await ensureAuthenticated();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase.rpc("add_guestbook_entry", { p_name: name, p_message: message });
    if (error) {
      console.error("Error adding guestbook entry:", error);
      if (error.message.includes("No authenticated user")) {
        alert("Authentication required to submit entry.");
      } else if (error.message.includes("violates check constraint")) {
        alert("Name must be 1-50 characters and message must be 1-500 characters.");
      } else {
        alert("Failed to submit entry: " + error.message);
      }
      return;
    }

    if (data === 'already_submitted') {
      alert("You have already submitted a guestbook entry.");
      return;
    }

    nameInput.value = "";
    messageInput.value = "";
    await fetchGuestbookEntries();
  } catch (error) {
    console.error("Error adding guestbook entry:", error);
    alert("Failed to submit entry.");
  }
});

async function fetchGuestbookEntries() {
  const entriesList = document.getElementById("guestbook-entries");
  const { data, error } = await supabase
    .from("guestbook")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) {
    console.error("Error fetching guestbook entries:", error);
    entriesList.innerHTML = "<li>Error loading entries</li>";
    return;
  }
  entriesList.innerHTML = "";
  data.forEach((entry) => {
    const li = document.createElement("li");
    li.textContent = `${entry.name}: ${entry.message} (${new Date(entry.created_at).toLocaleString()})`;
    entriesList.appendChild(li);
  });
}

supabase
  .channel("guestbook-changes")
  .on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "guestbook" },
    () => fetchGuestbookEntries()
  )
  .subscribe();

// Initialize on page load
window.addEventListener("load", async () => {
  await ensureAuthenticated();
  await fetchGuestbookEntries();
  await updateCounter();

  const counter = document.getElementById("hit-counter");
  const number = counter.textContent;
  counter.innerHTML = number.split("").map(digit => `<span>${digit}</span>`).join("");
});