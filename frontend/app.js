const backendUrl = "http://localhost:8080";

// Elements
const loginBtn = document.getElementById("login-btn");
const userInfoDiv = document.getElementById("user-info");
const jobListDiv = document.getElementById("job-list");

// 1️⃣ Google login redirect
loginBtn.addEventListener("click", () => {
  window.location.href = `${backendUrl}/oauth2/authorization/google`;
});

// 2️⃣ Fetch logged-in user info
async function fetchUser() {
  const res = await fetch(`${backendUrl}/api/jobs`, {
    credentials: "include",
  });
  const data = await res.json();

  if (data.authenticated) {
    userInfoDiv.innerHTML = `
      <img src="${data.picture}" width="40" style="border-radius:50%;margin-right:10px">
      <span>Welcome, ${data.name}</span>
    `;
    loginBtn.style.display = "none";
  } 
}

// 3️⃣ Fetch jobs
async function fetchJobs() {
  const res = await fetch(`${backendUrl}/api/jobs`);
  const jobs = await res.json();

  jobListDiv.innerHTML = jobs.map(job => `
    <div class="job-card">
      <h3>${job.title}</h3>
      <p>${job.description}</p>
      <p><b>${job.company}</b> — ${job.location}</p>
      <button class="apply-btn">Apply</button>
    </div>
  `).join("");
}

// 4️⃣ Initialize
fetchUser();
fetchJobs();
