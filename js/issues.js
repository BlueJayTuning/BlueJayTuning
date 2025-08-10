const owner = 'BlueJayTuning';
const repo = 'BlueJayTuning';

const issuesEl = document.getElementById("issues");
const counterEl = document.getElementById("counter");
const searchEl = document.getElementById("search");
const labelEl = document.getElementById("labelFilter");
const stateEl = document.getElementById("stateFilter");

// Basic cache & state
let allIssues = [];
const commentsCache = new Map(); // issueNumber -> comments[]

async function fetchIssues(page = 1, acc = []) {
    const url = `https://api.github.com/repos/${owner}/${repo}/issues?state=all&per_page=100&page=${page}`;
    const res = await fetch(url, { headers: { "Accept": "application/vnd.github+json" } });
    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
    const chunk = await res.json();
    const onlyIssues = chunk.filter(item => !item.pull_request);
    acc.push(...onlyIssues);
    if (chunk.length === 100) return fetchIssues(page + 1, acc);
    return acc;
}

// NEW: fetch comments for one issue (cached), with pagination
async function fetchIssueComments(issueNumber, page = 1, acc = []) {
    if (commentsCache.has(issueNumber)) return commentsCache.get(issueNumber);

    const url = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments?per_page=100&page=${page}`;
    const res = await fetch(url, { headers: { "Accept": "application/vnd.github+json" } });
    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
    const chunk = await res.json();
    acc.push(...chunk);
    if (chunk.length === 100) return fetchIssueComments(issueNumber, page + 1, acc);

    commentsCache.set(issueNumber, acc);
    return acc;
}

function relDate(iso) {
    const d = new Date(iso);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return "just now";
    const units = [
        ["year", 365 * 24 * 3600],
        ["month", 30 * 24 * 3600],
        ["day", 24 * 3600],
        ["hour", 3600],
        ["minute", 60]
    ];
    for (const [u, s] of units) {
        const v = Math.floor(diff / s);
        if (v >= 1) return `${v} ${u}${v > 1 ? "s" : ""} ago`;
    }
    return "just now";
}

function uniqueLabels(issues) {
    const set = new Set();
    issues.forEach(i => (i.labels || []).forEach(l => set.add(typeof l === "string" ? l : l.name)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
}

// Minimal, safe renderer with <img> support
function renderMarkdownMinimal(md) {
    if (!md) return "";
    let s = md;

    // Allow/sanitize raw <img> tags from GitHub HTML
    const placeholders = [];
    s = s.replace(/<img\s+[^>]*>/gi, (tag) => {
        const srcMatch = tag.match(/src\s*=\s*["'](https?:\/\/[^"']+)["']/i);
        if (!srcMatch) return "";
        const altMatch = tag.match(/alt\s*=\s*["']([^"']*)["']/i);
        const alt = altMatch ? altMatch[1] : "";
        const safe = `<img src="${srcMatch[1]}" alt="${alt}" loading="lazy">`;
        placeholders.push(safe);
        return `__HTML_PLACEHOLDER_${placeholders.length - 1}__`;
    });

    // Escape everything else
    s = s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

    // Markdown images
    s = s.replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g,
        (_m, alt, url) => `<img src="${url}" alt="${alt || ""}" loading="lazy">`);

    // Markdown links
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
        (_m, text, url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`);

    // Bare image URLs
    s = s.replace(/\b(https?:\/\/[^\s]+?\.(?:png|jpe?g|gif|webp))\b/gi,
        (_m, url) => `<img src="${url}" alt="" loading="lazy">`);

    // Bare URLs → links
    s = s.replace(/\b(https?:\/\/[^\s<]+)\b/g,
        (_m, url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);

    // Newlines
    s = s.replace(/\n/g, "<br>");

    // Restore sanitized imgs
    s = s.replace(/__HTML_PLACEHOLDER_(\d+)__/g, (_m, i) => placeholders[Number(i)] || "");
    return s;
}

// NEW: render comments list HTML
function renderCommentsHTML(comments) {
    if (!comments || comments.length === 0) {
        return `<div class="no-comments">No comments yet.</div>`;
    }
    return comments.map(c => {
        const author = c.user?.login ?? "someone";
        const avatar = c.user?.avatar_url ?? "";
        const when = relDate(c.created_at);
        const body = renderMarkdownMinimal(c.body || "");
        return `
          <div class="comment">
            <div class="comment-meta">
              ${avatar ? `<img class="avatar" src="${avatar}" alt="${author}">` : ""}
              <span class="author">${author}</span>
              <span class="dot">•</span>
              <span class="time">${when}</span>
            </div>
            <div class="comment-body">${body}</div>
          </div>
        `;
    }).join("");
}

