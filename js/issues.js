const owner = 'BlueJayTuning';
const repo = 'BlueJayTuning';

const issuesEl = document.getElementById("issues");
const counterEl = document.getElementById("counter");
const searchEl = document.getElementById("search");
const labelEl = document.getElementById("labelFilter");
const stateEl = document.getElementById("stateFilter");

// Basic cache & state
let allIssues = [];

// Fetch issues (skip PRs) — unauthenticated limit is 60 req/hr
// pull all states once, we’ll filter client-side
async function fetchIssues(page = 1, acc = []) {
    const url = `https://api.github.com/repos/${owner}/${repo}/issues?state=all&per_page=100&page=${page}`;
    const res = await fetch(url, { headers: { "Accept": "application/vnd.github+json" } });
    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
    const chunk = await res.json();
    const onlyIssues = chunk.filter(item => !item.pull_request);
    acc.push(...onlyIssues);
    // naive pagination: keep going while we still get 100 back
    if (chunk.length === 100) return fetchIssues(page + 1, acc);
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

function renderMarkdownMinimal(md) {
    if (!md) return "";
    let s = md;

    // 0) Allow/sanitize raw HTML <img ...> that GitHub puts in issue bodies
    const placeholders = [];
    s = s.replace(/<img\s+[^>]*>/gi, (tag) => {
        const srcMatch = tag.match(/src\s*=\s*["'](https?:\/\/[^"']+)["']/i);
        if (!srcMatch) return ""; // drop unsafe/unknown
        const altMatch = tag.match(/alt\s*=\s*["']([^"']*)["']/i);
        const alt = altMatch ? altMatch[1] : "";
        const safe = `<img src="${srcMatch[1]}" alt="${alt}" loading="lazy">`;
        placeholders.push(safe);
        return `__HTML_PLACEHOLDER_${placeholders.length - 1}__`;
    });

    // 1) escape the rest
    s = s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

    // 2) images: ![alt](url)
    s = s.replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g,
        (_m, alt, url) => `<img src="${url}" alt="${alt || ""}" loading="lazy">`);

    // 3) links: [text](url)
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
        (_m, text, url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`);

    // 4) bare image URLs (with common extensions)
    s = s.replace(/\b(https?:\/\/[^\s]+?\.(?:png|jpe?g|gif|webp))\b/gi,
        (_m, url) => `<img src="${url}" alt="" loading="lazy">`);

    // 5) other bare URLs → links
    s = s.replace(/\b(https?:\/\/[^\s<]+)\b/g,
        (_m, url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);

    // 6) line breaks
    s = s.replace(/\n/g, "<br>");

    // 7) restore sanitized <img> tags
    s = s.replace(/__HTML_PLACEHOLDER_(\d+)__/g, (_m, i) => placeholders[Number(i)] || "");

    return s;
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

        // Order: state pill, number, title, labels, meta
        summary.appendChild(stateChip);
        summary.appendChild(numSpan);
        summary.appendChild(titleSpan);
        if (labelsWrap.childNodes.length) summary.appendChild(labelsWrap);
        summary.appendChild(meta);

        const body = document.createElement("div");
        body.className = "body";
        body.innerHTML = renderMarkdownMinimal(issue.body || "(no description)");

        details.appendChild(summary);
        details.appendChild(body);
        issuesEl.appendChild(details);
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
