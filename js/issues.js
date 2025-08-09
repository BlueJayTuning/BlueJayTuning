const owner = 'BlueJayTuning';
const repo = 'BlueJayTuning';

const issuesEl = document.getElementById("issues");
const counterEl = document.getElementById("counter");
const searchEl = document.getElementById("search");
const labelEl = document.getElementById("labelFilter");

// Basic cache & state
let allIssues = [];

// Fetch open issues (skip PRs) — unauthenticated limit is 60 req/hr
async function fetchIssues(page = 1, acc = []) {
    const url = `https://api.github.com/repos/${owner}/${repo}/issues?state=open&per_page=100&page=${page}`;
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
        const titleSpan = document.createElement("span");
        titleSpan.textContent = issue.title;

        const numSpan = document.createElement("span");
        numSpan.className = "num";
        numSpan.textContent = `#${issue.number}`;

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

        summary.appendChild(numSpan);
        summary.appendChild(titleSpan);
        if (labelsWrap.childNodes.length) summary.appendChild(labelsWrap);
        summary.appendChild(meta);

        const body = document.createElement("div");
        body.className = "body";
        body.textContent = issue.body || "(no description)";

        details.appendChild(summary);
        details.appendChild(body);
        issuesEl.appendChild(details);
    }
}

function applyFilters() {
    const q = searchEl.value.trim().toLowerCase();
    const label = labelEl.value;
    const filtered = allIssues.filter(i => {
        const matchesTitle = !q || i.title.toLowerCase().includes(q);
        const matchesLabel = !label || (i.labels || []).some(l => (typeof l === "string" ? l : l.name) === label);
        return matchesTitle && matchesLabel;
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

        // set default label to "bug" if available
        if ([...labelEl.options].some(opt => opt.value === "bug")) {
            labelEl.value = "bug";
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