function render(issues) {
    issuesEl.innerHTML = "";
    counterEl.textContent = `${issues.length} issue${issues.length !== 1 ? "s" : ""}`;

    if (issues.length === 0) {
        const p = document.createElement("p");
        p.className = "empty";
        p.textContent = "No issues match your filters.";
        issuesEl.appendChild(p);
        return;
    }

    for (const issue of issues) {
        const details = document.createElement("details");
        const summary = document.createElement("summary");

        const stateChip = document.createElement("span");
        stateChip.className = `state ${issue.state}`;
        stateChip.textContent = issue.state;

        const numSpan = document.createElement("span");
        numSpan.className = "num";
        numSpan.textContent = `#${issue.number}`;

        const titleSpan = document.createElement("span");
        titleSpan.textContent = issue.title;

        const labelsWrap = document.createElement("span");
        labelsWrap.className = "labels";
        (issue.labels || []).forEach(l => {
            const name = typeof l === "string" ? l : l.name;
            const chip = document.createElement("span");
            chip.className = "label";
            chip.textContent = name;
            labelsWrap.appendChild(chip);
        });

        const meta = document.createElement("span");
        meta.className = "meta";
        meta.textContent = `opened ${relDate(issue.created_at)} by ${issue.user?.login ?? "someone"}`;

        summary.appendChild(stateChip);
        summary.appendChild(numSpan);
        summary.appendChild(titleSpan);
        if (labelsWrap.childNodes.length) summary.appendChild(labelsWrap);
        summary.appendChild(meta);

        const body = document.createElement("div");
        body.className = "body";
        body.innerHTML = renderMarkdownMinimal(issue.body || "(no description)");

        // NEW: comments container (lazy)
        const commentsWrap = document.createElement("div");
        commentsWrap.className = "comments";
        commentsWrap.innerHTML = "";               // empty until opened
        commentsWrap.dataset.loaded = "0";         // flag

        details.appendChild(summary);
        details.appendChild(body);
        details.appendChild(commentsWrap);
        issuesEl.appendChild(details);

        // Lazy-load comments on first open
        details.addEventListener("toggle", async () => {
            if (!details.open) return;
            if (commentsWrap.dataset.loaded === "1") return;
            commentsWrap.dataset.loaded = "1";
            commentsWrap.innerHTML = `<div class="comments-loading">Loading comments…</div>`;
            try {
                const comments = await fetchIssueComments(issue.number);
                commentsWrap.innerHTML = renderCommentsHTML(comments);
            } catch (err) {
                commentsWrap.innerHTML = `<div class="comments-error">Failed to load comments.</div>`;
                console.error(err);
            }
        }, { once: false });
    }
}

function applyFilters() {
    const q = searchEl.value.trim().toLowerCase();
    const label = labelEl.value;
    const state = stateEl.value; // "open" | "closed" | "all"

    const filtered = allIssues.filter(i => {
        const matchesTitle = !q || i.title.toLowerCase().includes(q);
        const matchesLabel = !label || (i.labels || []).some(l => (typeof l === "string" ? l : l.name) === label);
        const matchesState = state === "all" || i.state === state;
        return matchesTitle && matchesLabel && matchesState;
    });
    render(filtered);
}

// Init
(async () => {
    try {
        allIssues = await fetchIssues();

        // populate label dropdown
        for (const name of uniqueLabels(allIssues)) {
            const opt = document.createElement("option");
            opt.value = name;
            opt.textContent = name;
            labelEl.appendChild(opt);
        }

        // defaults
        stateEl.value = "open"; // default to Open
        if ([...labelEl.options].some(opt => opt.value === "bug")) {
            labelEl.value = "bug"; // default to "bug" when available
        }

        applyFilters();
    } catch (e) {
        counterEl.textContent = "Failed to load issues";
        issuesEl.innerHTML = `<p class="empty">${e.message}</p>`;
        console.error(e);
    }
})();

searchEl.addEventListener("input", applyFilters);
labelEl.addEventListener("change", applyFilters);
stateEl.addEventListener("change", applyFilters);
