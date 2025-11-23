// Trailing Cursor
import { trailingCursor } from "./assets/cursor.js";

new trailingCursor({
});

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
  const entriesList = document.querySelector(".guestbook tbody");
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
  data.forEach((entry) => {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    const name = document.createElement("span");
    const timestamp = document.createElement("span");
    const br = document.createElement("br");
    const message = document.createElement("span");
    name.className = "name";
    timestamp.className = "timestamp";
    message.className = "message";

    name.textContent = entry.name;

    const date = new Date(entry.created_at);
    const options = {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    };
    timestamp.textContent = date.toLocaleString('en-GB', options);

    message.textContent = entry.message;

    td.appendChild(name);
    td.appendChild(timestamp);
    td.appendChild(br);
    td.appendChild(message);

    tr.appendChild(td);
    entriesList.appendChild(tr);
  });

  // Pagination
  const guestbook = document.querySelector('.guestbook'); 
  const itemsPerPage = 7;
  let currentPage = 0;
  const items = Array.from(guestbook.getElementsByTagName('tr')).slice(1);

  function showPage(page) {
    const startIndex = page * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    items.forEach((item, index) => {
      item.classList.toggle('hidden', index < startIndex || index >= endIndex);
    });
    updateActiveButtonStates();
  }

  function createPageButtons() {
    const totalPages = Math.ceil(items.length / itemsPerPage);
    const paginationContainer = document.createElement('div');
    const paginationDiv = document.body.appendChild(paginationContainer);
    paginationContainer.classList.add('pagination');

    for (let i = 0; i < totalPages; i++) {
      const pageButton = document.createElement('button');
      pageButton.textContent = i + 1;
      pageButton.addEventListener('click', () => {
        currentPage = i;
        showPage(currentPage);
        updateActiveButtonStates();
      });

        guestbook.appendChild(paginationContainer);
        paginationDiv.appendChild(pageButton);
      }
  }

  function updateActiveButtonStates() {
    const pageButtons = document.querySelectorAll('.pagination button');
    pageButtons.forEach((button, index) => {
      if (index === currentPage) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
  }
  createPageButtons();
  showPage(currentPage);
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

// Snake game
(function() {
    const canvas = document.getElementById("snake-canvas");
    const ctx = canvas.getContext("2d");
    const scoreEl = document.getElementById("snake-score");
    const grid = 20;
    let count = 0;
    let score = 0;
    
    let snake = { x: 200, y: 200 };
    let trail = [];
    let tail = 5;
    let dx = grid;
    let dy = 0;
    
    let food = randomFood();
    let gameRunning = true;

    function randomFood() {
        return {
            x: Math.floor(Math.random() * (canvas.width / grid)) * grid,
            y: Math.floor(Math.random() * (canvas.height / grid)) * grid
        };
    }

    function loop() {
        if (!gameRunning) {
            requestAnimationFrame(loop);
            return;
        }

        requestAnimationFrame(loop);
        if (++count < 6) return;
        count = 0;

        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        snake.x += dx;
        snake.y += dy;

        if (snake.x >= canvas.width) snake.x = 0;
        if (snake.x < 0) snake.x = canvas.width - grid;
        if (snake.y >= canvas.height) snake.y = 0;
        if (snake.y < 0) snake.y = canvas.height - grid;

        trail.push({x: snake.x, y: snake.y});
        while (trail.length > tail) trail.shift();

        for (let i = 0; i < trail.length - 1; i++) {
            if (trail[i].x === snake.x && trail[i].y === snake.y) {
                tail = 5;
                score = 0;
                scoreEl.textContent = "Score: 0";
            }
        }

        ctx.fillStyle = "#0f0";
        for (let i = 0; i < trail.length; i++) {
            ctx.fillRect(trail[i].x + 1, trail[i].y + 1, grid - 2, grid - 2);
        }

        ctx.fillStyle = "#f00";
        ctx.fillRect(food.x + 1, food.y + 1, grid - 2, grid - 2);

        if (snake.x === food.x && snake.y === food.y) {
            tail++;
            score += 10;
            scoreEl.textContent = "Score: " + score;
            food = randomFood();
        }
    }

    const handleKeyDown = (e) => {
        if (!gameRunning) return;

        const key = e.keyCode;

        if ([37,38,39,40,65,87,83,68].includes(key)) {
            e.preventDefault();
        }

        if ((key === 37 || key === 65) && dx === 0) { dx = -grid; dy = 0; } // Left / A
        if ((key === 38 || key === 87) && dy === 0) { dx = 0; dy = -grid; } // Up / W
        if ((key === 39 || key === 68) && dx === 0) { dx = grid; dy = 0; }  // Right / D
        if ((key === 40 || key === 83) && dy === 0) { dx = 0; dy = grid; }  // Down / S
    };

    document.addEventListener("keydown", handleKeyDown);

    const guestbookInputs = document.querySelectorAll('#name, #message');
    guestbookInputs.forEach(input => {
        input.addEventListener('focus', () => {
            gameRunning = false;
        });

        input.addEventListener('blur', () => {
            gameRunning = true;
        });
    });

    canvas.setAttribute('tabindex', '0');

    let tx = 0, ty = 0;
    canvas.addEventListener("touchstart", e => {
        if (!gameRunning) return;
        tx = e.touches[0].screenX;
        ty = e.touches[0].screenY;
        e.preventDefault();
    }, {passive: false});

    canvas.addEventListener("touchend", e => {
        if (!gameRunning) return;
        const ex = e.changedTouches[0].screenX;
        const ey = e.changedTouches[0].screenY;
        const diffX = tx - ex;
        const diffY = ty - ey;

        if (Math.abs(diffX) > Math.abs(diffY)) {
            if (diffX > 0 && dx === 0) { dx = -grid; dy = 0; }
            if (diffX < 0 && dx === 0) { dx = grid; dy = 0; }
        } else {
            if (diffY > 0 && dy === 0) { dx = 0; dy = -grid; }
            if (diffY < 0 && dy === 0) { dx = 0; dy = grid; }
        }
    });

    requestAnimationFrame(loop);

    canvas.addEventListener('click', () => {
        gameRunning = true;
        canvas.focus();
    });

})();